const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/zoneController');

router.get('/', ctrl.getZones);
router.get('/safety', ctrl.getZoneSafety);
router.get('/:id', ctrl.getZoneById);
router.patch('/:id/risk', ctrl.updateZoneRisk);

module.exports = router;
