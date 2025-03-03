// routes/document.routes.js
const express = require('express');
const router = express.Router();
const { upload, handleUploadError } = require('../middleware/upload.middleware');
const DocumentController = require('../controllers/document.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Apply authentication middleware
router.use((req, res, next) => {
    if (req.path.endsWith('/view') && req.query.token) {
        return next();
    }
    return authMiddleware(req, res, next);
});
// View document route (should come before other routes with :id parameter)
router.get('/:id/view', DocumentController.viewDocument);
// Get all documents
router.get('/', DocumentController.getAllDocuments);

// Upload document
router.post('/upload', 
    upload.single('document'),
    handleUploadError,
    DocumentController.uploadDocument
);

// Get specific document
router.get('/:id', DocumentController.getDocument);

// Delete document
router.delete('/:id', DocumentController.deleteDocument);

module.exports = router;