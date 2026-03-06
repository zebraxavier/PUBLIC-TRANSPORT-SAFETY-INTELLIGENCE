const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    driver_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    license_number: { type: String, required: true },
    license_expiry: { type: Date, required: true },
    status: { 
        type: String, 
        enum: ['available', 'on_duty', 'off_duty', 'suspended'],
        default: 'available' 
    },
    assigned_vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    current_zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    total_trips: { type: Number, default: 0 },
    safety_score: { type: Number, default: 100, min: 0, max: 100 },
    rating: { type: Number, default: 5, min: 0, max: 5 },
    hire_date: { type: Date, default: Date.now },
    last_medical_checkup: { type: Date },
    emergency_contact: {
        name: String,
        phone: String,
        relation: String
    },
    simulated: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Update timestamp on save
driverSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});

// Index for queries
driverSchema.index({ status: 1 });
driverSchema.index({ email: 1 });

module.exports = mongoose.model('Driver', driverSchema);

