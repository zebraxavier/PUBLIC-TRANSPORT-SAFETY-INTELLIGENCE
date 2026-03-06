const Zone = require('../models/Zone');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const ZONES = [
    { name: 'Central Bus Terminal', type: 'bus_stop', latitude: 12.9716, longitude: 77.5946, risk_level: 'moderate', risk_score: 58, safety_score: 42, capacity: 800, current_occupancy: 420, incident_count: 12 },
    { name: 'Metro Station Alpha', type: 'metro_station', latitude: 12.9784, longitude: 77.6408, risk_level: 'safe', risk_score: 22, safety_score: 78, capacity: 1200, current_occupancy: 310, incident_count: 4 },
    { name: 'Railway Hub', type: 'railway', latitude: 12.9767, longitude: 77.5713, risk_level: 'danger', risk_score: 78, safety_score: 22, capacity: 2000, current_occupancy: 1680, incident_count: 24 },
    { name: 'Airport Connector', type: 'airport', latitude: 13.1979, longitude: 77.7063, risk_level: 'safe', risk_score: 15, safety_score: 85, capacity: 500, current_occupancy: 120, incident_count: 2 },
    { name: 'Northern Crosswalk', type: 'crosswalk', latitude: 13.0358, longitude: 77.5970, risk_level: 'moderate', risk_score: 45, safety_score: 55, capacity: 200, current_occupancy: 95, incident_count: 7 }
];

const INCIDENT_TEMPLATES = [
    { type: 'overcrowding', severity: 'high', crowd_density: 0.88, vehicle_count: 12, risk_score: 74, description: 'Platform overflow at Railway Hub during peak hours' },
    { type: 'aggressive_traffic', severity: 'medium', crowd_density: 0.3, vehicle_count: 55, risk_score: 52, description: 'Erratic vehicle behavior near Bus Terminal' },
    { type: 'sudden_congestion', severity: 'high', crowd_density: 0.62, vehicle_count: 70, risk_score: 68, description: 'Sudden bottleneck at Northern Crosswalk' },
    { type: 'suspicious_movement', severity: 'medium', crowd_density: 0.45, vehicle_count: 8, risk_score: 40, description: 'Suspicious individual loitering at Metro Station Alpha' },
    { type: 'overcrowding', severity: 'critical', crowd_density: 0.95, vehicle_count: 5, risk_score: 90, description: 'Critical crowd density at Railway Hub, evacuation risk' },
    { type: 'vehicle_accident', severity: 'high', crowd_density: 0.4, vehicle_count: 35, risk_score: 65, description: 'Minor collision at Airport Connector entry road' },
    { type: 'sudden_congestion', severity: 'medium', crowd_density: 0.55, vehicle_count: 48, risk_score: 55, description: 'Lane blockage causing congestion at Bus Terminal' },
    { type: 'suspicious_movement', severity: 'low', crowd_density: 0.2, vehicle_count: 3, risk_score: 20, description: 'Unattended baggage spotted at Metro Station Alpha' }
];

async function seedAll() {
    try {
        const zoneCount = await Zone.countDocuments();
        if (zoneCount === 0) {
            await Zone.insertMany(ZONES);
            console.log('✅ Seeded zones');
        }

        const incidentCount = await Incident.countDocuments();
        if (incidentCount < 5) {
            const zones = await Zone.find();
            const incidents = INCIDENT_TEMPLATES.map((t, i) => ({
                ...t,
                zone_id: zones[i % zones.length]?._id,
                zone_name: zones[i % zones.length]?.name || 'Unknown Zone',
                latitude: 12.9716 + (Math.random() - 0.5) * 0.1,
                longitude: 77.5946 + (Math.random() - 0.5) * 0.1,
                simulated: true,
                timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 3600000)
            }));
            await Incident.insertMany(incidents);
            console.log('✅ Seeded incidents');
        }

        const alertCount = await Alert.countDocuments();
        if (alertCount < 3) {
            const alerts = [
                { title: '🚨 High Crowd Density Detected', message: 'Railway Hub at 95% capacity. Immediate action required.', severity: 'critical', zone_name: 'Railway Hub', simulated: true },
                { title: '⚠️ Traffic Congestion Alert', message: 'Severe vehicle congestion near Central Bus Terminal.', severity: 'danger', zone_name: 'Central Bus Terminal', simulated: true },
                { title: '👁️ Suspicious Activity', message: 'Unusual movement pattern at Metro Station Alpha.', severity: 'warning', zone_name: 'Metro Station Alpha', simulated: true },
                { title: '✅ Zone Cleared', message: 'Airport Connector zone is operating normally.', severity: 'info', zone_name: 'Airport Connector', simulated: false }
            ];
            await Alert.insertMany(alerts);
            console.log('✅ Seeded alerts');
        }

        const userCount = await User.countDocuments();
        if (userCount === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await User.create({ name: 'Admin User', email: 'admin@ptsi.com', password: hash, role: 'admin' });
            console.log('✅ Seeded admin user (admin@ptsi.com / admin123)');
        }
    } catch (err) {
        console.warn('⚠️  Seed skipped (likely no DB):', err.message);
    }
}

module.exports = { seedAll };
