const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const Zone = require('../models/Zone');

let simulationActive = false;
let simulationInterval = null;

const INCIDENT_TYPES = ['overcrowding', 'aggressive_traffic', 'sudden_congestion', 'suspicious_movement', 'vehicle_accident'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const ZONE_NAMES = ['Central Bus Terminal', 'Metro Station Alpha', 'Railway Hub', 'Airport Connector', 'Northern Crosswalk'];

function randomBetween(min, max) { return Math.random() * (max - min) + min; }
function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function generateSimulatedIncident(scenario = null) {
    const type = scenario || randomChoice(INCIDENT_TYPES);
    const zoneName = randomChoice(ZONE_NAMES);
    const severity = type === 'overcrowding' ? 'high' : randomChoice(SEVERITIES);
    const crowd_density = type === 'overcrowding' ? randomBetween(0.75, 1) : randomBetween(0.2, 0.75);
    const vehicle_count = type === 'aggressive_traffic' ? Math.floor(randomBetween(40, 80)) : Math.floor(randomBetween(5, 40));
    const risk_score = Math.round(0.4 * crowd_density * 100 + 0.3 * (vehicle_count / 80) * 100 + 0.2 * randomBetween(20, 80) + 0.1 * randomBetween(0, 30));

    const incident = new Incident({
        zone_name: zoneName,
        type, severity, crowd_density, vehicle_count, risk_score,
        description: getDescription(type, zoneName),
        latitude: 12.9716 + randomBetween(-0.05, 0.05),
        longitude: 77.5946 + randomBetween(-0.05, 0.05),
        simulated: true
    });

    try { await incident.save(); } catch { /* running in demo mode */ }

    const alert = new Alert({
        title: alertTitle(type),
        message: getDescription(type, zoneName),
        severity: risk_score >= 70 ? 'critical' : risk_score >= 50 ? 'danger' : 'warning',
        zone_name: zoneName,
        simulated: true
    });

    try { await alert.save(); } catch { /* running in demo mode */ }

    if (global.broadcast) {
        global.broadcast({ type: 'new_incident', data: incident, alert });
        global.broadcast({ type: 'new_alert', data: alert });
        global.broadcast({ type: 'simulation_event', payload: { type, zoneName, risk_score, severity } });
    }

    return { incident, alert };
}

function getDescription(type, zone) {
    const descriptions = {
        overcrowding: `High crowd density detected at ${zone}. Immediate crowd management required.`,
        aggressive_traffic: `Aggressive vehicle movement detected near ${zone}. Traffic control alert.`,
        sudden_congestion: `Sudden traffic congestion at ${zone}. Route diversion recommended.`,
        suspicious_movement: `Suspicious movement pattern detected at ${zone}. Security team notified.`,
        vehicle_accident: `Vehicle incident reported at ${zone}. Emergency services dispatched.`,
        unauthorized_access: `Unauthorized access attempt detected at ${zone}. Security alert.`
    };
    return descriptions[type] || `Safety event at ${zone}`;
}

function alertTitle(type) {
    const titles = {
        overcrowding: '🚨 High Crowd Density Detected',
        aggressive_traffic: '🚗 Aggressive Traffic Pattern',
        sudden_congestion: '🔴 Sudden Congestion Alert',
        suspicious_movement: '👁️ Suspicious Activity',
        vehicle_accident: '⚠️ Vehicle Incident Reported',
        unauthorized_access: '🔒 Unauthorized Access Alert'
    };
    return titles[type] || '⚠️ Safety Alert';
}

function startSimulation() {
    console.log('🎮 Simulation engine initialized (standby mode)');
    // Auto-start periodic zone risk fluctuations
    setInterval(() => {
        if (global.broadcast) {
            const zones = ZONE_NAMES.map(name => ({
                name,
                risk_score: Math.round(randomBetween(10, 85)),
                crowd_density: parseFloat(randomBetween(0.1, 0.95).toFixed(2))
            }));
            global.broadcast({ type: 'zone_risk_update', data: zones });
        }
    }, 8000);
}

function toggleSimulation(active) {
    if (active && !simulationActive) {
        simulationActive = true;
        simulationInterval = setInterval(async () => {
            await generateSimulatedIncident();
        }, 12000);
        console.log('▶️  Simulation started');
    } else if (!active && simulationActive) {
        simulationActive = false;
        clearInterval(simulationInterval);
        simulationInterval = null;
        console.log('⏹️  Simulation stopped');
    }
    return simulationActive;
}

module.exports = { startSimulation, toggleSimulation, generateSimulatedIncident, isActive: () => simulationActive };
