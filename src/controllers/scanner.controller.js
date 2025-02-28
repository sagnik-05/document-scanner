// controllers/scanner.controller.js
const fs = require('fs').promises;
const path = require('path');
const { db } = require('../database/init');
const CreditManager = require('../utils/creditManager');

class ScannerController {
    static async scanDocument(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const userId = req.userData.userId;

            // Check credits
            const hasCredits = await CreditManager.deductCredit(userId);
            if (!hasCredits) {
                return res.status(403).json({ error: 'Insufficient credits' });
            }

            // Read file content
            const filePath = req.file.path;
            const content = await fs.readFile(filePath, 'utf8');

            // Store document
            const docId = await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO documents (user_id, filename, content) VALUES (?, ?, ?)',
                    [userId, req.file.filename, content],
                    function(err) {
                        if (err) reject(err);
                        resolve(this.lastID);
                    }
                );
            });

            // Find similar documents
            const matches = await ScannerController.findSimilarDocuments(content, userId, docId);

            // Record scan
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO scans (user_id, document_id) VALUES (?, ?)',
                    [userId, docId],
                    (err) => {
                        if (err) reject(err);
                        resolve();
                    }
                );
            });

            res.json({
                message: 'Document scanned successfully',
                documentId: docId,
                matches: matches
            });

        } catch (error) {
            console.error('Scan error:', error);
            res.status(500).json({ error: 'Error processing document' });
        }
    }

    static async findSimilarDocuments(content, userId, excludeDocId) {
        const words = content.toLowerCase().split(/\W+/);
        const wordSet = new Set(words);

        return new Promise((resolve, reject) => {
            db.all(
                `SELECT id, filename, content 
                 FROM documents 
                 WHERE user_id = ? AND id != ?`,
                [userId, excludeDocId],
                (err, documents) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const matches = documents.map(doc => {
                        const docWords = doc.content.toLowerCase().split(/\W+/);
                        const docWordSet = new Set(docWords);
                        const similarity = ScannerController.calculateSimilarity(wordSet, docWordSet);

                        return {
                            id: doc.id,
                            filename: doc.filename,
                            similarity: similarity
                        };
                    });

                    // Filter and sort matches
                    const significantMatches = matches
                        .filter(match => match.similarity > 0.3)
                        .sort((a, b) => b.similarity - a.similarity)
                        .slice(0, 5);

                    resolve(significantMatches);
                }
            );
        });
    }

    static calculateSimilarity(set1, set2) {
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }

    static async getDocumentHistory(req, res) {
        try {
            const userId = req.userData.userId;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            db.all(
                `SELECT 
                    d.id,
                    d.filename,
                    d.upload_date,
                    COUNT(s.id) as scan_count
                FROM documents d
                LEFT JOIN scans s ON d.id = s.document_id
                WHERE d.user_id = ?
                GROUP BY d.id
                ORDER BY d.upload_date DESC
                LIMIT ? OFFSET ?`,
                [userId, limit, offset],
                (err, documents) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }

                    res.json({
                        documents,
                        pagination: {
                            page,
                            limit,
                            hasMore: documents.length === limit
                        }
                    });
                }
            );
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = ScannerController;