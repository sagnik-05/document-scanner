// controllers/scanner.controller.js
const { db } = require('../database/init');
const fs = require('fs').promises;
const path = require('path');

class ScannerController {
    static async scanDocument(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const userId = req.userData.userId;

            // Check if user has enough credits
            const user = await new Promise((resolve, reject) => {
                db.get('SELECT credits FROM users WHERE id = ?', [userId], (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
            });

            if (!user || user.credits <= 0) {
                return res.status(403).json({ error: 'Insufficient credits' });
            }

            // Read file content
            const content = await fs.readFile(req.file.path, 'utf8');

            // Store document in database
            const docResult = await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO documents (user_id, filename, content) VALUES (?, ?, ?)',
                    [userId, req.file.filename, content],
                    function(err) {
                        if (err) reject(err);
                        resolve(this.lastID);
                    }
                );
            });

            // Deduct credit
            await new Promise((resolve, reject) => {
                db.run(
                    'UPDATE users SET credits = credits - 1 WHERE id = ?',
                    [userId],
                    (err) => {
                        if (err) reject(err);
                        resolve();
                    }
                );
            });

            // Record scan in scans table
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO scans (user_id, document_id) VALUES (?, ?)',
                    [userId, docResult],
                    (err) => {
                        if (err) reject(err);
                        resolve();
                    }
                );
            });

            // Find matching documents
            const matches = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT id, filename, content 
                     FROM documents 
                     WHERE user_id = ? AND id != ?`,
                    [userId, docResult],
                    (err, rows) => {
                        if (err) reject(err);
                        resolve(rows);
                    }
                );
            });

            // Simple text similarity check
            const similarDocs = matches.map(doc => ({
                id: doc.id,
                filename: doc.filename,
                similarity: ScannerController.calculateSimilarity(content, doc.content)
            })).filter(doc => doc.similarity > 0.3) // 30% similarity threshold
              .sort((a, b) => b.similarity - a.similarity);

            res.json({
                message: 'Document scanned successfully',
                documentId: docResult,
                matches: similarDocs
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error processing document' });
        }
    }

    static calculateSimilarity(text1, text2) {
        // Simple word overlap similarity
        const words1 = new Set(text1.toLowerCase().split(/\W+/));
        const words2 = new Set(text2.toLowerCase().split(/\W+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }

    static async getMatches(req, res) {
        try {
            const { docId } = req.params;
            const userId = req.userData.userId;

            const document = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT * FROM documents WHERE id = ? AND user_id = ?',
                    [docId, userId],
                    (err, row) => {
                        if (err) reject(err);
                        resolve(row);
                    }
                );
            });

            if (!document) {
                return res.status(404).json({ error: 'Document not found' });
            }

            // Get matches (implement similar logic as in scanDocument)
            // ...

            res.json({ matches: [] }); // Implement matching logic
        } catch (error) {
            res.status(500).json({ error: 'Error fetching matches' });
        }
    }

    static async getScanHistory(req, res) {
        try {
            const userId = req.userData.userId;
            
            db.all(
                `SELECT s.scan_date, d.filename 
                 FROM scans s 
                 JOIN documents d ON s.document_id = d.id 
                 WHERE s.user_id = ? 
                 ORDER BY s.scan_date DESC`,
                [userId],
                (err, rows) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }
                    res.json({ history: rows });
                }
            );
        } catch (error) {
            res.status(500).json({ error: 'Error fetching scan history' });
        }
    }
}

module.exports = ScannerController;