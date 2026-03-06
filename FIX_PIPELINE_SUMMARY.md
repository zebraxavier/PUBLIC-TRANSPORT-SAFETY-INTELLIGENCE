# Camera Detection Pipeline Fix - Complete Report

## Root Causes Identified and Fixed

### 1. BUG: movement_level incorrectly set to density_level
**File**: `ai-service/cv/detector.py`
**Line**: 75
**Issue**: `movement_level` was incorrectly assigned `density_level` instead of actual movement value
**Fix**: Changed to use actual movement speed (`movement_speed`)

```python
# BEFORE (BUG):
"movement_level": density_level

# AFTER (FIXED):
"movement_level": movement_speed
```

### 2. BUG: Missing movementLevel and densityLevel in WebSocket response
**File**: `backend/server.js`
**Issue**: WebSocket metrics object was missing `movementLevel` and `densityLevel` fields
**Fix**: Added both fields to the metrics object in detectionData

```javascript
// ADDED:
movementLevel: result.metrics.movementLevel || 'LOW',
densityLevel: result.metrics.densityLevel || 'LOW'
```

### 3. BUG: Frame data format not handled properly
**File**: `ai-service/routers/detection.py`
**Issue**: Base64 frame data with data URL prefix (e.g., "data:image/jpeg;base64,...") was not being parsed correctly
**Fix**: Added logic to extract base64 data from data URL format

```python
# ADDED:
frame_str = request.frame
if ',' in frame_str:
    frame_str = frame_str.split(',')[1]
frame_data = base64.b64decode(frame_str)
```

---

## Debugging Logs Added

### Frontend (CameraAnalyzer.jsx)
- Frame capture logging
- WebSocket send/receive logging
- Detection result logging with full data structure

### Backend (cameraController.js)
- AI service call logging
- Response success logging
- Frame analysis result logging

### AI Service (detection.py)
- Frame decoding debug logging
- Detection result debug logging

---

## How to Run Detection Successfully

### Step 1: Start MongoDB (optional but recommended)
```bash
# Using Docker
docker run -d -p 27017:27017 --name ptsi-mongo mongo:7

# Or start existing container
docker start ptsi-mongo
```

### Step 2: Start AI Service
```bash
cd ai-service

# Install dependencies (if not already)
pip install -r requirements.txt

# Start the AI service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Or use the start script
python -m uvicorn main:app --reload --port 8000
```

The AI service should show:
- `[OK] YOLOv8 loaded successfully` (if ultralytics is installed)
- Or `[OK] TransportDetector initialized (simulation mode with tracking)`

### Step 3: Start Backend
```bash
cd backend

# Install dependencies (if not already)
npm install

# Start the backend
npm run dev

# Should see:
# 🚕 PTSI Backend running on http://localhost:5000
# 🔌 WebSocket server ready at ws://localhost:5000/ws
```

### Step 4: Start Frontend
```bash
cd frontend

# Install dependencies (if not already)
npm install

# Start the frontend
npm run dev
```

### Step 5: Test the Detection

1. Open browser to http://localhost:5173
2. Navigate to Live Monitoring or Dashboard
3. Click "Start Camera" button
4. Grant camera permissions when prompted
5. Watch the console for detection logs:
   - `🖼️ Frame captured:` - Frame is being captured
   - `📤 Sending frame via WebSocket:` - Frame is being sent
   - `📊 Detection received` - Detection result received
   - `✅ Analysis result updated:` - UI is being updated

### Expected Output

The UI should display:
- **Risk Score**: Number (0-100)
- **People Detected**: Count
- **Vehicles**: Count
- **Crowd Density**: Percentage
- **Movement Level**: LOW/MEDIUM/HIGH
- **Density Level**: LOW/MEDIUM/HIGH
- **Detected Objects**: List with types and counts
- **Bounding Boxes**: Overlay on video (when YOLO is available)

---

## Troubleshooting

### AI Service Not Running
If you see `[AI Service] Falling back to simulation:` in backend logs:
- Check if AI service is running on port 8000
- Verify `AI_SERVICE_URL` environment variable is set correctly

### YOLO Not Available
If you see simulation results instead of real detections:
- Install ultralytics: `pip install ultralytics`
- Download YOLO model: The service will download yolov8n.pt automatically

### WebSocket Connection Issues
If frames are sent but no detections received:
- Check browser console for WebSocket errors
- Verify backend is running and WebSocket endpoint is accessible
- Check if firewall is blocking port 5000

### No Detections at All
1. Check browser console - should see logs at each step
2. Check backend console - should see frame received and analysis logs
3. Check AI service console - should see detection logs

---

## Files Modified

1. `ai-service/cv/detector.py` - Fixed movement_level assignment
2. `ai-service/routers/detection.py` - Added base64 handling
3. `backend/server.js` - Added movementLevel/densityLevel to WebSocket
4. `backend/controllers/cameraController.js` - Added debugging logs
5. `frontend/src/components/CameraAnalyzer.jsx` - Added debugging logs

---

## Pipeline Flow (Verified)

```
Camera (React)
    ↓
getUserMedia → canvas.drawImage → toDataURL
    ↓
Frame sent via WebSocket (type: "cameraFrame")
    ↓
Backend receives frame → analyzeFrameWithAI
    ↓
Backend calls AI Service (POST /detect)
    ↓
AI Service decodes frame → runs YOLO
    ↓
Returns: people_count, vehicle_count, density_level, movement_level, risk_score
    ↓
Backend converts and sends via WebSocket (type: "camera_detection")
    ↓
Frontend receives → updates UI with detection data
```

