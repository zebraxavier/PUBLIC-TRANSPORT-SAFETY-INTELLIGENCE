const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { auth, requireRole } = require('../middleware/authMiddleware');

// Public routes
router.get('/stats', driverController.getDriverStats);

// All driver routes require authentication
router.use(auth);

// CRUD routes
router.get('/', driverController.getDrivers);
router.get('/:id', driverController.getDriverById);
router.post('/', requireRole('admin', 'operator'), driverController.createDriver);
router.put('/:id', requireRole('admin', 'operator'), driverController.updateDriver);
router.delete('/:id', requireRole('admin'), driverController.deleteDriver);

module.exports = router;

