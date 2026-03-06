const mongoose = require('mongoose');

const analyticsHourlySchema = new mongoose.Schema({
    zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    zoneName: String,
    date: String, // YYYY-MM-DD
    hour: Number, // 0-23
    avgRisk: Number,
    maxRisk: Number,
    minRisk: Number,
    sampleCount: Number,
    incidents: Number,
    dangerHits: Number,
    avgPeople: Number,
    avgVehicles: Number,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

analyticsHourlySchema.index({ zoneId: 1, date: 1, hour: 1 }, { unique: true });

module.exports = mongoose.model('AnalyticsHourly', analyticsHourlySchema);
