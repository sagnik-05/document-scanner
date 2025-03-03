const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'storage', 'documents');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, `${timestamp}-${safeFilename}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['text/plain', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only .txt and .pdf files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            error: 'Upload error',
            message: err.message
        });
    } else if (err) {
        return res.status(400).json({
            error: 'Invalid file',
            message: err.message
        });
    }
    next();
};

module.exports = {
    upload,
    handleUploadError
};