const mongoose = require('mongoose');

const ZoneSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['bus_stop', 'train_station', 'metro', 'terminal', 'highway'], default: 'bus_stop' },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        address: { type: String }
    },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['safe', 'warning', 'danger'], default: 'safe' },
    crowdDensity: { type: Number, default: 0 },
    vehicleCount: { type: Number, default: 0 },
    congestionLevel: { type: Number, default: 0 },
    incidentCount: { type: Number, default: 0 },
    safetyScore: { type: Number, default: 100, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Zone', ZoneSchema);
