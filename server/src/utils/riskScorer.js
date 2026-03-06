/**
 * Risk Score Formula:
 * Risk = 0.4 * crowd_density + 0.3 * vehicle_count_normalized + 0.2 * congestion_level + 0.1 * incident_history_normalized
 *
 * Output: 0-100 risk score, categorized as safe/warning/danger
 */

const calculateRiskScore = ({ crowdDensity = 0, vehicleCount = 0, congestionLevel = 0, incidentHistory = 0 }) => {
    // Normalize vehicle count (assume max ~50 vehicles)
    const vehicleNorm = Math.min(vehicleCount / 50, 1);
    // Normalize incident history (assume max ~20 per period)
    const incidentNorm = Math.min(incidentHistory / 20, 1);

    const score = (
        0.4 * Math.min(crowdDensity, 1) +
        0.3 * vehicleNorm +
        0.2 * Math.min(congestionLevel, 1) +
        0.1 * incidentNorm
    ) * 100;

    const riskScore = Math.round(Math.min(score, 100));

    let riskLevel;
    if (riskScore < 35) riskLevel = 'safe';
    else if (riskScore < 65) riskLevel = 'warning';
    else riskLevel = 'danger';

    return { riskScore, riskLevel };
};

module.exports = { calculateRiskScore };
