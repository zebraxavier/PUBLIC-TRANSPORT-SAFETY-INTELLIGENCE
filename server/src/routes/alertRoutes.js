const express = require('express');
const router = express.Router();
const { getAlerts, createAlert, markAsRead, markAllRead, getAlertStats } = require('../controllers/alertController');
router.get('/', getAlerts);
router.get('/stats', getAlertStats);
router.post('/', createAlert);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllRead);
module.exports = router;
