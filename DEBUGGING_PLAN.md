# WebSocket Real-Time Update Fix Plan

## Issues Identified

### 1. Backend Event Broadcasting Issues
- **cameraController.js**: Only broadcasts `camera_alert` when alert triggers, NOT regular detection results
- **analyticsController.js**: Does NOT broadcast dashboard/analytics updates
- Data structures are inconsistent (camelCase vs snake_case)

### 2. Frontend Message Handling Issues  
- **useWebSocket.js**: Expects different field names than backend sends
- Backend sends: `riskScore`, `peopleCount`, `vehicleCount`, `crowdDensity` in `metrics` object
- Frontend expects: `risk_score`, `people_count`, `vehicle_count`, `crowd_density`

### 3. React Component Issues
- **Dashboard.jsx**: Field name mismatches for detection data
- **MapView.jsx**: `liveZoneUpdate` prop never passed from parent

## Fix Plan

### Phase 1: Fix Backend Broadcasting

#### 1.1 Fix cameraController.js
- Broadcast detection results on every analysis (not just alerts)
- Add `camera_detection` event type

#### 1.2 Fix analyticsController.js  
- Add WebSocket broadcasting for dashboard stats changes
- Add `dashboardUpdate` event type

#### 1.3 Standardize Data Structures
- Ensure all broadcasts use consistent field naming

### Phase 2: Fix Frontend Message Handling

#### 2.1 Fix useWebSocket.js
- Normalize incoming data to expected format
- Handle all event types correctly
- Add proper debugging logs

#### 2.2 Fix Dashboard.jsx
- Use correct field names from normalized data

### Phase 3: Fix Map Updates

#### 3.1 Pass liveZoneUpdate to MapView
- Create WebSocket subscription in parent component
- Pass live updates to MapView

## Files to Edit

1. `backend/controllers/cameraController.js` - Add detection broadcasting
2. `backend/controllers/analyticsController.js` - Add dashboard broadcasting  
3. `frontend/src/hooks/useWebSocket.js` - Normalize data, fix handlers
4. `frontend/src/pages/Dashboard.jsx` - Fix field access
5. `frontend/src/App.jsx` - Add map live updates

## Event Types to Support

| Event Type | Backend Sends | Frontend Expects |
|------------|--------------|------------------|
| new_incident | ✅ | ✅ |
| new_alert | ✅ | ✅ |
| camera_alert | ✅ | ✅ |
| camera_detection | ❌ Missing | ✅ |
| dashboardUpdate | ❌ Missing | ✅ |
| zone_risk_update | ✅ | ✅ |
| mapIncident | ❌ Missing | ✅ |
