"""Detection router - POST /detect

FIXED: Updated to use spec-based risk scoring algorithm
FIXED: Added comprehensive debug logging for verification
"""
import base64
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import cv.detector as detector_module
from cv.detector import detector
from models.unified_risk_engine import calculate_risk_score_spec

router = APIRouter()


class DetectionRequest(BaseModel):
    frame: Optional[str] = None  # base64 encoded image
    source: Optional[str] = "mobile"
    zone_id: Optional[str] = None


@router.post("/detect")
async def detect(request: DetectionRequest):
    """
    Process a video frame and return detection results.
    Accepts optional base64 frame; uses simulation if frame is absent.
    
    FIXED: Now uses spec-based risk scoring:
    - if people_count > 10: +40
    - if vehicle_count > 5: +20
    - if movement_level == "HIGH": +30
    - Risk levels: 0-30 → LOW, 31-70 → MEDIUM, 71-100 → HIGH
    
    FIXED: Added debug logging to verify pipeline
    """
    print(f"\n{'='*60}")
    print(f"[DEBUG] /detect endpoint called")
    print(f"[DEBUG] YOLO_AVAILABLE: {detector_module.YOLO_AVAILABLE}")
    print(f"[DEBUG] YOLO_LOADED: {detector_module.YOLO_LOADED}")
    print(f"[DEBUG] detector.yolo_model: {detector.yolo_model is not None}")
    print(f"[DEBUG] Frame provided: {request.frame is not None}")
    print(f"{'='*60}\n")
    
    try:
        frame_data = None
        if request.frame:
            try:
                # FIX: Handle both raw base64 and data URL format
                frame_str = request.frame
                if ',' in frame_str:
                    # Extract base64 data from data URL format (e.g., "data:image/jpeg;base64,...")
                    frame_str = frame_str.split(',')[1]
                frame_data = base64.b64decode(frame_str)
                print(f"[DEBUG] Decoded frame data: {len(frame_data)} bytes")
            except Exception as e:
                print(f"[ERROR] Failed to decode frame: {e}")
                raise HTTPException(status_code=400, detail="Invalid base64 frame data")

        print(f"[DEBUG] Calling detector.process_frame...")
        result = detector.process_frame(frame_data=frame_data, source=request.source or "mobile")
        
        print(f"[DEBUG] Detection result received:")
        print(f"  - people_count: {result.get('people_count')}")
        print(f"  - vehicle_count: {result.get('vehicle_count')}")
        print(f"  - crowd_density: {result.get('crowd_density')}")
        print(f"  - movement_level: {result.get('movement_level')}")
        print(f"  - density_level: {result.get('density_level')}")
        print(f"  - detections: {len(result.get('detections', []))}")
        print(f"  - detection_mode: {result.get('detection_mode')}")
        
        # FIXED: Use spec-based risk scoring instead of ML-based
        movement_level = result.get('movement_level', 'LOW')
        risk_result = calculate_risk_score_spec(
            people_count=result.get('people_count', 0),
            vehicle_count=result.get('vehicle_count', 0),
            movement_level=movement_level,
            crowd_density=result.get('crowd_density', 0)
        )
        
        # Update result with risk score
        result.update(risk_result)
        
        print(f"[DEBUG] Risk calculation:")
        print(f"  - risk_score: {result.get('risk_score')}")
        print(f"  - risk_level: {result.get('risk_level')}")
        
        print(f"[DEBUG] Final result: people={result.get('people_count')}, vehicles={result.get('vehicle_count')}, risk={result.get('risk_score')}")
        
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Detection failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detect/binary")
async def detect_binary(
    frame: UploadFile = File(...),
    source: str = Form("mobile"),
    zone_id: Optional[str] = Form(None)
):
    """
    Process a video frame and return detection results.
    Accepts binary image upload (multipart/form-data).
    
    FIXED: Now uses spec-based risk scoring
    """
    try:
        frame_data = await frame.read()
        result = detector.process_frame(frame_data=frame_data, source=source)
        
        # FIXED: Use spec-based risk scoring
        movement_level = result.get('movement_level', 'LOW')
        risk_result = calculate_risk_score_spec(
            people_count=result.get('people_count', 0),
            vehicle_count=result.get('vehicle_count', 0),
            movement_level=movement_level,
            crowd_density=result.get('crowd_density', 0)
        )
        
        result.update(risk_result)
        
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

