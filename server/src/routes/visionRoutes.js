const express = require('express');
const router = express.Router();
const { receiveDetection, simulateScenario } = require('../controllers/visionController');
router.post('/detection', receiveDetection);
router.post('/simulate', simulateScenario);
module.exports = router;
