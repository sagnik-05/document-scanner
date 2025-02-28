// models/document.model.js
const { db } = require('../database/init');
const path = require('path');
const fs = require('fs').promises;

class DocumentModel {
    static async create(userId, file, content) {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO documents (
                    user_id, 
                    filename, 
                    original_name,
                    file_path,
                    file_size,
                    content,
                    mime_type,
                    upload_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, DATETIME('now'))`,
                [
                    userId,
                    file.filename,
                    file.originalname,
                    file.path,
                    file.size,
                    content,
                    file.mimetype
                ],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }

    static async findById(documentId, userId = null) {
        return new Promise((resolve, reject) => {
            const query = userId 
                ? 'SELECT * FROM documents WHERE id = ? AND user_id = ?'
                : 'SELECT * FROM documents WHERE id = ?';
            const params = userId ? [documentId, userId] : [documentId];

            db.get(query, params, (err, document) => {
                if (err) reject(err);
                resolve(document);
            });
        });
    }

    static async getUserDocuments(userId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT 
                    d.*,
                    COUNT(DISTINCT m.id) as match_count,
                    COUNT(DISTINCT s.id) as scan_count
                FROM documents d
                LEFT JOIN document_matches m ON d.id = m.document_id
                LEFT JOIN scans s ON d.id = s.document_id
                WHERE d.user_id = ?
                GROUP BY d.id
                ORDER BY d.upload_date DESC
                LIMIT ? OFFSET ?`,
                [userId, limit, offset],
                (err, documents) => {
                    if (err) reject(err);
                    resolve(documents);
                }
            );
        });
    }

    static async deleteDocument(documentId, userId) {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT file_path FROM documents WHERE id = ? AND user_id = ?',
                [documentId, userId],
                async (err, document) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (!document) {
                        reject(new Error('Document not found'));
                        return;
                    }

                    try {
                        // Delete file from storage
                        await fs.unlink(document.file_path);

                        // Delete from database
                        db.run(
                            'DELETE FROM documents WHERE id = ? AND user_id = ?',
                            [documentId, userId],
                            (err) => {
                                if (err) reject(err);
                                resolve(true);
                            }
                        );
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    static async searchDocuments(userId, searchTerm) {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM documents 
                 WHERE user_id = ? 
                 AND (
                     filename LIKE ? 
                     OR original_name LIKE ? 
                     OR content LIKE ?
                 )
                 ORDER BY upload_date DESC`,
                [userId, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`],
                (err, documents) => {
                    if (err) reject(err);
                    resolve(documents);
                }
            );
        });
    }
}

module.exports = DocumentModel;