const mongoose = require('mongoose');

const sensorStreamSchema = new mongoose.Schema({
    stream_id: { type: String, unique: true },
    source_type: { type: String, enum: ['mobile_camera', 'cctv', 'drone', 'simulated'], default: 'mobile_camera' },
    zone_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    zone_name: { type: String },
    device_id: { type: String },
    status: { type: String, enum: ['active', 'idle', 'error'], default: 'idle' },
    last_frame_at: { type: Date },
    fps: { type: Number, default: 0 },
    resolution: { type: String, default: '720p' },
    last_detection: {
        people_count: Number,
        vehicle_count: Number,
        crowd_density: Number,
        risk_score: Number
    },
    started_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SensorStream', sensorStreamSchema);
