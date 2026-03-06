const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    zone_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    zone_name: { type: String },
    type: {
        type: String,
        enum: ['overcrowding', 'aggressive_traffic', 'sudden_congestion', 'suspicious_movement', 'vehicle_accident', 'unauthorized_access'],
        required: true
    },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    description: { type: String },
    crowd_density: { type: Number, min: 0, max: 1 },
    vehicle_count: { type: Number, default: 0 },
    risk_score: { type: Number, min: 0, max: 100 },
    latitude: { type: Number },
    longitude: { type: Number },
    resolved: { type: Boolean, default: false },
    simulated: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Incident', incidentSchema);
