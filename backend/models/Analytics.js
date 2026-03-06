const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    date: { type: String }, // YYYY-MM-DD
    hour: { type: Number }, // 0-23
    zone_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    zone_name: { type: String },
    avg_crowd_density: { type: Number },
    total_incidents: { type: Number, default: 0 },
    total_vehicles: { type: Number, default: 0 },
    avg_risk_score: { type: Number, default: 0 },
    peak_density_time: { type: String },
    incident_types: {
        overcrowding: { type: Number, default: 0 },
        aggressive_traffic: { type: Number, default: 0 },
        sudden_congestion: { type: Number, default: 0 },
        suspicious_movement: { type: Number, default: 0 }
    },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Analytics', analyticsSchema);
