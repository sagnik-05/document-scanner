// controllers/admin.controller.js
const { db } = require('../database/init');

class AdminController {
    static async getAllUsers(req, res) {
        try {
            db.all(
                `SELECT 
                    id,
                    username,
                    role,
                    credits,
                    last_reset,
                    (SELECT COUNT(*) FROM scans WHERE user_id = users.id) as scan_count
                FROM users
                WHERE role != 'admin'`,
                [],
                (err, users) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }
                    res.json({ users });
                }
            );
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getAnalytics(req, res) {
        try {
            const analytics = {};

            // Get total users
            const userCount = await new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM users WHERE role != "admin"', [], (err, row) => {
                    if (err) reject(err);
                    resolve(row.count);
                });
            });

            // Get total scans today
            const todayScans = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT COUNT(*) as count FROM scans WHERE DATE(scan_date) = DATE("now")',
                    [],
                    (err, row) => {
                        if (err) reject(err);
                        resolve(row.count);
                    }
                );
            });

            // Get top users by scan count
            const topUsers = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT 
                        users.username,
                        COUNT(scans.id) as scan_count
                    FROM users
                    LEFT JOIN scans ON users.id = scans.user_id
                    GROUP BY users.id
                    ORDER BY scan_count DESC
                    LIMIT 5`,
                    [],
                    (err, rows) => {
                        if (err) reject(err);
                        resolve(rows);
                    }
                );
            });

            // Get pending credit requests
            const pendingRequests = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT COUNT(*) as count FROM credit_requests WHERE status = "pending"',
                    [],
                    (err, row) => {
                        if (err) reject(err);
                        resolve(row.count);
                    }
                );
            });

            res.json({
                analytics: {
                    totalUsers: userCount,
                    scansToday: todayScans,
                    topUsers: topUsers,
                    pendingCreditRequests: pendingRequests
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async adjustCredits(req, res) {
        try {
            const { userId } = req.params;
            const { credits, reason } = req.body;

            if (!credits || isNaN(credits)) {
                return res.status(400).json({ error: 'Invalid credit amount' });
            }

            db.run(
                'UPDATE users SET credits = credits + ? WHERE id = ?',
                [credits, userId],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }
                    if (this.changes === 0) {
                        return res.status(404).json({ error: 'User not found' });
                    }

                    // Log credit adjustment
                    db.run(
                        'INSERT INTO credit_adjustments (user_id, amount, reason, admin_id) VALUES (?, ?, ?, ?)',
                        [userId, credits, reason, req.userData.userId],
                        (err) => {
                            if (err) {
                                console.error('Error logging credit adjustment:', err);
                            }
                        }
                    );

                    res.json({ message: 'Credits adjusted successfully' });
                }
            );
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getPendingCreditRequests(req, res) {
        try {
            db.all(
                `SELECT 
                    cr.id,
                    cr.user_id,
                    u.username,
                    cr.amount,
                    cr.request_date,
                    cr.status
                FROM credit_requests cr
                JOIN users u ON cr.user_id = u.id
                WHERE cr.status = 'pending'
                ORDER BY cr.request_date ASC`,
                [],
                (err, requests) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }
                    res.json({ requests });
                }
            );
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async handleCreditRequest(req, res) {
        try {
            const { requestId } = req.params;
            const { status, reason } = req.body;

            if (!['approved', 'rejected'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            db.get(
                'SELECT * FROM credit_requests WHERE id = ?',
                [requestId],
                (err, request) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }
                    if (!request) {
                        return res.status(404).json({ error: 'Request not found' });
                    }

                    if (status === 'approved') {
                        // Update user credits and request status
                        db.run(
                            'BEGIN TRANSACTION',
                            [],
                            (err) => {
                                if (err) {
                                    return res.status(500).json({ error: 'Transaction error' });
                                }

                                db.run(
                                    'UPDATE users SET credits = credits + ? WHERE id = ?',
                                    [request.amount, request.user_id],
                                    (err) => {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            return res.status(500).json({ error: 'Credit update error' });
                                        }

                                        db.run(
                                            'UPDATE credit_requests SET status = ?, handled_by = ?, handled_at = DATETIME("now") WHERE id = ?',
                                            [status, req.userData.userId, requestId],
                                            (err) => {
                                                if (err) {
                                                    db.run('ROLLBACK');
                                                    return res.status(500).json({ error: 'Status update error' });
                                                }

                                                db.run('COMMIT');
                                                res.json({ message: 'Credit request approved successfully' });
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    } else {
                        // Just update the request status
                        db.run(
                            'UPDATE credit_requests SET status = ?, handled_by = ?, handled_at = DATETIME("now") WHERE id = ?',
                            [status, req.userData.userId, requestId],
                            (err) => {
                                if (err) {
                                    return res.status(500).json({ error: 'Status update error' });
                                }
                                res.json({ message: 'Credit request rejected successfully' });
                            }
                        );
                    }
                }
            );
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = AdminController;