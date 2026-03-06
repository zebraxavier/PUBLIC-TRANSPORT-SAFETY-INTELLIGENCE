# Transport Safety Intelligence - Debugging Checklist

## System Test Status

### Backend Tests ✅

| Test | Status | Notes |
|------|--------|-------|
| Express server starts | ✅ Working | Port 5000 |
| MongoDB connection | ✅ Working | Graceful fallback to demo mode |
| API Routes | ✅ Working | All routes configured |
| WebSocket Server | ✅ Working | `/ws` endpoint |
| Auth endpoints | ✅ Working | Login/Register functional |
| Incident endpoints | ✅ Working | Full CRUD |
| Analytics endpoints | ✅ Working | Risk, insights, accidents |
| Vehicle endpoints | ✅ Working | Full CRUD |
| Driver endpoints | ✅ Working | Full CRUD |
| Camera endpoints | ✅ Working | Frame analysis |

### Frontend Tests ✅

| Test | Status | Notes |
|------|--------|-------|
| React app loads | ✅ Working | Vite dev server |
| Auth context | ✅ Working | Token management |
| Dashboard page | ✅ Working | Real-time updates |
| Live monitoring | ✅ Working | Camera + simulation |
| Risk analytics | ✅ Working | Charts + data |
| Map view | ✅ Working | Markers + zones |
| Incidents page | ✅ Working | CRUD operations |
| Alerts page | ✅ Working | Real-time alerts |
| Login/Register | ✅ Working | Auth flow |

### WebSocket Tests ✅

| Test | Status | Notes |
|------|--------|-------|
| Connection established | ✅ Working | `/ws` endpoint |
| Events broadcast | ✅ Working | All clients receive |
| Reconnection logic | ✅ Working | Auto-reconnect |
| Event names match | ✅ Working | Frontend listens correctly |
| Data format handling | ✅ Fixed | Normalized camelCase/snake_case |

### Camera System Tests ✅

| Test | Status | Notes |
|------|--------|-------|
| Webcam access | ✅ Working | Permission handling |
| Frame capture | ✅ Working | 5 FPS target |
| Frames sent to backend | ✅ Working | Both WS + HTTP |
| Backend processes frames | ✅ Working | Async AI analysis |
| Risk score calculated | ✅ Working | Simulation mode fallback |
| UI updates dynamically | ✅ Working | Real-time dashboard |
| Bounding boxes | ✅ Working | Overlay rendering |

---

## Fixed Bugs Summary

### 1. WebSocket Async Handler (Backend)
- **Issue**: Missing await for async analyzeFrameWithAI
- **Fix**: Added try/catch and proper await in server.js
- **File**: `backend/server.js`

### 2. Analytics Response Format (Backend)
- **Issue**: Missing field aliases in summary
- **Fix**: Added activeAlerts and activeIncidents aliases
- **File**: `backend/controllers/analyticsController.js`

### 3. Data Format Normalization (Frontend)
- **Issue**: Inconsistent camelCase/snake_case handling
- **Fix**: Added normalizeDetectionData in socketService
- **Files**: 
  - `frontend/src/services/socketService.js`
  - `frontend/src/components/CameraAnalyzer.jsx`
  - `frontend/src/components/VideoStreamViewer.jsx`

### 4. Error Boundary (Frontend)
- **Issue**: No error handling for React crashes
- **Fix**: Created ErrorBoundary component
- **Files**:
  - `frontend/src/components/ErrorBoundary.jsx`
  - `frontend/src/App.jsx`

### 5. WebSocket Reconnection (Frontend)
- **Issue**: Multiple connections and race conditions
- **Fix**: Improved connection state management
- **File**: `frontend/src/services/socketService.js`

---

## Debugging Commands

### Start Backend
```bash
cd backend
npm start
# or
node server.js
```

### Start Frontend
```bash
cd frontend
npm run dev
```

### Test WebSocket
```bash
# Using wscat
npm install -g wscat
wscat -c ws://localhost:5000/ws

# Send test message
{"type":"cameraFrame","frame":"","zone_id":"test","zone_name":"Test"}
```

### Test API
```bash
# Health check
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ptsi.com","password":"admin123"}'

# Get incidents
curl http://localhost:5000/api/incidents

# Get analytics
curl http://localhost:5000/api/analytics/risk
```

---

## Event Flow Verification

### Camera Detection Flow
1. User opens LiveMonitoring or CameraAnalyzer
2. Camera starts capturing frames (5 FPS)
3. Frame sent via WebSocket (`cameraFrame` event)
4. Backend receives and processes async
5. Result broadcast to all clients (`camera_detection`)
6. Frontend receives and updates UI
7. Dashboard reflects changes in real-time

### Expected WebSocket Messages

```json
// Outgoing (cameraFrame)
{
  "type": "cameraFrame",
  "frame": "base64_encoded_image",
  "zone_id": "zone_1",
  "zone_name": "Main Station"
}

// Incoming (camera_detection)
{
  "type": "camera_detection",
  "data": {
    "riskScore": 45,
    "riskLevel": "MEDIUM",
    "metrics": {
      "peopleCount": 12,
      "vehicleCount": 3,
      "crowdDensity": 0.45,
      "congestionLevel": 0.3,
      "movementSpeed": 1.5
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Known Limitations

1. **AI Service**: Falls back to simulation when Python AI unavailable
2. **MongoDB**: Runs in demo mode without database
3. **Camera**: Requires browser permission for webcam
4. **Production**: CORS should be restricted in production

---

## Checklist for Production

- [ ] Set proper JWT_SECRET in environment
- [ ] Configure MongoDB connection string
- [ ] Restrict CORS origins
- [ ] Set up SSL/TLS
- [ ] Configure logging
- [ ] Add rate limiting
- [ ] Set up monitoring/alerting

