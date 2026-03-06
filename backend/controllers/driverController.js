const Driver = require('../models/Driver');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/drivers - Get all drivers
exports.getDrivers = asyncHandler(async (req, res) => {
    const { status, zone_id, limit = 50, page = 1 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (zone_id) filter.current_zone = zone_id;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const drivers = await Driver.find(filter)
        .populate('assigned_vehicle', 'vehicle_id plate_number')
        .populate('current_zone', 'name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Driver.countDocuments(filter);

    res.json({
        success: true,
        data: drivers,
        pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// GET /api/drivers/:id - Get single driver
exports.getDriverById = asyncHandler(async (req, res) => {
    const driver = await Driver.findById(req.params.id)
        .populate('assigned_vehicle', 'vehicle_id plate_number type')
        .populate('current_zone', 'name');

    if (!driver) {
        return res.status(404).json({ 
            success: false, 
            error: 'Driver not found' 
        });
    }

    res.json({ success: true, data: driver });
});

// POST /api/drivers - Create new driver
exports.createDriver = asyncHandler(async (req, res) => {
    const driver = new Driver(req.body);
    await driver.save();
    
    res.status(201).json({ 
        success: true, 
        data: driver 
    });
});

// PUT /api/drivers/:id - Update driver
exports.updateDriver = asyncHandler(async (req, res) => {
    const driver = await Driver.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!driver) {
        return res.status(404).json({ 
            success: false, 
            error: 'Driver not found' 
        });
    }

    res.json({ success: true, data: driver });
});

// DELETE /api/drivers/:id - Delete driver
exports.deleteDriver = asyncHandler(async (req, res) => {
    const driver = await Driver.findByIdAndDelete(req.params.id);

    if (!driver) {
        return res.status(404).json({ 
            success: false, 
            error: 'Driver not found' 
        });
    }

    res.json({ 
        success: true, 
        message: 'Driver deleted successfully' 
    });
});

// GET - Get driver statistics /api/drivers/stats
exports.getDriverStats = asyncHandler(async (req, res) => {
    const total = await Driver.countDocuments();
    const available = await Driver.countDocuments({ status: 'available' });
    const onDuty = await Driver.countDocuments({ status: 'on_duty' });
    const offDuty = await Driver.countDocuments({ status: 'off_duty' });

    // Average safety score
    const avgSafety = await Driver.aggregate([
        { $group: { _id: null, avgScore: { $avg: '$safety_score' } } }
    ]);

    res.json({
        success: true,
        data: {
            total,
            available,
            onDuty,
            offDuty,
            avgSafetyScore: avgSafety[0]?.avgScore ? Math.round(avgSafety[0].avgScore) : 0
        }
    });
});

