const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/incidentController');

router.get('/', ctrl.getIncidents);
router.get('/stats', ctrl.getStats);
router.get('/:id', ctrl.getIncidentById);
router.post('/', ctrl.createIncident);
router.patch('/:id/resolve', ctrl.resolveIncident);
router.delete('/:id', ctrl.deleteIncident);

module.exports = router;
