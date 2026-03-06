"""Prediction router - POST /predict/risk"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from models.unified_risk_engine import predict_risk

router = APIRouter()


class RiskPredictionRequest(BaseModel):
    crowd_density: float = Field(0.5, ge=0, le=1, description="Crowd density 0-1")
    vehicle_count: int = Field(10, ge=0, le=200, description="Number of vehicles")
    congestion_level: float = Field(0.3, ge=0, le=1, description="Congestion level 0-1")
    time_of_day: int = Field(12, ge=0, le=23, description="Hour of day 0-23")
    weather_condition: float = Field(0.1, ge=0, le=1, description="Weather severity 0=clear, 1=severe")
    location_type: int = Field(0, ge=0, le=4, description="0=bus_stop,1=metro,2=terminal,3=highway,4=rail")
    anomaly_score: float = Field(0.0, ge=0, le=1, description="Movement anomaly score 0-1")


@router.post("/risk")
async def predict_risk_endpoint(request: RiskPredictionRequest):
    """Predict safety risk level from contextual features."""
    try:
        result = predict_risk(
            crowd_density=request.crowd_density,
            vehicle_count=request.vehicle_count,
            congestion_level=request.congestion_level,
            time_of_day=request.time_of_day,
            weather_condition=request.weather_condition,
            location_type=request.location_type,
            anomaly_score=request.anomaly_score
        )
        return {"success": True, "prediction": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
