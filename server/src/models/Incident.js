const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['overcrowding', 'aggressive_traffic', 'congestion', 'suspicious_movement', 'accident', 'emergency'],
        required: true
    },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    zoneName: { type: String },
    description: { type: String },
    detectionData: {
        peopleCount: { type: Number, default: 0 },
        vehicleCount: { type: Number, default: 0 },
        crowdDensity: { type: Number, default: 0 },
        movementSpeed: { type: String },
        riskScore: { type: Number, default: 0 }
    },
    status: { type: String, enum: ['active', 'resolved', 'monitoring'], default: 'active' },
    resolvedAt: { type: Date },
    location: { lat: Number, lng: Number },
}, { timestamps: true });

module.exports = mongoose.model('Incident', IncidentSchema);
