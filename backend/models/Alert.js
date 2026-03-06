const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['info', 'warning', 'danger', 'critical'], default: 'info' },
    zone_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    zone_name: { type: String },
    incident_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
    acknowledged: { type: Boolean, default: false },
    simulated: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', alertSchema);
