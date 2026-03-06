const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { auth, requireRole } = require('../middleware/authMiddleware');

// Public routes
router.get('/stats', vehicleController.getVehicleStats);

// All vehicle routes require authentication
router.use(auth);

// CRUD routes
router.get('/', vehicleController.getVehicles);
router.get('/:id', vehicleController.getVehicleById);
router.post('/', requireRole('admin', 'operator'), vehicleController.createVehicle);
router.put('/:id', requireRole('admin', 'operator'), vehicleController.updateVehicle);
router.delete('/:id', requireRole('admin'), vehicleController.deleteVehicle);

module.exports = router;

