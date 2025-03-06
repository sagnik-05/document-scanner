// routes/credit.routes.js
const express = require('express');
const router = express.Router();
const CreditController = require('../controllers/credit.controller');
const authMiddleware = require('../middleware/auth.middleware');

// User routes
router.get('/', authMiddleware, CreditController.getCredits);
router.post('/request', authMiddleware, CreditController.requestCredits);
router.get('/history', authMiddleware, CreditController.getCreditHistory);

// Admin routes
router.get('/pending', authMiddleware, CreditController.getPendingRequests);
router.put('/handle/:requestId', authMiddleware, CreditController.handleCreditRequest);

module.exports = router;