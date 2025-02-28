// controllers/credit.controller.js
const { db } = require('../database/init');

class CreditController {
    // Get user's credit balance and history
    static async getCreditBalance(userId) {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT credits, last_reset FROM users WHERE id = ?',
                [userId],
                (err, result) => {
                    if (err) reject(err);
                    resolve(result);
                }
            );
        });
    }

    // Request additional credits
    static async requestCredits(req, res) {
        try {
            const userId = req.userData.userId;
            const { amount, reason } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Invalid credit amount' });
            }

            const result = await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO credit_requests (user_id, amount, reason, status) 
                     VALUES (?, ?, ?, 'pending')`,
                    [userId, amount, reason],
                    function(err) {
                        if (err) reject(err);
                        resolve(this.lastID);
                    }
                );
            });

            res.json({
                message: 'Credit request submitted successfully',
                requestId: result
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get credit request history
    static async getCreditHistory(req, res) {
        try {
            const userId = req.userData.userId;
            
            const history = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT cr.*, u.username as handled_by_username
                     FROM credit_requests cr
                     LEFT JOIN users u ON cr.handled_by = u.id
                     WHERE cr.user_id = ?
                     ORDER BY cr.request_date DESC`,
                    [userId],
                    (err, rows) => {
                        if (err) reject(err);
                        resolve(rows);
                    }
                );
            });

            res.json({ history });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Track credit usage
    static async trackCreditUsage(userId, action, amount) {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO credit_usage (user_id, action, amount, usage_date)
                 VALUES (?, ?, ?, DATETIME('now'))`,
                [userId, action, amount],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }
}

module.exports = CreditController;