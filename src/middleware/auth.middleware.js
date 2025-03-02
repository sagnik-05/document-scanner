// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        let token = req.headers.authorization?.split(' ')[1] || req.query.token;
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Remove 'Bearer ' prefix if it exists
        token = token.replace('Bearer ', '');

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userData = decoded;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

