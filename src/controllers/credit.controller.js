// controllers/credit.controller.js
const { db } = require('../database/init');

class CreditController {
    // Get user's current credits
    static async getCredits(req, res) {
        try {
            const userId = req.userData.userId;
            
            db.get(
                `SELECT credits, last_reset 
                FROM users 
                WHERE id = ?`,
                [userId],
                (err, user) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Error fetching credits' });
                    }

                    // Check if credits need to be reset
                    const lastReset = new Date(user.last_reset);
                    const now = new Date();
                    if (lastReset.getDate() !== now.getDate()) {
                        // Reset credits if it's a new day
                        db.run(
                            `UPDATE users 
                            SET credits = 20, 
                                last_reset = DATETIME('now', 'localtime') 
                            WHERE id = ?`,
                            [userId],
                            (err) => {
                                if (err) {
                                    console.error('Reset error:', err);
                                    return res.status(500).json({ error: 'Error resetting credits' });
                                }
                                res.json({ credits: 20 });
                            }
                        );
                    } else {
                        res.json({ credits: user.credits });
                    }
                }
            );
        } catch (error) {
            console.error('Credit check error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    // Request additional credits
    static async requestCredits(req, res) {
        try {
            const userId = req.userData.userId;
            const amount = req.body.amount || 20;

            // Check for pending requests
            db.get(
                `SELECT COUNT(*) as count 
                FROM credit_requests 
                WHERE user_id = ? AND status = 'pending'`,
                [userId],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }

                    if (result.count > 0) {
                        return res.status(400).json({ 
                            error: 'You already have a pending credit request' 
                        });
                    }

                    // Create new request
                    db.run(
                        `INSERT INTO credit_requests (
                            user_id, 
                            amount, 
                            status, 
                            request_date
                        ) VALUES (?, ?, 'pending', DATETIME('now', 'localtime'))`,
                        [userId, amount],
                        function(err) {
                            if (err) {
                                return res.status(500).json({ 
                                    error: 'Error creating credit request' 
                                });
                            }

                            res.json({ 
                                message: 'Credit request submitted successfully',
                                requestId: this.lastID
                            });
                        }
                    );
                }
            );
        } catch (error) {
            res.status(500).json({ error: 'Server error' });
        }
    }

    // Deduct credits for scan
    static async deductCredit(userId) {
        return new Promise((resolve, reject) => {
            db.get('SELECT credits FROM users WHERE id = ?', [userId], (err, user) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!user || user.credits <= 0) {
                    resolve(false);
                    return;
                }

                db.run(
                    'UPDATE users SET credits = credits - 1 WHERE id = ?',
                    [userId],
                    (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        // Log credit usage
                        db.run(
                            `INSERT INTO credit_usage (
                                user_id, 
                                action, 
                                amount
                            ) VALUES (?, 'scan', 1)`,
                            [userId],
                            (err) => {
                                if (err) console.error('Error logging credit usage:', err);
                            }
                        );

                        resolve(true);
                    }
                );
            });
        });
    }

    // Get credit request history
    static async getCreditHistory(req, res) {
        try {
            const userId = req.userData.userId;
            
            db.all(
                `SELECT 
                    cr.*,
                    u.username as handled_by_username
                FROM credit_requests cr
                LEFT JOIN users u ON cr.handled_by = u.id
                WHERE cr.user_id = ?
                ORDER BY cr.request_date DESC`,
                [userId],
                (err, requests) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }
                    res.json({ requests: requests || [] });
                }
            );
        } catch (error) {
            res.status(500).json({ error: 'Server error' });
        }
    }

    // Admin: Get all pending credit requests
    static async getPendingRequests(req, res) {
        try {
            if (req.userData.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            db.all(
                `SELECT 
                    cr.*,
                    u.username
                FROM credit_requests cr
                JOIN users u ON cr.user_id = u.id
                WHERE cr.status = 'pending'
                ORDER BY cr.request_date ASC`,
                [],
                (err, requests) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }
                    res.json({ requests: requests || [] });
                }
            );
        } catch (error) {
            res.status(500).json({ error: 'Server error' });
        }
    }

    // Admin: Handle credit request
    static async handleCreditRequest(req, res) {
        try {
            if (req.userData.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const { requestId } = req.params;
            const { status, amount } = req.body;

            if (!['approved', 'rejected'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            db.get(
                'SELECT * FROM credit_requests WHERE id = ?',
                [requestId],
                (err, request) => {
                    if (err || !request) {
                        return res.status(404).json({ error: 'Request not found' });
                    }

                    if (status === 'approved') {
                        // Update credits and request status
                        db.run('BEGIN TRANSACTION');
                        
                        db.run(
                            'UPDATE users SET credits = credits + ? WHERE id = ?',
                            [amount || request.amount, request.user_id]
                        );

                        db.run(
                            `UPDATE credit_requests 
                            SET status = ?, 
                                handled_by = ?,
                                handled_at = DATETIME('now', 'localtime')
                            WHERE id = ?`,
                            [status, req.userData.userId, requestId],
                            (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: 'Update failed' });
                                }
                                db.run('COMMIT');
                                res.json({ message: 'Credit request approved' });
                            }
                        );
                    } else {
                        // Just update request status
                        db.run(
                            `UPDATE credit_requests 
                            SET status = ?, 
                                handled_by = ?,
                                handled_at = DATETIME('now', 'localtime')
                            WHERE id = ?`,
                            [status, req.userData.userId, requestId],
                            (err) => {
                                if (err) {
                                    return res.status(500).json({ error: 'Update failed' });
                                }
                                res.json({ message: 'Credit request rejected' });
                            }
                        );
                    }
                }
            );
        } catch (error) {
            res.status(500).json({ error: 'Server error' });
        }
    }
}

module.exports = CreditController;