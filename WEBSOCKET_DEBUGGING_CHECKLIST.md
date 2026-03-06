# WebSocket Real-Time Update Debugging Checklist

## Issues Fixed

### 1. Backend Event Broadcasting ✅ FIXED

#### cameraController.js
- **Problem**: Only broadcasted `camera_alert` when alert triggered, not regular detection results
- **Fix**: Added `camera_detection` event broadcast on every analysis call
- **Event Structure**:
```javascript
{
    type: 'camera_detection',
    data: {
        riskScore: number,
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
        detectedObjects: [{ type: string, count: number }],
        metrics: {
            peopleCount: number,
            vehicleCount: number,
            crowdDensity: number,
            congestionLevel: number,
            movementSpeed: number
        },
        zoneId: string,
        zoneName: string,
        timestamp: Date
    }
}
```

#### analyticsController.js
- **Problem**: Did NOT broadcast dashboard/analytics updates
- **Fix**: Added `dashboardUpdate` event broadcast on every analytics request
- **Event Structure**:
```javascript
{
    type: 'dashboardUpdate',
    data: {
        summary: {
            totalIncidents: number,
            totalAlerts: number,
            activeAlerts: number,
            highRiskZones: number,
            avgRiskScore: number
        },
        highRiskZones: number,
        recentIncidents: Incident[],
        timestamp: string
    }
}
```

#### incidentController.js
- **Problem**: Only broadcast `new_incident`, missing `new_alert` and `mapIncident`
- **Fix**: Added additional broadcasts for `new_alert` and `mapIncident`
- **Event Structure**:
```javascript
{
    type: 'mapIncident',
    data: {
        id: string,
        type: string,
        severity: string,
        latitude: number,
        longitude: number,
        zone_name: string,
        description: string,
        timestamp: Date
    }
}
```

### 2. Frontend Message Handling ✅ FIXED

#### useWebSocket.js
- **Problem**: Data field name mismatches and missing event handlers
- **Fixes**:
  - Added `normalizeDetectionData()` function to handle camelCase/snake_case differences
  - Added handlers for all event types: `camera_detection`, `dashboardUpdate`, `mapIncident`
  - Added new state exports: `dashboardStats`, `liveZoneUpdate`
  - Added comprehensive debug logging

#### Field Normalization
```javascript
// Backend sends: riskScore, peopleCount, vehicleCount, crowdDensity in metrics object
// Frontend expects: risk_score, people_count, vehicle_count, crowd_density (snake_case)

// normalizeDetectionData() converts:
{
    riskScore: 75,
    metrics: { peopleCount: 25, vehicleCount: 10, crowdDensity: 0.5 }
}
// To:
{
    risk_score: 75,
    people_count: 25,
    vehicle_count: 10,
    crowd_density: 0.5
}
```

### 3. React Component Updates ✅ FIXED

#### Dashboard.jsx
- **Problem**: Didn't use correct field names or handle dashboardStats
- **Fix**:
  - Added `dashboardStats` and `liveZoneUpdate` from useWebSocket
  - Added useEffect to update KPIs from dashboardStats WebSocket event
  - Added fallback for both `riskScore` and `risk_score` fields

#### TransportMap.jsx
- **Problem**: Using wrong WebSocket property (`lastRiskUpdate` instead of `liveZoneUpdate`)
- **Fix**: Changed to use `liveZoneUpdate` for map marker updates

## Event Flow Summary

| Event Type | Trigger | Broadcasts | Frontend Handler |
|------------|---------|------------|------------------|
| `camera_detection` | Camera frame analyzed | cameraController.js | useWebSocket.js |
| `camera_alert` | High risk detected | cameraController.js | useWebSocket.js |
| `dashboardUpdate` | Analytics requested | analyticsController.js | useWebSocket.js → Dashboard.jsx |
| `new_incident` | Incident created | incidentController.js | useWebSocket.js → AlertPanel.jsx |
| `new_alert` | Alert created | incidentController.js, alertController.js | useWebSocket.js |
| `mapIncident` | Incident created | incidentController.js | useWebSocket.js → MapView.jsx |
| `zone_risk_update` | Simulation runs | simulationEngine.js | useWebSocket.js → MapView.jsx |
| `simulation_event` | Simulation runs | simulationEngine.js | useWebSocket.js |

## Testing Checklist

### Backend Testing
- [ ] Start backend server: `cd backend && node server.js`
- [ ] Check WebSocket connection: Should see "🔌 WebSocket server ready"
- [ ] Test camera analysis: POST /api/camera/analyze
- [ ] Check console for: "📡 Broadcasting camera_detection event"
- [ ] Test analytics: GET /api/analytics/risk
- [ ] Check console for: "📡 Broadcasting dashboardUpdate event"
- [ ] Test incident creation: POST /api/incidents
- [ ] Check console for: "📡 Broadcasting new_incident, new_alert, and mapIncident events"

### Frontend Testing
- [ ] Start frontend: `cd frontend && npm run dev`
- [ ] Open browser DevTools Console
- [ ] Navigate to Dashboard - should see "✅ WebSocket connected successfully!"
- [ ] Wait for simulation events - should see "📡 Zone risk update" logs
- [ ] Check Live Detection Feed updates with people/vehicle counts
- [ ] Navigate to Transport Map - should see map markers update
- [ ] Create incident - should see alert appear in real-time

### Debug Console Logs to Look For

**Backend (terminal)**:
```
📡 Broadcasting camera_detection event: 45
📡 Broadcasting dashboardUpdate event
📡 Broadcasting new_incident, new_alert, and mapIncident events
🎮 Simulation event: { type: 'overcrowding', zoneName: '...', risk_score: 72 }
```

**Frontend (browser console)**:
```
✅ WebSocket connected successfully!
📨 WebSocket message received: camera_detection
📊 Detection updated: { risk_score: 45, people_count: 25, ... }
📨 WebSocket message received: zone_risk_update
🗺️ Zone risk update: { name: 'Central Bus Terminal', risk_score: 72 }
📨 WebSocket message received: new_alert
🚨 New alert: { title: '🚨 High Crowd Density Detected', ... }
```

## Common Issues & Solutions

### Issue: WebSocket connection shows but no updates
- **Check**: Is simulation running? (simulationEngine.js auto-starts)
- **Check**: Are you viewing the correct page? (Dashboard, Map, etc.)
- **Check**: Open DevTools Network tab, filter WS - any messages?

### Issue: Data fields show "—"
- **Check**: Console log shows detection data properly formatted?
- **Check**: normalizeDetectionData() is converting fields correctly

### Issue: Map markers not updating
- **Check**: Using `liveZoneUpdate` not `lastRiskUpdate` in TransportMap.jsx
- **Check**: MapView component receives liveZoneUpdate prop correctly

### Issue: Alerts not appearing
- **Check**: incidentController.js broadcasts both new_incident AND new_alert
- **Check**: AlertPanel component receives liveAlert prop

## File Changes Summary

### Backend Files Modified
1. `backend/controllers/cameraController.js` - Added camera_detection broadcast
2. `backend/controllers/analyticsController.js` - Added dashboardUpdate broadcast
3. `backend/controllers/incidentController.js` - Added new_alert and mapIncident broadcasts

### Frontend Files Modified
1. `frontend/src/hooks/useWebSocket.js` - Added normalization, new handlers, debug logs
2. `frontend/src/pages/Dashboard.jsx` - Added dashboardStats handling
3. `frontend/src/pages/TransportMap.jsx` - Fixed liveZoneUpdate prop

