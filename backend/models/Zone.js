const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['bus_stop', 'metro_station', 'railway', 'airport', 'taxi_stand', 'crosswalk'], required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radius: { type: Number, default: 200 }, // metres
    risk_level: { type: String, enum: ['safe', 'moderate', 'danger'], default: 'safe' },
    risk_score: { type: Number, min: 0, max: 100, default: 0 },
    safety_score: { type: Number, min: 0, max: 100, default: 100 },
    capacity: { type: Number, default: 500 },
    current_occupancy: { type: Number, default: 0 },
    incident_count: { type: Number, default: 0 },
    cameras: [{ camera_id: String, status: String }],
    last_updated: { type: Date, default: Date.now },
    active: { type: Boolean, default: true }
});

module.exports = mongoose.model('Zone', zoneSchema);
