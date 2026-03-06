const express = require('express');
const router = express.Router();
const { getRiskAnalytics, getSafetyInsights } = require('../controllers/analyticsController');
router.get('/risk', getRiskAnalytics);
router.get('/insights', getSafetyInsights);
module.exports = router;
