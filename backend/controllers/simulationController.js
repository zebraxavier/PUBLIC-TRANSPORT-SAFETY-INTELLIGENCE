const { toggleSimulation, generateSimulatedIncident, isActive } = require('../simulation/simulationEngine');

exports.getStatus = (req, res) => {
    res.json({ success: true, active: isActive(), mode: isActive() ? 'running' : 'standby' });
};

exports.toggleSimulation = (req, res) => {
    const { active } = req.body;
    const state = toggleSimulation(active);
    res.json({ success: true, active: state, message: state ? 'Simulation started' : 'Simulation stopped' });
};

exports.triggerScenario = async (req, res) => {
    const { scenario } = req.params;
    const validScenarios = ['overcrowding', 'aggressive_traffic', 'sudden_congestion', 'suspicious_movement', 'vehicle_accident'];
    if (!validScenarios.includes(scenario)) {
        return res.status(400).json({ error: 'Invalid scenario. Valid: ' + validScenarios.join(', ') });
    }
    const result = await generateSimulatedIncident(scenario);
    res.json({ success: true, message: `Scenario '${scenario}' triggered`, data: result });
};
