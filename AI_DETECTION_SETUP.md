# AI Detection Pipeline Setup Guide

## Overview
This guide explains how to set up and run the AI-powered camera detection system with YOLOv8.

## Prerequisites

### System Requirements
- Node.js 18+
- Python 3.8+
- Webcam or camera input

### Install Python Dependencies

```bash
cd ai-service
pip install -r requirements.txt
```

This will install:
- `ultralytics>=8.0.0` - YOLOv8 for object detection
- `opencv-python-headless>=4.8.0` - Image processing
- Other dependencies (fastapi, numpy, etc.)

### Install Node Dependencies

```bash
cd backend
npm install
```

## Running the Services

### Option 1: Run All Services Manually

1. **Start MongoDB** (if not using Docker):
```bash
mongod
```

2. **Start AI Service**:
```bash
cd ai-service
python main.py
```
The AI service will start on `http://localhost:8000`

3. **Start Backend**:
```bash
cd backend
npm start
```
The backend will start on `http://localhost:5000`

4. **Start Frontend**:
```bash
cd frontend
npm run dev
```

### Option 2: Use Docker

```bash
docker-compose up
```

## Configuration

### Environment Variables

**Backend** (`.env`):
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ptsi_db
AI_SERVICE_URL=http://localhost:8000
```

**AI Service** (`.env`):
```
PORT=8000
```

## How It Works

### 1. Frame Capture
- Frontend captures video frames from webcam
- Frames are resized to 320x240 for performance
- Frames are compressed as JPEG (0.6 quality)

### 2. Frame Transmission
- Frames are sent via WebSocket to backend
- Backend forwards to AI service via HTTP POST

### 3. AI Detection
- YOLOv8 processes the frame
- Detects: person, car, bus, truck, motorcycle, bicycle
- Returns bounding boxes with confidence scores

### 4. Risk Calculation
- AI service calculates risk score using ML model
- Risk factors: crowd density, vehicle count, congestion, anomaly score

### 5. Results Display
- Backend broadcasts results via WebSocket
- Frontend updates UI with risk score and detected objects
- Bounding boxes are drawn on video overlay

## Expected Output

### Console Logs

**AI Service**:
```
[OK] YOLOv8 loaded successfully from yolov8n.pt
[YOLO] Detected 5 objects
```

**Backend**:
```
📸 Camera frame received via WebSocket
✅ Frame analyzed, risk score: 45 mode: yolo
📡 Broadcasting camera_detection event: 45
```

### Frontend Display
- Risk Score: 0-100
- Risk Level: LOW / MEDIUM / HIGH
- Detected Objects: person, car, bus, truck, etc.
- Bounding boxes with labels on video

## Troubleshooting

### YOLO Model Not Loading
If you see `[WARNING] Ultralytics not installed`, run:
```bash
pip install ultralytics
```

### AI Service Not Responding
Check if AI service is running:
```bash
curl http://localhost:8000/health
```

### WebSocket Connection Failed
Ensure backend is running and CORS is enabled.

## Performance Tips

1. **Frame Rate**: Configured for 5 FPS (200ms interval)
2. **Frame Size**: 320x240 for faster processing
3. **JPEG Quality**: 0.6 for bandwidth optimization

## Fallback Mode

If the AI service is unavailable, the system automatically falls back to simulation mode with random detections. This ensures the system remains functional during maintenance or failures.

