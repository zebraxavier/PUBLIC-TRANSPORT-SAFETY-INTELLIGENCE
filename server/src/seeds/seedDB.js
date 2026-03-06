require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Zone = require('../models/Zone');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const zones = [
    { name: 'Central Bus Terminal', type: 'terminal', location: { lat: 13.0827, lng: 80.2707, address: 'Central Station, Chennai' }, riskScore: 72, riskLevel: 'danger', crowdDensity: 0.85, vehicleCount: 42, congestionLevel: 0.78, incidentCount: 12, safetyScore: 28 },
    { name: 'Metro Station Alpha', type: 'metro', location: { lat: 13.0604, lng: 80.2496, address: 'T. Nagar Metro, Chennai' }, riskScore: 48, riskLevel: 'warning', crowdDensity: 0.55, vehicleCount: 18, congestionLevel: 0.42, incidentCount: 5, safetyScore: 62 },
    { name: 'Airport Express Stop', type: 'train_station', location: { lat: 12.9941, lng: 80.1709, address: 'Chennai Airport' }, riskScore: 21, riskLevel: 'safe', crowdDensity: 0.25, vehicleCount: 9, congestionLevel: 0.18, incidentCount: 1, safetyScore: 89 },
    { name: 'Harbor Bus Stop', type: 'bus_stop', location: { lat: 13.0839, lng: 80.2890, address: 'Harbor Area, Chennai' }, riskScore: 61, riskLevel: 'warning', crowdDensity: 0.67, vehicleCount: 22, congestionLevel: 0.58, incidentCount: 7, safetyScore: 52 },
    { name: 'Suburban Rail Junction', type: 'train_station', location: { lat: 13.1067, lng: 80.2928, address: 'Perambur, Chennai' }, riskScore: 38, riskLevel: 'safe', crowdDensity: 0.42, vehicleCount: 14, congestionLevel: 0.35, incidentCount: 3, safetyScore: 75 },
    { name: 'Outer Ring Highway', type: 'highway', location: { lat: 13.0181, lng: 80.2090, address: 'OMR Highway, Chennai' }, riskScore: 84, riskLevel: 'danger', crowdDensity: 0.30, vehicleCount: 68, congestionLevel: 0.91, incidentCount: 18, safetyScore: 16 },
    { name: 'Market Bus Stop', type: 'bus_stop', location: { lat: 13.0504, lng: 80.2137, address: 'Koyambedu Market, Chennai' }, riskScore: 55, riskLevel: 'warning', crowdDensity: 0.72, vehicleCount: 19, congestionLevel: 0.47, incidentCount: 6, safetyScore: 58 },
    { name: 'Tech Park Shuttle', type: 'bus_stop', location: { lat: 12.9352, lng: 80.2161, address: 'Sholinganallur, Chennai' }, riskScore: 18, riskLevel: 'safe', crowdDensity: 0.20, vehicleCount: 7, congestionLevel: 0.15, incidentCount: 0, safetyScore: 95 },
];

const getRandomZoneId = (ids) => ids[Math.floor(Math.random() * ids.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ptsi_db');
        console.log('✅ Connected to MongoDB');

        await Zone.deleteMany({});
        await Incident.deleteMany({});
        await Alert.deleteMany({});
        await User.deleteMany({});
        console.log('🗑️  Cleared existing data');

        const createdZones = await Zone.insertMany(zones);
        const zoneIds = createdZones.map(z => z._id);
        console.log(`✅ Seeded ${createdZones.length} zones`);

        // Seed user
        const hashed = await bcrypt.hash('Admin@1234', 10);
        await User.create({ name: 'Admin User', email: 'admin@ptsi.io', password: hashed, role: 'admin' });
        console.log('✅ Seeded admin user (admin@ptsi.io / Admin@1234)');

        // Generate 30 incidents across last 7 days
        const incidentTypes = ['overcrowding', 'aggressive_traffic', 'congestion', 'suspicious_movement', 'accident'];
        const severities = ['low', 'medium', 'high', 'critical'];
        const statuses = ['active', 'resolved', 'monitoring'];
        const incidents = [];
        for (let i = 0; i < 30; i++) {
            const zoneRef = createdZones[rand(0, createdZones.length - 1)];
            const type = incidentTypes[rand(0, incidentTypes.length - 1)];
            const severity = severities[rand(0, severities.length - 1)];
            const daysAgo = rand(0, 6);
            const hoursAgo = rand(0, 23);
            const createdAt = new Date(Date.now() - daysAgo * 86400000 - hoursAgo * 3600000);
            const riskScore = rand(30, 95);
            incidents.push({
                type, severity, zone: zoneRef._id, zoneName: zoneRef.name,
                description: `${type.replace(/_/g, ' ')} detected at ${zoneRef.name}`,
                detectionData: { peopleCount: rand(5, 80), vehicleCount: rand(0, 50), crowdDensity: parseFloat((Math.random()).toFixed(2)), movementSpeed: ['slow', 'normal', 'fast'][rand(0, 2)], riskScore },
                status: statuses[rand(0, statuses.length - 1)],
                location: { lat: zoneRef.location.lat, lng: zoneRef.location.lng },
                createdAt
            });
        }
        await Incident.insertMany(incidents);
        console.log(`✅ Seeded ${incidents.length} incidents`);

        // Generate 20 alerts
        const alerts = [];
        const alertMessages = [
            { title: '⚠️ High Crowd Density Detected', message: 'Crowd density exceeded safe threshold', severity: 'danger' },
            { title: '🚗 Vehicle Congestion Alert', message: 'Heavy congestion detected on route', severity: 'warning' },
            { title: '🔴 Unsafe Passenger Conditions', message: 'Conditions unsafe for passengers', severity: 'critical' },
            { title: '👁️ Suspicious Movement Detected', message: 'Unusual movement patterns observed', severity: 'warning' },
            { title: '✅ Zone Cleared', message: 'Previous alert zone returned to safe status', severity: 'info' },
        ];
        for (let i = 0; i < 20; i++) {
            const zoneRef = createdZones[rand(0, createdZones.length - 1)];
            const template = alertMessages[rand(0, alertMessages.length - 1)];
            const daysAgo = rand(0, 3);
            alerts.push({
                ...template,
                zoneName: zoneRef.name, zone: zoneRef._id,
                riskScore: rand(40, 95), isRead: Math.random() > 0.5,
                createdAt: new Date(Date.now() - daysAgo * 86400000 - rand(0, 23) * 3600000)
            });
        }
        await Alert.insertMany(alerts);
        console.log(`✅ Seeded ${alerts.length} alerts`);

        console.log('\n🎉 Database seeded successfully!');
        console.log('👤 Login: admin@ptsi.io / Admin@1234');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        process.exit(1);
    }
};

seedDB();
