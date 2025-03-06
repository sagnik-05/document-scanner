const jwt = require('jsonwebtoken');
const fs = require('fs');
const util = require('util');
const path = require('path');
const { db } = require('../database/init');
const CreditController = require('./credit.controller');
// Convert fs.readFile to promise-based
const readFileAsync = util.promisify(fs.readFile);

class DocumentController {
    static async getAllDocuments(req, res) {
                try {
                    const userId = req.userData.userId;
        
                    db.all(
                        `SELECT 
                            id, filename, upload_date, 
                            (SELECT COUNT(*) FROM document_matches WHERE document_id = documents.id) as match_count
                        FROM documents 
                        WHERE user_id = ?
                        ORDER BY upload_date DESC`,
                        [userId],
                        (err, documents) => {
                            if (err) {
                                console.error('Database error:', err);
                                return res.status(500).json({ error: 'Database error' });
                            }
                            res.json({ documents: documents || [] });
                        }
                    );
                } catch (error) {
                    console.error('Error getting documents:', error);
                    res.status(500).json({ error: 'Server error' });
                }
            }
            static async getDocument(req, res) {
                        try {
                            const { id } = req.params;
                            const userId = req.userData.userId;
                    
                            db.get(
                                `SELECT id, filename, content, upload_date 
                                 FROM documents 
                                 WHERE id = ? AND user_id = ?`,
                                [id, userId],
                                (err, document) => {
                                    if (err) {
                                        console.error('Database error:', err);
                                        return res.status(500).json({ error: 'Database error' });
                                    }
                                    if (!document) {
                                        return res.status(404).json({ error: 'Document not found' });
                                    }
                    
                                    res.json({ document });
                                }
                            );
                        } catch (error) {
                            console.error('Error getting document:', error);
                            res.status(500).json({ error: 'Server error' });
                        }
                    }
                    static async uploadDocument(req, res) {
                        try {
                            if (!req.file) {
                                return res.status(400).json({ error: 'No file uploaded' });
                            }
                
                            const userId = req.userData.userId;
                            const filename = req.file.filename;
                            const originalName = req.file.originalname;
                            const filePath = req.file.path;
                
                            console.log('Upload details:', {
                                userId,
                                filename,
                                originalName,
                                filePath,
                                mimetype: req.file.mimetype
                            });
                
                            // Check and deduct credits before processing upload
                            const hasCredits = await CreditController.deductCredit(userId);
                            if (!hasCredits) {
                                // Delete the uploaded file if credit check fails
                                if (req.file && req.file.path) {
                                    fs.unlink(req.file.path, (err) => {
                                        if (err) console.error('Error deleting file:', err);
                                    });
                                }
                                return res.status(403).json({ 
                                    error: 'Insufficient credits. Please request more credits.' 
                                });
                            }
                
                            // Begin transaction
                            db.serialize(() => {
                                db.run('BEGIN TRANSACTION');
                
                                // Insert document
                                db.run(
                                    `INSERT INTO documents (
                                        user_id, 
                                        filename,
                                        original_name,
                                        upload_date
                                    ) VALUES (?, ?, ?, DATETIME('now'))`,
                                    [userId, filename, originalName],
                                    function(err) {
                                        if (err) {
                                            console.error('Upload DB error:', err);
                                            db.run('ROLLBACK');
                                            // Clean up file on database error
                                            fs.unlink(req.file.path, () => {});
                                            return res.status(500).json({ error: 'Upload failed' });
                                        }
                
                                        const documentId = this.lastID;
                
                                        // Record scan in scans table
                                        db.run(
                                            `INSERT INTO scans (
                                                user_id,
                                                document_id,
                                                scan_date
                                            ) VALUES (?, ?, DATETIME('now'))`,
                                            [userId, documentId],
                                            (err) => {
                                                if (err) {
                                                    console.error('Scan record error:', err);
                                                    db.run('ROLLBACK');
                                                    // Clean up file on database error
                                                    fs.unlink(req.file.path, () => {});
                                                    return res.status(500).json({ error: 'Upload failed' });
                                                }
                
                                                // Commit transaction if everything succeeded
                                                db.run('COMMIT');
                
                                                // Get updated credit count
                                                db.get(
                                                    'SELECT credits FROM users WHERE id = ?',
                                                    [userId],
                                                    (err, user) => {
                                                        res.json({
                                                            message: 'Document uploaded successfully',
                                                            documentId: documentId,
                                                            filename: filename,
                                                            remainingCredits: user ? user.credits : 0
                                                        });
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
                            });
                
                        } catch (error) {
                            console.error('Upload error:', error);
                            // Clean up file on error
                            if (req.file && req.file.path) {
                                fs.unlink(req.file.path, (err) => {
                                    if (err) console.error('Error deleting file after failed upload:', err);
                                });
                            }
                            res.status(500).json({ error: 'Upload failed' });
                        }
                    }

    static async viewDocument(req, res) {
        try {
            let token = req.query.token;
            
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            let userId;
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.userId;
            } catch (error) {
                return res.status(401).json({ error: 'Invalid token' });
            }

            db.get(
                'SELECT * FROM documents WHERE id = ? AND user_id = ?',
                [req.params.id, userId],
                async (err, document) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    
                    if (!document) {
                        return res.status(404).json({ error: 'Document not found' });
                    }

                    const filePath = path.join(
                        process.cwd(),
                        'storage',
                        'documents',
                        document.filename
                    );

                    if (!fs.existsSync(filePath)) {
                        return res.status(404).json({ error: 'File not found on disk' });
                    }

                    try {
                        if (document.filename.toLowerCase().endsWith('.pdf')) {
                            const stat = fs.statSync(filePath);
                            res.setHeader('Content-Type', 'application/pdf');
                            res.setHeader('Content-Length', stat.size);
                            res.setHeader('Content-Disposition', `inline; filename="${document.filename}"`);

                            const stream = fs.createReadStream(filePath);
                            stream.on('error', (error) => {
                                console.error('Stream error:', error);
                                res.status(500).json({ error: 'Error streaming file' });
                            });

                            stream.pipe(res);
                        } else {
                            // For text files
                            const content = await readFileAsync(filePath, 'utf8');
                            res.json({ document: { ...document, content } });
                        }
                    } catch (error) {
                        console.error('File reading error:', error);
                        res.status(500).json({ error: 'Error reading file' });
                    }
                }
            );
        } catch (error) {
            console.error('View document error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    static async deleteDocument(req, res) {
        try {
            const { id } = req.params;
            const userId = req.userData.userId;

            db.get(
                'SELECT filename FROM documents WHERE id = ? AND user_id = ?',
                [id, userId],
                (err, document) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }

                    if (!document) {
                        return res.status(404).json({ error: 'Document not found' });
                    }

                    const filePath = path.join(
                        process.cwd(),
                        'storage',
                        'documents',
                        document.filename
                    );

                    // Delete file if it exists
                    if (fs.existsSync(filePath)) {
                        fs.unlink(filePath, (err) => {
                            if (err) console.error('Error deleting file:', err);
                        });
                    }

                    // Delete from database
                    db.run(
                        'DELETE FROM documents WHERE id = ? AND user_id = ?',
                        [id, userId],
                        (err) => {
                            if (err) {
                                return res.status(500).json({ error: 'Delete failed' });
                            }
                            res.json({ message: 'Document deleted successfully' });
                        }
                    );
                }
            );
        } catch (error) {
            console.error('Delete error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
}

module.exports = DocumentController;