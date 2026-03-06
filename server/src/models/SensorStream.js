const mongoose = require('mongoose');

const SensorStreamSchema = new mongoose.Schema({
    streamId: { type: String, unique: true, required: true },
    deviceType: { type: String, enum: ['mobile', 'cctv', 'iot_sensor', 'simulated'], default: 'mobile' },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    zoneName: { type: String },
    status: { type: String, enum: ['active', 'inactive', 'error'], default: 'active' },
    resolution: { type: String, default: '1280x720' },
    fps: { type: Number, default: 30 },
    lastFrameAt: { type: Date },
    framesProcessed: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('SensorStream', SensorStreamSchema);
