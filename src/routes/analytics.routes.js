const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analytics.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/user-stats', AnalyticsController.getUserStats);
router.get('/system-stats', AnalyticsController.getSystemStats);
router.get('/document-stats', AnalyticsController.getDocumentStats);

module.exports = router;