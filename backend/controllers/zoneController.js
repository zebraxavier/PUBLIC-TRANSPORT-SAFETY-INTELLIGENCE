const Zone = require('../models/Zone');
const Incident = require('../models/Incident');

// GET /api/zones
exports.getZones = async (req, res) => {
    try {
        const zones = await Zone.find({ active: true }).sort({ risk_score: -1 });
        res.json({ success: true, count: zones.length, data: zones });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/zones/safety
exports.getZoneSafety = async (req, res) => {
    try {
        const zones = await Zone.find({ active: true }).select(
            'name type latitude longitude risk_level risk_score safety_score incident_count current_occupancy capacity last_updated'
        );
        res.json({ success: true, count: zones.length, data: zones });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/zones/:id
exports.getZoneById = async (req, res) => {
    try {
        const zone = await Zone.findById(req.params.id);
        if (!zone) return res.status(404).json({ error: 'Zone not found' });
        const recentIncidents = await Incident.find({ zone_id: zone._id }).sort({ timestamp: -1 }).limit(5);
        res.json({ success: true, data: { zone, recentIncidents } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PATCH /api/zones/:id/risk
exports.updateZoneRisk = async (req, res) => {
    try {
        const { risk_score, risk_level, current_occupancy } = req.body;
        const update = { last_updated: new Date() };
        if (risk_score !== undefined) {
            update.risk_score = risk_score;
            update.safety_score = Math.max(0, 100 - risk_score);
            update.risk_level = risk_score >= 70 ? 'danger' : risk_score >= 40 ? 'moderate' : 'safe';
        }
        if (risk_level !== undefined) update.risk_level = risk_level;
        if (current_occupancy !== undefined) update.current_occupancy = current_occupancy;
        const zone = await Zone.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!zone) return res.status(404).json({ error: 'Zone not found' });
        if (global.broadcast) global.broadcast({ type: 'zone_updated', data: zone });
        res.json({ success: true, data: zone });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
