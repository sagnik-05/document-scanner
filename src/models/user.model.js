const { db } = require('../database/init');

class UserModel {
  static create(username, hashedPassword) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword],
        function(err) {
          if (err) reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  static findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });
  }

  static updateCredits(userId, credits) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET credits = ? WHERE id = ?',
        [credits, userId],
        (err) => {
          if (err) reject(err);
          resolve(true);
        }
      );
    });
  }
}

module.exports = UserModel;