// src/utils/creditManager.js
const { db } = require('../database/init');

class CreditManager {
    static async resetDailyCredits() {
        try {
            // Reset credits to 20 for all users who haven't had a reset today
            return new Promise((resolve, reject) => {
                db.run(
                    `UPDATE users 
                     SET credits = 20, 
                         last_reset = DATETIME('now') 
                     WHERE DATE(last_reset) < DATE('now')`,
                    [],
                    (err) => {
                        if (err) {
                            console.error('Error resetting daily credits:', err);
                            reject(err);
                        } else {
                            console.log('Daily credits reset successful');
                            resolve(true);
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Credit reset error:', error);
            throw error;
        }
    }

    static async deductCredit(userId) {
        try {
            return new Promise((resolve, reject) => {
                db.run(
                    'UPDATE users SET credits = credits - 1 WHERE id = ? AND credits > 0',
                    [userId],
                    function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(this.changes > 0);
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Credit deduction error:', error);
            throw error;
        }
    }

    static async getCurrentCredits(userId) {
        try {
            return new Promise((resolve, reject) => {
                db.get(
                    'SELECT credits FROM users WHERE id = ?',
                    [userId],
                    (err, row) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(row ? row.credits : 0);
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Error getting current credits:', error);
            throw error;
        }
    }

    static async addCredits(userId, amount) {
        try {
            return new Promise((resolve, reject) => {
                db.run(
                    'UPDATE users SET credits = credits + ? WHERE id = ?',
                    [amount, userId],
                    function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(this.changes > 0);
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Error adding credits:', error);
            throw error;
        }
    }
}

module.exports = {
    resetDailyCredits: CreditManager.resetDailyCredits,
    deductCredit: CreditManager.deductCredit,
    getCurrentCredits: CreditManager.getCurrentCredits,
    addCredits: CreditManager.addCredits
};