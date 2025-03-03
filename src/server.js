// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const { initDatabase } = require('./database/init.js');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initDatabase();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});


// Routes
try {
    const authRoutes = require('./routes/auth.routes.js');
    const userRoutes = require('./routes/user.routes.js');
    const scannerRoutes = require('./routes/scanner.routes.js');
    const adminRoutes = require('./routes/admin.routes.js');
    const creditRoutes = require('./routes/credit.routes');
    const analyticsRoutes = require('./routes/analytics.routes');
    const documentRoutes = require('./routes/document.routes');


    // Route middlewares
    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/scanner', scannerRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/credits', creditRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/documents', documentRoutes);
} catch (error) {
    console.error('Error loading routes:', error);
}

// Basic routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Test route to verify API is working
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working' });
});

// Credit reset scheduler
const resetDailyCredits = require('./utils/creditManager').resetDailyCredits;
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        resetDailyCredits();
    }
}, 60000);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// 404 handler
app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Route not found' });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Performing graceful shutdown...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = app;