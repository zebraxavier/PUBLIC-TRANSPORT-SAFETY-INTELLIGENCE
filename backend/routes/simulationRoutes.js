const simulationController = require('../controllers/simulationController');
const express = require('express');
const router = express.Router();

router.get('/status', simulationController.getStatus);
router.post('/toggle', simulationController.toggleSimulation);
router.post('/trigger/:scenario', simulationController.triggerScenario);

module.exports = router;
