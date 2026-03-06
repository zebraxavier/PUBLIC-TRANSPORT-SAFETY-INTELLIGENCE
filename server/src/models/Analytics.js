const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
    period: { type: String, enum: ['hourly', 'daily', 'weekly'], default: 'hourly' },
    timestamp: { type: Date, required: true },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    zoneName: { type: String },
    avgRiskScore: { type: Number, default: 0 },
    peakCrowdDensity: { type: Number, default: 0 },
    totalIncidents: { type: Number, default: 0 },
    totalAlerts: { type: Number, default: 0 },
    avgVehicleCount: { type: Number, default: 0 },
    safetyScore: { type: Number, default: 100 },
    hourlyBreakdown: [{ hour: Number, riskScore: Number, incidents: Number }],
}, { timestamps: true });

module.exports = mongoose.model('Analytics', AnalyticsSchema);
