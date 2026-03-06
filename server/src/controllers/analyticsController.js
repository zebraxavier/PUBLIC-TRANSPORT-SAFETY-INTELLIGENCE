const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const Zone = require('../models/Zone');
const mongoose = require('mongoose');

const isDbConnected = () => mongoose.connection.readyState === 1;

// ── Demo data for when MongoDB is not available ─────────────────────────────
const DEMO_HOURLY = Array.from({ length: 24 }, (_, h) => ({
    hour: h, label: `${h.toString().padStart(2, '0')}:00`,
    incidents: h >= 7 && h <= 9 ? Math.floor(Math.random() * 8) + 3 : h >= 17 && h <= 19 ? Math.floor(Math.random() * 6) + 2 : Math.floor(Math.random() * 3),
    avgRisk: Math.floor(Math.random() * 40) + 20
}));

const DEMO_DAILY = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), incidents: Math.floor(Math.random() * 12) + 2 };
});

const DEMO_ZONE_RISK = [
    { name: 'Central Bus Terminal', riskScore: 78, riskLevel: 'danger' },
    { name: 'Airport Metro Stop', riskScore: 62, riskLevel: 'warning' },
    { name: 'Railway Junction', riskScore: 55, riskLevel: 'warning' },
    { name: 'City Square Hub', riskScore: 41, riskLevel: 'warning' },
    { name: 'Suburban Bus Stop', riskScore: 22, riskLevel: 'safe' },
    { name: 'Highway Interchange', riskScore: 85, riskLevel: 'danger' },
];

const DEMO_BY_TYPE = [
    { type: 'overcrowding', count: 18 },
    { type: 'congestion', count: 14 },
    { type: 'aggressive_traffic', count: 9 },
    { type: 'suspicious_movement', count: 6 },
    { type: 'emergency', count: 3 },
];

const DEMO_INSIGHTS = {
    mostDangerousZones: [
        { name: 'Highway Interchange', riskScore: 85 },
        { name: 'Central Bus Terminal', riskScore: 78 },
        { name: 'Airport Metro Stop', riskScore: 62 },
    ],
    safestZones: [
        { name: 'Suburban Bus Stop', safetyScore: 88 },
        { name: 'Park & Ride East', safetyScore: 82 },
    ],
    peakUnsafeHours: [
        { hour: 8, label: '8:00', count: 11 },
        { hour: 18, label: '18:00', count: 9 },
        { hour: 17, label: '17:00', count: 7 },
        { hour: 7, label: '7:00', count: 5 },
        { hour: 22, label: '22:00', count: 4 },
    ],
    totalZones: 8,
    safeCount: 2,
    dangerCount: 2,
};

// ── Controllers ──────────────────────────────────────────────────────────────

const getRiskAnalytics = async (req, res, next) => {
    try {
        if (!isDbConnected()) {
            // Return rich demo data when MongoDB is not connected
            return res.json({
                success: true,
                data: {
                    kpis: { totalIncidents: 50, activeIncidents: 7, totalAlerts: 23, unreadAlerts: 5, avgRisk: 54 },
                    hourly: DEMO_HOURLY,
                    zoneRisk: DEMO_ZONE_RISK,
                    byType: DEMO_BY_TYPE,
                    daily: DEMO_DAILY
                },
                demo: true
            });
        }

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const incidents = await Incident.find({ createdAt: { $gte: since } });

        const hourly = Array.from({ length: 24 }, (_, h) => ({
            hour: h, label: `${h.toString().padStart(2, '0')}:00`, incidents: 0, avgRisk: 0
        }));
        incidents.forEach(inc => {
            const h = new Date(inc.createdAt).getHours();
            hourly[h].incidents++;
            hourly[h].avgRisk = (hourly[h].avgRisk + (inc.detectionData?.riskScore || 50)) / 2;
        });

        const zones = await Zone.find({ isActive: true }).sort({ riskScore: -1 });
        const zoneRisk = zones.map(z => ({ name: z.name, riskScore: z.riskScore, riskLevel: z.riskLevel }));

        const byType = await Incident.aggregate([
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 6 }
        ]);

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const allRecent = await Incident.find({ createdAt: { $gte: sevenDaysAgo } });
        const daily = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
            return {
                date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                incidents: allRecent.filter(inc => new Date(inc.createdAt).toDateString() === d.toDateString()).length
            };
        });

        const totalIncidents = await Incident.countDocuments();
        const activeIncidents = await Incident.countDocuments({ status: 'active' });
        const totalAlerts = await Alert.countDocuments();
        const unreadAlerts = await Alert.countDocuments({ isRead: false });
        const avgRisk = zones.reduce((acc, z) => acc + z.riskScore, 0) / (zones.length || 1);

        res.json({
            success: true,
            data: {
                kpis: { totalIncidents, activeIncidents, totalAlerts, unreadAlerts, avgRisk: Math.round(avgRisk) },
                hourly, zoneRisk, byType: byType.map(b => ({ type: b._id, count: b.count })), daily
            }
        });
    } catch (err) { next(err); }
};

const getSafetyInsights = async (req, res, next) => {
    try {
        if (!isDbConnected()) {
            return res.json({ success: true, data: DEMO_INSIGHTS, demo: true });
        }

        const zones = await Zone.find({ isActive: true }).sort({ riskScore: -1 });
        const dangerZones = zones.filter(z => z.riskLevel === 'danger');
        const safeZones = zones.filter(z => z.riskLevel === 'safe');

        const incidents = await Incident.find();
        const peakHours = {};
        incidents.forEach(inc => {
            const h = new Date(inc.createdAt).getHours();
            peakHours[h] = (peakHours[h] || 0) + 1;
        });
        const peakUnsafeHours = Object.entries(peakHours)
            .sort((a, b) => b[1] - a[1]).slice(0, 5)
            .map(([hour, count]) => ({ hour: parseInt(hour), label: `${hour}:00`, count }));

        res.json({
            success: true,
            data: {
                mostDangerousZones: dangerZones.slice(0, 3).map(z => ({ name: z.name, riskScore: z.riskScore })),
                safestZones: safeZones.slice(0, 3).map(z => ({ name: z.name, safetyScore: z.safetyScore })),
                peakUnsafeHours,
                totalZones: zones.length, safeCount: safeZones.length, dangerCount: dangerZones.length
            }
        });
    } catch (err) { next(err); }
};

module.exports = { getRiskAnalytics, getSafetyInsights };
