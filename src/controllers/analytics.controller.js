// controllers/analytics.controller.js
const { db } = require('../database/init');

class AnalyticsController {
    // Get user's scanning statistics
    static async getUserStats(req, res) {
        try {
            const userId = req.userData.userId;
            
            const stats = await new Promise((resolve, reject) => {
                db.get(
                    `SELECT 
                        COUNT(s.id) as total_scans,
                        COUNT(DISTINCT DATE(s.scan_date)) as active_days,
                        (SELECT COUNT(*) FROM documents WHERE user_id = ?) as total_documents,
                        (SELECT COUNT(*) 
                         FROM scans 
                         WHERE user_id = ? 
                         AND DATE(scan_date) = DATE('now')) as today_scans
                     FROM scans s
                     WHERE s.user_id = ?`,
                    [userId, userId, userId],
                    (err, row) => {
                        if (err) reject(err);
                        resolve(row);
                    }
                );
            });

            res.json({ stats });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get system-wide statistics (admin only)
    static async getSystemStats(req, res) {
        try {
            if (req.userData.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const stats = await new Promise((resolve, reject) => {
                db.get(
                    `SELECT 
                        (SELECT COUNT(*) FROM users WHERE role != 'admin') as total_users,
                        (SELECT COUNT(*) FROM documents) as total_documents,
                        (SELECT COUNT(*) FROM scans) as total_scans,
                        (SELECT COUNT(*) 
                         FROM credit_requests 
                         WHERE status = 'pending') as pending_requests,
                        (SELECT COUNT(*) 
                         FROM scans 
                         WHERE DATE(scan_date) = DATE('now')) as today_scans
                     FROM users`,
                    [],
                    (err, row) => {
                        if (err) reject(err);
                        resolve(row);
                    }
                );
            });

            // Get top users
            const topUsers = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT 
                        u.username,
                        COUNT(s.id) as scan_count
                     FROM users u
                     LEFT JOIN scans s ON u.id = s.user_id
                     WHERE u.role != 'admin'
                     GROUP BY u.id
                     ORDER BY scan_count DESC
                     LIMIT 5`,
                    [],
                    (err, rows) => {
                        if (err) reject(err);
                        resolve(rows);
                    }
                );
            });

            res.json({ 
                systemStats: stats,
                topUsers: topUsers
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get document statistics
    static async getDocumentStats(req, res) {
        try {
            const userId = req.userData.userId;
            const isAdmin = req.userData.role === 'admin';

            const query = isAdmin 
                ? `SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN DATE(upload_date) = DATE('now') THEN 1 END) as today,
                    AVG(LENGTH(content)) as avg_length
                   FROM documents`
                : `SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN DATE(upload_date) = DATE('now') THEN 1 END) as today,
                    AVG(LENGTH(content)) as avg_length
                   FROM documents
                   WHERE user_id = ?`;

            const params = isAdmin ? [] : [userId];

            const stats = await new Promise((resolve, reject) => {
                db.get(query, params, (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
            });

            res.json({ stats });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = AnalyticsController;