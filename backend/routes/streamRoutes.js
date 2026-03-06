const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/visionController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/start', ctrl.startStream || ((req, res) => res.json({})));
router.get('/active', ctrl.getActiveStreams || ((req, res) => res.json([])));
router.post('/frame', upload.single('frame'), ctrl.receiveFrame);

module.exports = router;
