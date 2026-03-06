const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const Zone = require('../models/Zone');

// Demo incidents data
const DEMO_INCIDENTS = [
    { _id: '1', type: 'overcrowding', severity: 'high', zone_name: 'Railway Hub', crowd_density: 0.88, vehicle_count: 12, risk_score: 74, description: 'Platform overflow at Railway Hub', timestamp: new Date() },
    { _id: '2', type: 'aggressive_traffic', severity: 'medium', zone_name: 'Central Bus Terminal', crowd_density: 0.3, vehicle_count: 55, risk_score: 52, description: 'Erratic vehicle behavior', timestamp: new Date() },
    { _id: '3', type: 'sudden_congestion', severity: 'high', zone_name: 'Northern Crosswalk', crowd_density: 0.62, vehicle_count: 70, risk_score: 68, description: 'Sudden bottleneck', timestamp: new Date() }
];

// Check if MongoDB is connected
function isMongoConnected() {
    try {
        return Incident.db && Incident.db.readyState === 1;
    } catch {
        return false;
    }
}

// GET /api/incidents
exports.getIncidents = async (req, res) => {
    try {
        if (!isMongoConnected()) {
            // Demo mode
            return res.json({ success: true, count: DEMO_INCIDENTS.length, data: DEMO_INCIDENTS });
        }
        
        const filter = {};
        if (req.query.severity) filter.severity = req.query.severity;
        if (req.query.zone_id) filter.zone_id = req.query.zone_id;
        if (req.query.type) filter.type = req.query.type;
        const limit = parseInt(req.query.limit) || 50;
        const incidents = await Incident.find(filter).sort({ timestamp: -1 }).limit(limit);
        res.json({ success: true, count: incidents.length, data: incidents });
    } catch (err) {
        res.json({ success: true, count: DEMO_INCIDENTS.length, data: DEMO_INCIDENTS });
    }
};

// GET /api/incidents/:id
exports.getIncidentById = async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id);
        if (!incident) return res.status(404).json({ error: 'Incident not found' });
        res.json({ success: true, data: incident });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/incidents
exports.createIncident = async (req, res) => {
    try {
        const incident = new Incident(req.body);
        await incident.save();
        // Create associated alert
        const alert = new Alert({
            title: `Incident: ${incident.type.replace(/_/g, ' ').toUpperCase()}`,
            message: incident.description || `${incident.type} detected in ${incident.zone_name}`,
            severity: incident.severity === 'critical' ? 'critical' : incident.severity === 'high' ? 'danger' : incident.severity === 'medium' ? 'warning' : 'info',
            zone_id: incident.zone_id,
            zone_name: incident.zone_name,
            incident_id: incident._id,
            simulated: incident.simulated
        });
        await alert.save();
        // Update zone incident count
        if (incident.zone_id) await Zone.findByIdAndUpdate(incident.zone_id, { $inc: { incident_count: 1 } });
        
        // Broadcast via WebSocket - multiple event types for different UI components
        if (global.broadcast) {
            global.broadcast({ type: 'new_incident', data: incident, alert });
            global.broadcast({ type: 'new_alert', data: alert });
            // Broadcast map-specific incident for map marker updates
            global.broadcast({
                type: 'mapIncident',
                data: {
                    id: incident._id,
                    type: incident.type,
                    severity: incident.severity,
                    latitude: incident.latitude,
                    longitude: incident.longitude,
                    zone_name: incident.zone_name,
                    description: incident.description,
                    timestamp: incident.timestamp
                }
            });
            console.log("📡 Broadcasting new_incident, new_alert, and mapIncident events");
        }
        res.status(201).json({ success: true, data: incident, alert });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PATCH /api/incidents/:id/resolve
exports.resolveIncident = async (req, res) => {
    try {
        const incident = await Incident.findByIdAndUpdate(req.params.id, { resolved: true }, { new: true });
        if (!incident) return res.status(404).json({ error: 'Not found' });
        if (global.broadcast) global.broadcast({ type: 'incident_resolved', data: incident });
        res.json({ success: true, data: incident });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/incidents/:id
exports.deleteIncident = async (req, res) => {
    try {
        const incident = await Incident.findByIdAndDelete(req.params.id);
        if (!incident) return res.status(404).json({ error: 'Incident not found' });
        // Update zone incident count
        if (incident.zone_id) await Zone.findByIdAndUpdate(incident.zone_id, { $inc: { incident_count: -1 } });
        if (global.broadcast) global.broadcast({ type: 'incident_deleted', data: { id: req.params.id } });
        res.json({ success: true, message: 'Incident deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/incidents/stats
exports.getStats = async (req, res) => {
    try {
        const total = await Incident.countDocuments();
        const high = await Incident.countDocuments({ severity: { $in: ['high', 'critical'] } });
        const unresolved = await Incident.countDocuments({ resolved: false });
        const byType = await Incident.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]);
        res.json({ success: true, data: { total, high, unresolved, byType } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
