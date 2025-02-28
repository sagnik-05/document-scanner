const express = require('express');
const router = express.Router();
const CreditController = require('../controllers/credit.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/balance', CreditController.getCreditBalance);
router.post('/request', CreditController.requestCredits);
router.get('/history', CreditController.getCreditHistory);

module.exports = router;