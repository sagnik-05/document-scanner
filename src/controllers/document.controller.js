// controllers/document.controller.js
const { db } = require('../database/init');
const fs = require('fs').promises;

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

    static async uploadDocument(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const userId = req.userData.userId;
            const content = await fs.readFile(req.file.path, 'utf8');

            db.run(
                `INSERT INTO documents (user_id, filename, content, upload_date)
                 VALUES (?, ?, ?, DATETIME('now'))`,
                [userId, req.file.originalname, content],
                function(err) {
                    if (err) {
                        console.error('Upload error:', err);
                        return res.status(500).json({ error: 'Upload failed' });
                    }

                    res.json({
                        message: 'Document uploaded successfully',
                        documentId: this.lastID
                    });
                }
            );
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ error: 'Upload failed' });
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
                async (err, document) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    if (!document) {
                        return res.status(404).json({ error: 'Document not found' });
                    }

                    // If document exists, send it back
                    res.json({
                        document: {
                            id: document.id,
                            filename: document.filename,
                            content: document.content,
                            uploadDate: document.upload_date
                        }
                    });
                }
            );
        } catch (error) {
            console.error('Error getting document:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    static async deleteDocument(req, res) {
        try {
            const { id } = req.params;
            const userId = req.userData.userId;

            // First get the document to ensure it exists
            db.get(
                'SELECT id, filename FROM documents WHERE id = ? AND user_id = ?',
                [id, userId],
                (err, document) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    if (!document) {
                        return res.status(404).json({ error: 'Document not found' });
                    }

                    // Delete from database
                    db.run(
                        'DELETE FROM documents WHERE id = ? AND user_id = ?',
                        [id, userId],
                        function(err) {
                            if (err) {
                                console.error('Delete error:', err);
                                return res.status(500).json({ error: 'Delete failed' });
                            }
                            res.json({ 
                                message: 'Document deleted successfully',
                                documentId: id
                            });
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