# Camera Detection Pipeline - Setup Instructions

## Overview

This document provides setup instructions for the fully functional camera detection pipeline that detects:
- **People** (person)
- **Vehicles** (car, bus, truck, motorcycle, bicycle)
- **Crowd Density** (LOW, MEDIUM, HIGH)
- **Movement Level** (LOW, MEDIUM, HIGH)
- **Risk Score** (0-100)

## Architecture

```
Camera → React Frame Capture (Canvas) → WebSocket → Backend → AI Service (YOLOv8)
                                                                          ↓
Frontend Dashboard ← WebSocket ← Risk Score + Detection Results ←─────────┘
```

## Prerequisites

### System Requirements
- Node.js 18+ 
- Python 3.9+
- Webcam or camera device

### Required Services
1. **MongoDB** (optional - runs in demo mode without it)
2. **Redis** (optional - runs in demo mode without it)

## Installation Steps

### Step 1: Install Python Dependencies

```bash
cd ai-service
pip install -r requirements.txt
```

This will install:
- ultralytics (YOLOv8)
- opencv-python
- fastapi
- uvicorn
- numpy
- scikit-learn

### Step 2: Install Node.js Dependencies

```bash
cd backend
npm install
```

### Step 3: Install Frontend Dependencies

```bash
cd frontend
npm install
```

## Running the System

### Option 1: Run All Services Manually

**Terminal 1 - AI Service (Python):**
```bash
cd ai-service
python main.py
```
Or with uvicorn:
```bash
cd ai-service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Backend (Node.js):**
```bash
cd backend
npm start
# or
node server.js
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

### Option 2: Use Provided Scripts

**Windows:**
```bash
start_all.bat
```

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

## Testing the Detection Pipeline

### 1. Test AI Service Health
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "ok", "service": "PTSI AI Service", "version": "1.0.0"}
```

### 2. Test Detection Endpoint
```bash
curl -X POST http://localhost:8000/detect \
  -H "Content-Type: application/json" \
  -d '{"frame": "<base64_image_data>"}'
```

### 3. Test Backend Health
```bash
curl http://localhost:5000/health
```

### 4. Test Frontend
Open browser: http://localhost:5173

Navigate to Live Monitoring page and click "Start Camera"

## Detection Algorithm

### Object Detection (YOLOv8)
- **Classes Detected**: person, car, bus, truck, motorcycle, bicycle
- **Confidence Threshold**: 0.45
- **Detection Mode**: Real YOLO or Simulation fallback

### Crowd Density Levels
- **LOW**: 0-3 people
- **MEDIUM**: 4-10 people
- **HIGH**: >10 people

### Movement Levels
- **LOW**: <15% pixel change between frames
- **MEDIUM**: 15-50% pixel change
- **HIGH**: >50% pixel change

### Risk Score Calculation
```
if people_count > 10: +40
if vehicle_count > 5: +20  
if movement_level == "HIGH": +30

Risk Levels:
- 0-30: LOW
- 31-70: MEDIUM
- 71-100: HIGH
```

## Data Format

### Detection Result Structure
```javascript
{
  riskScore: number,          // 0-100
  riskLevel: "LOW|MEDIUM|HIGH",
  detectedObjects: [
    { type: "person", count: 5 },
    { type: "car", count: 2 }
  ],
  metrics: {
    peopleCount: number,
    vehicleCount: number,
    crowdDensity: number,     // 0.0-1.0
    movementSpeed: string,
    movementLevel: "LOW|MEDIUM|HIGH",
    densityLevel: "LOW|MEDIUM|HIGH"
  },
  rawDetections: [
    {
      class: "person",
      confidence: 0.87,
      bbox: [x1, y1, x2, y2]
    }
  ],
  detectionMode: "yolo|simulation"
}
```

## Troubleshooting

### Issue: YOLO not loading
**Solution**: Ensure ultralytics is installed
```bash
pip install ultralytics
```

### Issue: Camera not accessible
**Solution**: Grant camera permissions in browser

### Issue: WebSocket connection failed
**Solution**: Ensure backend is running on port 5000

### Issue: AI service not responding
**Solution**: Check if port 8000 is available
```bash
netstat -an | grep 8000
```

### Issue: Simulation mode always active
**Solution**: This is expected if no frame is sent. Send actual camera frames to activate YOLO detection.

## Performance Tips

1. **Frame Rate**: Target 3-5 FPS for optimal performance
2. **Frame Size**: 320x240 recommended for processing
3. **Quality**: 0.6 (60%) JPEG compression reduces bandwidth

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/detect` | POST | Analyze base64 frame |
| `/detect/binary` | POST | Analyze multipart image |
| `/health` | GET | Service health check |

## Support

For issues and questions, refer to:
- DEBUGGING_CHECKLIST.md
- BUG_REPORT.md
- WEBSOCKET_DEBUGGING_CHECKLIST.md

