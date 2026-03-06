const express = require('express');
const router = express.Router();
const { getIncidents, getIncidentById, createIncident, updateIncidentStatus, getIncidentStats } = require('../controllers/incidentController');
router.get('/', getIncidents);
router.get('/stats', getIncidentStats);
router.get('/:id', getIncidentById);
router.post('/', createIncident);
router.patch('/:id/status', updateIncidentStatus);
module.exports = router;
