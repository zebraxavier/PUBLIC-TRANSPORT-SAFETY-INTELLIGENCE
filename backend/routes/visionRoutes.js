const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/visionController');

router.post('/detection', ctrl.processDetection);

module.exports = router;
