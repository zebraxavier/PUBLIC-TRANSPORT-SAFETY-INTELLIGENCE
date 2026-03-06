const Alert = require('../models/Alert');

// GET /api/alerts
exports.getAlerts = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 30;
        const alerts = await Alert.find().sort({ timestamp: -1 }).limit(limit);
        res.json({ success: true, count: alerts.length, data: alerts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/alerts
exports.createAlert = async (req, res) => {
    try {
        const alert = new Alert(req.body);
        await alert.save();
        if (global.broadcast) global.broadcast({ type: 'new_alert', data: alert });
        res.status(201).json({ success: true, data: alert });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PATCH /api/alerts/:id/acknowledge
exports.acknowledgeAlert = async (req, res) => {
    try {
        const alert = await Alert.findByIdAndUpdate(req.params.id, { acknowledged: true }, { new: true });
        if (!alert) return res.status(404).json({ error: 'Alert not found' });
        if (global.broadcast) global.broadcast({ type: 'alert_acknowledged', data: alert });
        res.json({ success: true, data: alert });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/alerts/unread
exports.getUnread = async (req, res) => {
    try {
        const alerts = await Alert.find({ acknowledged: false }).sort({ timestamp: -1 }).limit(20);
        res.json({ success: true, count: alerts.length, data: alerts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
