const express = require('express');
const router = express.Router();
const { getZones, getZoneById, getZoneSafety, updateZone } = require('../controllers/zoneController');
router.get('/', getZones);
router.get('/safety', getZoneSafety);
router.get('/:id', getZoneById);
router.patch('/:id', updateZone);
module.exports = router;
