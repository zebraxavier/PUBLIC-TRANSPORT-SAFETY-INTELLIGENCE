const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/alertController');

router.get('/', ctrl.getAlerts);
router.get('/unread', ctrl.getUnread);
router.post('/', ctrl.createAlert);
router.patch('/:id/acknowledge', ctrl.acknowledgeAlert);

module.exports = router;
