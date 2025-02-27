// routes/admin.routes.js
const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

// Apply authentication and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// User management
router.get('/users', AdminController.getAllUsers);

// Analytics
router.get('/analytics', AdminController.getAnalytics);

// Credit management
router.post('/credits/:userId', AdminController.adjustCredits);
router.get('/credits/requests', AdminController.getPendingCreditRequests);
router.put('/credits/requests/:requestId', AdminController.handleCreditRequest);

module.exports = router;