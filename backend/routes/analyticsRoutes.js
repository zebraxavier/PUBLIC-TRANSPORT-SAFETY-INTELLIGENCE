const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analyticsController');

router.get('/risk', ctrl.getRiskAnalytics);
router.get('/insights', ctrl.getInsights);
router.get('/accidents', ctrl.getAccidents);
router.get('/risk-score', ctrl.getRiskScore);
router.get('/danger-zones', ctrl.getDangerZones);

module.exports = router;
