const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['info', 'warning', 'danger', 'critical'], default: 'warning' },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    zoneName: { type: String },
    incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
    riskScore: { type: Number, default: 0 },
    isRead: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('Alert', AlertSchema);
