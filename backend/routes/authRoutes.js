const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { auth: authMiddleware } = require('../middleware/authMiddleware');

router.post('/login', auth.login);
router.post('/register', auth.register);
router.get('/me', authMiddleware, auth.me);

module.exports = router;
