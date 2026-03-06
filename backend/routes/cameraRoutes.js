const express = require('express');
const router = express.Router();
const cameraController = require('../controllers/cameraController');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /api/camera/analyze - Analyze base64 frame
router.post('/analyze', cameraController.analyzeFrame);

// POST /api/camera/analyze-multipart - Analyze multipart file upload
router.post('/analyze-multipart', upload.single('image'), cameraController.analyzeMultipart);

// GET /api/camera/status - Get analyzer status
router.get('/status', cameraController.getStatus);

module.exports = router;

