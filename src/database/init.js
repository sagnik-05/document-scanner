const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'scanner.db'));

const initDatabase = () => {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      credits INTEGER DEFAULT 20,
      last_reset DATE DEFAULT CURRENT_TIMESTAMP
    )`);

    // Documents table
    db.run(`CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      filename TEXT NOT NULL,
      content TEXT,
      upload_date DATE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Credit requests table
    db.run(`CREATE TABLE IF NOT EXISTS credit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      amount INTEGER,
      status TEXT DEFAULT 'pending',
      request_date DATE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Scans table for analytics
    db.run(`CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      document_id INTEGER,
      scan_date DATE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(document_id) REFERENCES documents(id)
    )`);
  });
};

module.exports = { db, initDatabase };