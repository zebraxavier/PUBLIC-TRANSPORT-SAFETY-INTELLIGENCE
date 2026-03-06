const Zone = require('../models/Zone');
const Incident = require('../models/Incident');

const getZones = async (req, res, next) => {
    try {
        const zones = await Zone.find({ isActive: true }).sort({ riskScore: -1 });
        res.json({ success: true, data: zones });
    } catch (err) { next(err); }
};

const getZoneById = async (req, res, next) => {
    try {
        const zone = await Zone.findById(req.params.id);
        if (!zone) return res.status(404).json({ success: false, error: 'Zone not found' });
        const recentIncidents = await Incident.find({ zone: zone._id }).sort({ createdAt: -1 }).limit(5);
        res.json({ success: true, data: { ...zone.toObject(), recentIncidents } });
    } catch (err) { next(err); }
};

const getZoneSafety = async (req, res, next) => {
    try {
        const zones = await Zone.find({ isActive: true }).sort({ riskScore: -1 });
        const summary = {
            safe: zones.filter(z => z.riskLevel === 'safe').length,
            warning: zones.filter(z => z.riskLevel === 'warning').length,
            danger: zones.filter(z => z.riskLevel === 'danger').length,
            avgRiskScore: zones.reduce((a, z) => a + z.riskScore, 0) / (zones.length || 1),
            zones: zones.map(z => ({
                id: z._id, name: z.name, type: z.type, location: z.location,
                riskScore: z.riskScore, riskLevel: z.riskLevel, safetyScore: z.safetyScore,
                crowdDensity: z.crowdDensity, vehicleCount: z.vehicleCount, incidentCount: z.incidentCount
            }))
        };
        res.json({ success: true, data: summary });
    } catch (err) { next(err); }
};

const updateZone = async (req, res, next) => {
    try {
        const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!zone) return res.status(404).json({ success: false, error: 'Zone not found' });
        res.json({ success: true, data: zone });
    } catch (err) { next(err); }
};

module.exports = { getZones, getZoneById, getZoneSafety, updateZone };
