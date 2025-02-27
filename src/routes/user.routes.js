const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller.js');
const authMiddleware = require('../middleware/auth.middleware.js');

router.use(authMiddleware); // Protect all user routes
router.get('/profile', UserController.getProfile);
router.get('/credits', UserController.getCredits);

module.exports = router;