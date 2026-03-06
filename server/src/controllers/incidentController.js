const Incident = require('../models/Incident');

const getIncidents = async (req, res, next) => {
    try {
        const { severity, type, status, limit = 50, page = 1 } = req.query;
        const filter = {};
        if (severity) filter.severity = severity;
        if (type) filter.type = type;
        if (status) filter.status = status;

        const total = await Incident.countDocuments(filter);
        const incidents = await Incident.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('zone', 'name type location');

        res.json({ success: true, data: incidents, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (err) { next(err); }
};

const getIncidentById = async (req, res, next) => {
    try {
        const incident = await Incident.findById(req.params.id).populate('zone');
        if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });
        res.json({ success: true, data: incident });
    } catch (err) { next(err); }
};

const createIncident = async (req, res, next) => {
    try {
        const incident = await Incident.create(req.body);
        res.status(201).json({ success: true, data: incident });
    } catch (err) { next(err); }
};

const updateIncidentStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const update = { status };
        if (status === 'resolved') update.resolvedAt = new Date();
        const incident = await Incident.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!incident) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, data: incident });
    } catch (err) { next(err); }
};

const getIncidentStats = async (req, res, next) => {
    try {
        const stats = await Incident.aggregate([
            { $group: { _id: '$type', count: { $sum: 1 }, avgRisk: { $avg: '$detectionData.riskScore' } } },
            { $sort: { count: -1 } }
        ]);
        const total = await Incident.countDocuments();
        const active = await Incident.countDocuments({ status: 'active' });
        const critical = await Incident.countDocuments({ severity: 'critical' });
        res.json({ success: true, data: { total, active, critical, byType: stats } });
    } catch (err) { next(err); }
};

module.exports = { getIncidents, getIncidentById, createIncident, updateIncidentStatus, getIncidentStats };
