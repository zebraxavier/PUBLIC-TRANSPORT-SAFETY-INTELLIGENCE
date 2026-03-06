const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    vehicle_id: { type: String, required: true, unique: true },
    type: { 
        type: String, 
        enum: ['bus', 'train', 'tram', 'metro', 'taxi', 'van', 'other'],
        required: true 
    },
    plate_number: { type: String, required: true },
    capacity: { type: Number, default: 0 },
    current_zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    current_latitude: { type: Number },
    current_longitude: { type: Number },
    speed: { type: Number, default: 0 },
    status: { 
        type: String, 
        enum: ['active', 'maintenance', 'inactive', 'on_route'],
        default: 'active' 
    },
    last_maintenance: { type: Date },
    next_maintenance: { type: Date },
    driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    route_id: { type: String },
    simulated: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Update timestamp on save
vehicleSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});

// Index for geospatial queries
vehicleSchema.index({ current_latitude: 1, current_longitude: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);

