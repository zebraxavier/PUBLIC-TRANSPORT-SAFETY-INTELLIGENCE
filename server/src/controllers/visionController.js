const axios = require('axios');
const mongoose = require('mongoose');
const { calculateRiskScore } = require('../utils/riskScorer');
const { broadcastDetection, broadcastAlert, broadcastRiskUpdate } = require('../utils/wsManager');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const Zone = require('../models/Zone');

const isDbConnected = () => mongoose.connection.readyState === 1;

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// POST /api/vision/detection
const receiveDetection = async (req, res, next) => {
    try {
        const { zoneId, frameData, source = 'mobile' } = req.body;
        let detectionResult;

        // Try to call Python AI service, fall back to simulation
        try {
            const aiResponse = await axios.post(`${AI_SERVICE_URL}/detect`, { frame: frameData, source }, { timeout: 5000 });
            detectionResult = aiResponse.data;
        } catch {
            // Simulate detection result
            detectionResult = simulateDetection();
        }

        const { riskScore, riskLevel } = calculateRiskScore({
            crowdDensity: detectionResult.crowd_density,
            vehicleCount: detectionResult.vehicle_count,
            congestionLevel: detectionResult.congestion_level || 0.3,
            incidentHistory: 3
        });

        detectionResult.riskScore = riskScore;
        detectionResult.riskLevel = riskLevel;

        // Update zone if provided
        let zone = null;
        if (zoneId) {
            zone = await Zone.findByIdAndUpdate(zoneId, {
                crowdDensity: detectionResult.crowd_density,
                vehicleCount: detectionResult.vehicle_count,
                riskScore,
                riskLevel,
                lastUpdated: new Date()
            }, { new: true });
        }

        // Broadcast detection to all WS clients
        broadcastDetection({ ...detectionResult, zoneId, zoneName: zone?.name });
        broadcastRiskUpdate(zone?.name || 'Unknown Zone', { riskScore, riskLevel });

        // Auto-create incident + alert on high risk
        if (riskScore >= 65) {
            const incidentType = detectionResult.crowd_density > 0.7 ? 'overcrowding' :
                detectionResult.vehicle_count > 20 ? 'aggressive_traffic' : 'congestion';

            const incident = await Incident.create({
                type: incidentType,
                severity: riskScore >= 80 ? 'critical' : 'high',
                zone: zoneId || undefined,
                zoneName: zone?.name || 'Unknown Zone',
                description: `Auto-detected: ${incidentType.replace('_', ' ')} with risk score ${riskScore}`,
                detectionData: {
                    peopleCount: detectionResult.people_count,
                    vehicleCount: detectionResult.vehicle_count,
                    crowdDensity: detectionResult.crowd_density,
                    movementSpeed: detectionResult.movement_speed,
                    riskScore
                },
                location: zone ? { lat: zone.location.lat, lng: zone.location.lng } : undefined
            });

            const alert = await Alert.create({
                title: `⚠️ High Risk Detected`,
                message: `${incidentType.replace(/_/g, ' ').toUpperCase()} at ${zone?.name || 'Unknown Zone'}. Risk Score: ${riskScore}`,
                severity: riskScore >= 80 ? 'critical' : 'danger',
                zone: zoneId || undefined,
                zoneName: zone?.name || 'Unknown Zone',
                incident: incident._id,
                riskScore
            });

            broadcastAlert(alert);
        }

        res.json({ success: true, detection: detectionResult, riskScore, riskLevel });
    } catch (err) { next(err); }
};

// POST /api/vision/simulate
const simulateScenario = async (req, res, next) => {
    try {
        const { scenario = 'overcrowding', zoneId } = req.body;
        let detectionResult;

        try {
            const aiResponse = await axios.post(`${AI_SERVICE_URL}/simulate/scenario`, { scenario }, { timeout: 5000 });
            detectionResult = aiResponse.data;
        } catch {
            detectionResult = getScenarioSimulation(scenario);
        }

        const { riskScore, riskLevel } = calculateRiskScore({
            crowdDensity: detectionResult.crowd_density,
            vehicleCount: detectionResult.vehicle_count,
            congestionLevel: detectionResult.congestion_level || 0.5,
            incidentHistory: 5
        });

        detectionResult.riskScore = riskScore;
        detectionResult.riskLevel = riskLevel;

        // Broadcast via WebSocket regardless of DB state
        broadcastDetection(detectionResult);

        // DB operations — skip gracefully if not connected
        let incidentId = null;
        let zone = null;

        if (isDbConnected()) {
            zone = zoneId ? await Zone.findByIdAndUpdate(zoneId, { riskScore, riskLevel, lastUpdated: new Date() }, { new: true }) : null;

            const incidentType = scenario === 'traffic_surge' ? 'aggressive_traffic' : scenario === 'suspicious_movement' ? 'suspicious_movement' : 'overcrowding';
            const incident = await Incident.create({
                type: incidentType,
                severity: riskScore >= 70 ? 'high' : 'medium',
                zone: zoneId || undefined,
                zoneName: zone?.name || 'Simulated Zone',
                description: `SIMULATION: ${scenario} scenario triggered manually`,
                detectionData: { peopleCount: detectionResult.people_count, vehicleCount: detectionResult.vehicle_count, crowdDensity: detectionResult.crowd_density, riskScore },
            });
            incidentId = incident._id;

            const alert = await Alert.create({
                title: `🔴 Simulation: ${scenario.replace(/_/g, ' ')}`,
                message: `Simulated ${scenario.replace(/_/g, ' ')} event. Risk Score: ${riskScore}`,
                severity: 'danger',
                zoneName: zone?.name || 'Simulated Zone',
                incident: incidentId,
                riskScore,
                metadata: { simulated: true, scenario }
            });
            broadcastAlert(alert);
        } else {
            // Demo mode — broadcast a synthetic alert
            const demoAlert = {
                _id: Date.now().toString(),
                title: `🔴 Simulation: ${scenario.replace(/_/g, ' ')}`,
                message: `Simulated ${scenario.replace(/_/g, ' ')} event. Risk Score: ${riskScore}`,
                severity: 'danger',
                zoneName: zone?.name || 'Demo Zone',
                riskScore
            };
            broadcastAlert(demoAlert);
        }

        res.json({ success: true, scenario, detection: detectionResult, riskScore, riskLevel, incident: incidentId });
    } catch (err) { next(err); }
};

const simulateDetection = () => ({
    people_count: Math.floor(Math.random() * 40) + 5,
    vehicle_count: Math.floor(Math.random() * 15),
    crowd_density: parseFloat((Math.random() * 0.8).toFixed(2)),
    movement_speed: ['slow', 'normal', 'fast'][Math.floor(Math.random() * 3)],
    congestion_level: parseFloat((Math.random() * 0.6).toFixed(2)),
});

const getScenarioSimulation = (scenario) => {
    const scenarios = {
        overcrowding: { people_count: 85, vehicle_count: 8, crowd_density: 0.92, movement_speed: 'slow', congestion_level: 0.75 },
        traffic_surge: { people_count: 20, vehicle_count: 45, crowd_density: 0.35, movement_speed: 'fast', congestion_level: 0.88 },
        suspicious_movement: { people_count: 12, vehicle_count: 3, crowd_density: 0.28, movement_speed: 'erratic', congestion_level: 0.2 },
        normal: { people_count: 15, vehicle_count: 5, crowd_density: 0.22, movement_speed: 'normal', congestion_level: 0.15 },
    };
    return scenarios[scenario] || scenarios.overcrowding;
};

module.exports = { receiveDetection, simulateScenario };
