const Alert = require('../models/Alert');
const { broadcastAlert } = require('../utils/wsManager');

const getAlerts = async (req, res, next) => {
    try {
        const { severity, isRead, limit = 50 } = req.query;
        const filter = {};
        if (severity) filter.severity = severity;
        if (isRead !== undefined) filter.isRead = isRead === 'true';

        const alerts = await Alert.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
        const unread = await Alert.countDocuments({ isRead: false });
        res.json({ success: true, data: alerts, unread });
    } catch (err) { next(err); }
};

const createAlert = async (req, res, next) => {
    try {
        const alert = await Alert.create(req.body);
        broadcastAlert(alert);
        res.status(201).json({ success: true, data: alert });
    } catch (err) { next(err); }
};

const markAsRead = async (req, res, next) => {
    try {
        const alert = await Alert.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
        if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
        res.json({ success: true, data: alert });
    } catch (err) { next(err); }
};

const markAllRead = async (req, res, next) => {
    try {
        await Alert.updateMany({ isRead: false }, { isRead: true });
        res.json({ success: true, message: 'All alerts marked as read' });
    } catch (err) { next(err); }
};

const getAlertStats = async (req, res, next) => {
    try {
        const total = await Alert.countDocuments();
        const unread = await Alert.countDocuments({ isRead: false });
        const critical = await Alert.countDocuments({ severity: 'critical' });
        const danger = await Alert.countDocuments({ severity: 'danger' });
        res.json({ success: true, data: { total, unread, critical, danger } });
    } catch (err) { next(err); }
};

module.exports = { getAlerts, createAlert, markAsRead, markAllRead, getAlertStats };
