// controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/init');  // Add this line to import database

class AuthController {
    static async login(req, res) {
        try {
            const { username, password } = req.body;
            
            db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (!user) {
                    return res.status(401).json({ error: 'Authentication failed' });
                }

                const isValidPassword = await bcrypt.compare(password, user.password);
                
                if (!isValidPassword) {
                    return res.status(401).json({ error: 'Authentication failed' });
                }

                const token = jwt.sign(
                    { 
                        userId: user.id,
                        username: user.username,
                        role: user.role 
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: '24h' }
                );

                res.json({
                    token,
                    userId: user.id,
                    username: user.username,
                    role: user.role
                });
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }

    static async register(req, res) {
        try {
            const { username, password } = req.body;

            // Check if username already exists
            db.get('SELECT id FROM users WHERE username = ?', [username], async (err, user) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                if (user) {
                    return res.status(400).json({ error: 'Username already exists' });
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);

                // Insert new user
                db.run(
                    'INSERT INTO users (username, password, role, credits) VALUES (?, ?, ?, ?)',
                    [username, hashedPassword, 'user', 20],
                    function(err) {
                        if (err) {
                            console.error('Registration error:', err);
                            return res.status(500).json({ error: 'Registration failed' });
                        }

                        res.status(201).json({
                            message: 'User registered successfully',
                            userId: this.lastID
                        });
                    }
                );
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }
}

module.exports = AuthController;