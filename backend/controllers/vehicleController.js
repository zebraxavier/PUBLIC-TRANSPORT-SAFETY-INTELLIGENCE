const Vehicle = require('../models/Vehicle');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/vehicles - Get all vehicles
exports.getVehicles = asyncHandler(async (req, res) => {
    const { status, type, zone_id, limit = 50, page = 1 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (zone_id) filter.current_zone = zone_id;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const vehicles = await Vehicle.find(filter)
        .populate('current_zone', 'name')
        .populate('driver_id', 'name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Vehicle.countDocuments(filter);

    res.json({
        success: true,
        data: vehicles,
        pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// GET /api/vehicles/:id - Get single vehicle
exports.getVehicleById = asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id)
        .populate('current_zone', 'name')
        .populate('driver_id', 'name');

    if (!vehicle) {
        return res.status(404).json({ 
            success: false, 
            error: 'Vehicle not found' 
        });
    }

    res.json({ success: true, data: vehicle });
});

// POST /api/vehicles - Create new vehicle
exports.createVehicle = asyncHandler(async (req, res) => {
    const vehicle = new Vehicle(req.body);
    await vehicle.save();
    
    res.status(201).json({ 
        success: true, 
        data: vehicle 
    });
});

// PUT /api/vehicles/:id - Update vehicle
exports.updateVehicle = asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!vehicle) {
        return res.status(404).json({ 
            success: false, 
            error: 'Vehicle not found' 
        });
    }

    res.json({ success: true, data: vehicle });
});

// DELETE /api/vehicles/:id - Delete vehicle
exports.deleteVehicle = asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);

    if (!vehicle) {
        return res.status(404).json({ 
            success: false, 
            error: 'Vehicle not found' 
        });
    }

    res.json({ 
        success: true, 
        message: 'Vehicle deleted successfully' 
    });
});

// GET /api/vehicles/stats - Get vehicle statistics
exports.getVehicleStats = asyncHandler(async (req, res) => {
    const total = await Vehicle.countDocuments();
    const active = await Vehicle.countDocuments({ status: 'active' });
    const onRoute = await Vehicle.countDocuments({ status: 'on_route' });
    const maintenance = await Vehicle.countDocuments({ status: 'maintenance' });

    const byType = await Vehicle.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    res.json({
        success: true,
        data: {
            total,
            active,
            onRoute,
            maintenance,
            byType
        }
    });
});

