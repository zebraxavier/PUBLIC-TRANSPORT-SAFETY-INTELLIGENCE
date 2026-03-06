const express = require('express');
const router = express.Router();
const { register, login, demoLogin } = require('../controllers/authController');
router.post('/register', register);
router.post('/login', login);
router.post('/demo', demoLogin);
module.exports = router;
