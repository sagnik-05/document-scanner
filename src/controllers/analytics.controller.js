// controllers/analytics.controller.js
const { db } = require('../database/init');

class AnalyticsController {
    static async getUserStats(req, res) {
        try {
            const userId = req.userData.userId;

            // Get basic stats
            const stats = await new Promise((resolve, reject) => {
                db.get(`
                    SELECT 
                        (SELECT COUNT(*) FROM documents WHERE user_id = ?) as totalDocuments,
                        (SELECT COUNT(*) FROM scans WHERE user_id = ?) as totalScans,
                        (SELECT COUNT(DISTINCT DATE(scan_date)) FROM scans WHERE user_id = ?) as activeDays,
                        (SELECT COUNT(*) FROM credit_usage WHERE user_id = ?) as creditsUsed
                    FROM users WHERE id = ?
                `, [userId, userId, userId, userId, userId], (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
            });

            // Get activity for last 7 days
            const activity = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT 
                        DATE(scan_date) as date,
                        COUNT(*) as scans
                    FROM scans 
                    WHERE user_id = ? 
                    AND scan_date >= date('now', '-7 days')
                    GROUP BY DATE(scan_date)
                    ORDER BY date
                `, [userId], (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                });
            });

            // Get document types
            const documentTypes = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT 
                        CASE 
                            WHEN filename LIKE '%.pdf' THEN 'PDF'
                            WHEN filename LIKE '%.txt' THEN 'Text'
                            ELSE 'Other'
                        END as type,
                        COUNT(*) as count
                    FROM documents 
                    WHERE user_id = ?
                    GROUP BY type
                `, [userId], (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                });
            });

            // Get recent activity
            const recentActivity = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT 
                        s.scan_date as date,
                        'Scan' as action,
                        d.filename as document,
                        1 as credits
                    FROM scans s
                    JOIN documents d ON s.document_id = d.id
                    WHERE s.user_id = ?
                    ORDER BY s.scan_date DESC
                    LIMIT 10
                `, [userId], (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                });
            });

            res.json({
                stats,
                activity,
                documentTypes,
                recentActivity
            });

        } catch (error) {
            console.error('Analytics error:', error);
            res.status(500).json({ error: 'Error fetching analytics' });
        }
    }
}

module.exports = AnalyticsController;