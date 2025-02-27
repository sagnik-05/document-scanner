// controllers/user.controller.js
const UserModel = require('../models/user.model.js');
const CreditModel = require('../models/credit.model.js');
const { db } = require('../database/init.js');

class UserController {
    // Get user profile with credits and scan history
    static async getProfile(req, res) {
        try {
            const userId = req.userData.userId;

            db.get(
                `SELECT 
                    users.id,
                    users.username,
                    users.credits,
                    users.role,
                    users.last_reset
                FROM users 
                WHERE users.id = ?`,
                [userId],
                async (err, user) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }
                    if (!user) {
                        return res.status(404).json({ error: 'User not found' });
                    }

                    // Get scan history
                    db.all(
                        `SELECT 
                            scans.scan_date,
                            documents.filename,
                            documents.id as document_id
                        FROM scans
                        JOIN documents ON scans.document_id = documents.id
                        WHERE scans.user_id = ?
                        ORDER BY scans.scan_date DESC
                        LIMIT 10`,
                        [userId],
                        (err, scanHistory) => {
                            if (err) {
                                return res.status(500).json({ error: 'Error fetching scan history' });
                            }

                            res.json({
                                profile: {
                                    id: user.id,
                                    username: user.username,
                                    credits: user.credits,
                                    role: user.role,
                                    lastReset: user.last_reset
                                },
                                scanHistory: scanHistory || []
                            });
                        }
                    );
                }
            );
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get user's current credits
    static async getCredits(req, res) {
        try {
            const userId = req.userData.userId;

            db.get(
                'SELECT credits, last_reset FROM users WHERE id = ?',
                [userId],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }
                    if (!result) {
                        return res.status(404).json({ error: 'User not found' });
                    }

                    res.json({
                        credits: result.credits,
                        lastReset: result.last_reset
                    });
                }
            );
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Request additional credits
    static async requestCredits(req, res) {
        try {
            const userId = req.userData.userId;
            const { amount } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Invalid credit amount requested' });
            }

            db.run(
                `INSERT INTO credit_requests (user_id, amount, status)
                VALUES (?, ?, 'pending')`,
                [userId, amount],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Error creating credit request' });
                    }

                    res.json({
                        message: 'Credit request submitted successfully',
                        requestId: this.lastID
                    });
                }
            );
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get credit request history
    static async getCreditRequests(req, res) {
        try {
            const userId = req.userData.userId;

            db.all(
                `SELECT 
                    id,
                    amount,
                    status,
                    request_date
                FROM credit_requests
                WHERE user_id = ?
                ORDER BY request_date DESC`,
                [userId],
                (err, requests) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error fetching credit requests' });
                    }

                    res.json({ creditRequests: requests });
                }
            );
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Update user profile
    static async updateProfile(req, res) {
        try {
            const userId = req.userData.userId;
            const { currentPassword, newPassword } = req.body;

            // If updating password
            if (currentPassword && newPassword) {
                db.get(
                    'SELECT password FROM users WHERE id = ?',
                    [userId],
                    async (err, user) => {
                        if (err) {
                            return res.status(500).json({ error: 'Database error' });
                        }

                        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
                        if (!isValidPassword) {
                            return res.status(401).json({ error: 'Current password is incorrect' });
                        }

                        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
                        
                        db.run(
                            'UPDATE users SET password = ? WHERE id = ?',
                            [hashedNewPassword, userId],
                            (err) => {
                                if (err) {
                                    return res.status(500).json({ error: 'Error updating password' });
                                }
                                res.json({ message: 'Password updated successfully' });
                            }
                        );
                    }
                );
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get user's document history
    static async getDocumentHistory(req, res) {
        try {
            const userId = req.userData.userId;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            db.all(
                `SELECT 
                    documents.id,
                    documents.filename,
                    documents.upload_date,
                    COUNT(DISTINCT matches.id) as match_count
                FROM documents
                LEFT JOIN document_matches matches ON documents.id = matches.document_id
                WHERE documents.user_id = ?
                GROUP BY documents.id
                ORDER BY documents.upload_date DESC
                LIMIT ? OFFSET ?`,
                [userId, limit, offset],
                (err, documents) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error fetching document history' });
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

module.exports = UserController;