// models/credit.model.js
const { db } = require('../database/init');

class CreditModel {
  static async resetDailyCredits() {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE users 
         SET credits = 20, 
         last_reset = CURRENT_TIMESTAMP 
         WHERE DATE(last_reset) < DATE('now')`,
        (err) => {
          if (err) reject(err);
          resolve(true);
        }
      );
    });
  }

  static async deductCredit(userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET credits = credits - 1 WHERE id = ? AND credits > 0',
        [userId],
        function(err) {
          if (err) reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }
}

module.exports = CreditModel;