# Camera Detection Pipeline Diagnosis Report

## Pipeline Overview
```
Frontend (CameraAnalyzer.jsx)
    ↓ WebSocket: cameraFrame
Backend (server.js) 
    ↓ HTTP POST: /detect
AI Service (detection.py)
    ↓
detector.py (YOLO/simulation)
    ↓
Risk Engine (unified_risk_engine.py)
    ↓
Backend broadcasts: camera_detection
    ↓
Frontend updates UI
```

## Root Cause Analysis

### Issue #1: YOLO Model Loading Failure (PRIMARY)
- Location: `ai-service/cv/detector.py`
- The detector tries to load `yolov8n.pt` but if the file doesn't exist, it silently falls back to simulation
- No explicit error message shown to indicate YOLO is not loaded
- The `YOLO_AVAILABLE` flag only checks if the import works, not if the model loads

### Issue #2: Silent Simulation Fallback
- Location: `detector.py` - `_run_yolo_detection()` method
- When YOLO fails, it returns `_simulate_yolo_detection()` without proper error logging
- Simulation returns random detections which appear to "work" but aren't real

### Issue #3: Movement Detection Not Working
- Location: `detector.py` - `_detect_movement()` method
- Movement detection requires sequential frames to compare
- First frame always returns LOW movement (no previous frame to compare)
- If frame decoding fails, returns simulated movement

### Issue #4: Risk Score Always Low
- Location: `unified_risk_engine.py` - `calculate_risk_score_spec()`
- The spec-based scoring only adds points for extreme cases:
  - +40 if people > 10
  - +20 if vehicles > 5
  - +30 if movement is HIGH
- With simulation generating random values, most scores stay LOW

## Key Findings from Code Review

### Working Components:
1. ✅ Frontend frame capture works correctly
2. ✅ WebSocket communication is properly structured
3. ✅ Backend forwards frames to AI service
4. ✅ Risk engine calculation logic is correct
5. ✅ Frontend event handling for camera_detection

### Broken Components:
1. ❌ YOLO model loading - may fail silently
2. ❌ Real object detection - falls back to random simulation
3. ❌ Movement detection - not working between frames

## Fix Plan

### Step 1: Fix AI Service Detection (detector.py)
- Add explicit YOLO loading verification
- Add proper error logging when YOLO fails
- Force real detection mode instead of simulation
- Fix movement detection to work properly

### Step 2: Add Debug Verification Logs
- Add console.log at each pipeline stage
- Verify frame data flows correctly
- Confirm YOLO is actually running

### Step 3: Ensure Proper Response Format
- Verify all required fields are in response
- Add density_level and movement_level explicitly

## Expected Results After Fix:
1. Console shows "YOLO loaded successfully" on startup
2. Real detections appear when people/vehicles in camera
3. People count updates (0-60+ based on actual detections)
4. Vehicle count updates (0-40+ based on actual detections)
5. Density level changes (LOW/MEDIUM/HIGH based on people count)
6. Movement level changes (LOW/MEDIUM/HIGH based on frame differences)
7. Risk score changes based on actual counts

