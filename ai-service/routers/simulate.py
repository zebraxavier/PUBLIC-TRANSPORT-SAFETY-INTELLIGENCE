"""Simulation router - POST /simulate/scenario"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from models.risk_model import predict_risk
from datetime import datetime

router = APIRouter()

SCENARIOS = {
    "overcrowding": {
        "people_count": 88, "vehicle_count": 8, "crowd_density": 0.94,
        "movement_speed": "very_slow", "congestion_level": 0.72,
        "description": "Extreme crowd density detected. Passenger safety at risk.",
        "alert_title": "🚨 Overcrowding Emergency"
    },
    "traffic_surge": {
        "people_count": 22, "vehicle_count": 52, "crowd_density": 0.28,
        "movement_speed": "fast", "congestion_level": 0.91,
        "description": "Aggressive vehicle traffic detected. Route congestion critical.",
        "alert_title": "🚗 Traffic Surge Alert"
    },
    "suspicious_movement": {
        "people_count": 14, "vehicle_count": 2, "crowd_density": 0.25,
        "movement_speed": "erratic", "congestion_level": 0.18,
        "description": "Unusual movement patterns detected. Possible security concern.",
        "alert_title": "👁️ Suspicious Activity"
    },
    "congestion": {
        "people_count": 55, "vehicle_count": 35, "crowd_density": 0.68,
        "movement_speed": "slow", "congestion_level": 0.79,
        "description": "Combined crowd and vehicle congestion at transport node.",
        "alert_title": "⚠️ Severe Congestion"
    },
    "emergency": {
        "people_count": 45, "vehicle_count": 5, "crowd_density": 0.58,
        "movement_speed": "fast", "congestion_level": 0.35,
        "description": "Emergency evacuation movement patterns detected.",
        "alert_title": "🆘 Emergency Evacuation"
    },
    "normal": {
        "people_count": 12, "vehicle_count": 4, "crowd_density": 0.18,
        "movement_speed": "normal", "congestion_level": 0.12,
        "description": "Normal transport activity. No safety concerns.",
        "alert_title": "✅ All Clear"
    }
}


class SimulationRequest(BaseModel):
    scenario: str = "overcrowding"
    zone_name: Optional[str] = "Unknown Zone"
    time_of_day: Optional[int] = None


@router.post("/scenario")
async def simulate_scenario(request: SimulationRequest):
    """Trigger a named simulation scenario and return detection + risk data."""
    if request.scenario not in SCENARIOS:
        available = list(SCENARIOS.keys())
        raise HTTPException(status_code=400, detail=f"Unknown scenario. Available: {available}")

    scenario_data = SCENARIOS[request.scenario].copy()
    hour = request.time_of_day or datetime.now().hour

    risk_result = predict_risk(
        crowd_density=scenario_data["crowd_density"],
        vehicle_count=scenario_data["vehicle_count"],
        congestion_level=scenario_data["congestion_level"],
        time_of_day=hour,
        weather_condition=0.2,
        location_type=0
    )

    return {
        "success": True,
        "scenario": request.scenario,
        "zone_name": request.zone_name,
        "detection": {
            "people_count": scenario_data["people_count"],
            "vehicle_count": scenario_data["vehicle_count"],
            "crowd_density": scenario_data["crowd_density"],
            "movement_speed": scenario_data["movement_speed"],
            "congestion_level": scenario_data["congestion_level"],
            "timestamp": datetime.utcnow().isoformat(),
        },
        "risk": risk_result,
        "alert": {
            "title": scenario_data["alert_title"],
            "message": scenario_data["description"],
            "severity": "critical" if risk_result["risk_score"] >= 70 else "warning"
        },
        "available_scenarios": list(SCENARIOS.keys())
    }


@router.get("/scenarios")
async def list_scenarios():
    """List all available simulation scenarios."""
    return {
        "scenarios": [
            {"id": k, "title": v["alert_title"], "description": v["description"]}
            for k, v in SCENARIOS.items()
        ]
    }
