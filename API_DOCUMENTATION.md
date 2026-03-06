# PTSI API Documentation

## Base URLs

- **Backend API:** `http://localhost:5000/api`
- **AI Service:** `http://localhost:8000`
- **WebSocket:** `ws://localhost:5001`

---

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@ptsi.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "email": "admin@ptsi.com",
    "role": "admin"
  }
}
```

---

## Incidents API

### List Incidents

```http
GET /incidents?severity=high&zone_id=xxx&limit=50&page=1
```

**Query Parameters:**
- `severity` (optional): `low`, `medium`, `high`, `critical`
- `zone_id` (optional): Filter by zone
- `type` (optional): `overcrowding`, `aggressive_traffic`, etc.
- `limit` (default: 50): Results per page
- `page` (default: 1): Page number

**Response:**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "zone_name": "Central Bus Terminal",
      "type": "overcrowding",
      "severity": "high",
      "crowd_density": 0.85,
      "vehicle_count": 35,
      "risk_score": 72,
      "latitude": 12.9716,
      "longitude": 77.5946,
      "resolved": false,
      "timestamp": "2024-03-05T10:30:00Z"
    }
  ]
}
```

### Get Incident Details

```http
GET /incidents/:id
```

### Create Incident (Manual)

```http
POST /incidents
Content-Type: application/json

{
  "zone_id": "507f1f77bcf86cd799439011",
  "zone_name": "Central Bus Terminal",
  "type": "overcrowding",
  "severity": "high",
  "description": "High crowd density at platform",
  "crowd_density": 0.88,
  "vehicle_count": 12,
  "risk_score": 75,
  "latitude": 12.9716,
  "longitude": 77.5946
}
```

### Resolve Incident

```http
PATCH /incidents/:id/resolve
```

### Get Incident Statistics

```http
GET /incidents/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 245,
    "high": 48,
    "unresolved": 12,
    "byType": [
      { "_id": "overcrowding", "count": 95 },
      { "_id": "aggressive_traffic", "count": 87 }
    ]
  }
}
```

---

## Alerts API

### List Alerts

```http
GET /alerts?limit=30
```

### Get Unread Alerts

```http
GET /alerts/unread
```

### Create Alert

```http
POST /alerts
Content-Type: application/json

{
  "title": "High Crowd Density",
  "message": "Central Bus Terminal at 90% capacity",
  "severity": "critical",
  "zone_id": "507f1f77bcf86cd799439011",
  "zone_name": "Central Bus Terminal",
  "incident_id": "507f1f77bcf86cd799439012"
}
```

**Severity Levels:** `info`, `warning`, `danger`, `critical`

### Acknowledge Alert

```http
PATCH /alerts/:id/acknowledge
```

---

## Analytics API

### Risk Analytics

```http
GET /analytics/risk
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalIncidents": 245,
      "activeAlerts": 8,
      "highRiskZones": 3,
      "avgRiskScore": 42
    },
    "hourlyDistribution": [0, 2, 1, 6, ...],
    "riskTrend": [
      { "date": "Mar 1", "avgRisk": 38 },
      { "date": "Mar 2", "avgRisk": 45 }
    ],
    "incidentsByType": [
      { "_id": "overcrowding", "count": 95 }
    ],
    "zoneRiskMatrix": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Railway Hub",
        "risk_score": 78,
        "risk_level": "danger"
      }
    ]
  }
}
```

### Safety Insights

```http
GET /analytics/insights
```

---

## Zones API

### List All Zones

```http
GET /zones
```

### Get Zone Safety Data

```http
GET /zones/safety
```

### Get Zone Details

```http
GET /zones/:id
```

### Update Zone Risk

```http
PATCH /zones/:id/risk
Content-Type: application/json

{
  "risk_score": 72,
  "risk_level": "danger",
  "current_occupancy": 450
}
```

---

## Stream API

### Start Stream

```http
POST /stream/start
Content-Type: application/json

{
  "zone_id": "507f1f77bcf86cd799439011",
  "zone_name": "Central Bus Terminal",
  "device_id": "phone_123",
  "source_type": "mobile_camera"
}
```

**Response:**
```json
{
  "success": true,
  "stream_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Stream session started"
}
```

### Upload Frame (Binary)

```http
POST /stream/frame
Content-Type: multipart/form-data

frame: <binary_image_data>
zone_id: 507f1f77bcf86cd799439011
zone_name: Central Bus Terminal
stream_id: 550e8400-e29b-41d4-a716-446655440000
```

### List Active Streams

```http
GET /stream/active
```

---

## Simulation API

### Get Simulation Status

```http
GET /simulation/status
```

**Response:**
```json
{
  "success": true,
  "active": false,
  "mode": "standby"
}
```

### Toggle Simulation

```http
POST /simulation/toggle
Content-Type: application/json

{
  "active": true
}
```

### Trigger Simulation Scenario

```http
POST /simulation/trigger/:scenario

Scenarios:
  - overcrowding
  - traffic_surge
  - suspicious_movement
  - congestion
  - emergency
  - normal
```

---

## Vision / Detection API

### Process Detection

```http
POST /vision/detection
Content-Type: application/json

{
  "frame_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...",
  "stream_id": "550e8400-e29b-41d4-a716-446655440000",
  "zone_id": "507f1f77bcf86cd799439011",
  "zone_name": "Central Bus Terminal"
}
```

---

## AI Service API (Port 8000)

### Detect Objects in Frame

```http
POST /detect
Content-Type: application/json

{
  "frame": "iVBORw0KGgo...",
  "source": "mobile",
  "zone_id": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "people_count": 45,
    "vehicle_count": 28,
    "crowd_density": 0.52,
    "congestion_level": 0.65,
    "movement_speed": "normal",
    "objects_detected": ["person", "car", "bus"],
    "timestamp": "2024-03-05T10:30:00Z"
  }
}
```

### Predict Risk

```http
POST /predict/risk
Content-Type: application/json

{
  "crowd_density": 0.65,
  "vehicle_count": 25,
  "congestion_level": 0.45,
  "time_of_day": 14,
  "weather_condition": 0.1,
  "location_type": 0,
  "anomaly_score": 0.2
}
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "risk_score": 52,
    "risk_level": "warning",
    "risk_color": "#ffb347",
    "ml_score": 48,
    "rule_override": false,
    "explanation": "high crowd density (65%); routine monitoring"
  }
}
```

### Trigger Simulation

```http
POST /simulate/scenario
Content-Type: application/json

{
  "scenario": "overcrowding",
  "zone_name": "Central Bus Terminal",
  "time_of_day": 14
}
```

---

## WebSocket Connection

### Connect

```javascript
const ws = new WebSocket('ws://localhost:5001');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log(data);
};
```

### Message Types

1. **Connected**
```json
{
  "type": "connected",
  "message": "PTSI WebSocket connected"
}
```

2. **New Incident**
```json
{
  "type": "new_incident",
  "data": { "incident_object" },
  "alert": { "alert_object" }
}
```

3. **New Alert**
```json
{
  "type": "new_alert",
  "data": { "alert_object" }
}
```

4. **Zone Updated**
```json
{
  "type": "zone_updated",
  "data": { "zone_object" }
}
```

5. **Detection Results**
```json
{
  "type": "detection_result",
  "data": {
    "people_count": 45,
    "vehicle_count": 28,
    "crowd_density": 0.52
  }
}
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Zone not found"
}
```

### HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created
- `202 Accepted` - Request accepted (async processing)
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Missing/invalid authentication
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Rate Limiting

Recommended for production:

- **Anonymous:** 10 requests/minute
- **Authenticated:** 100 requests/minute
- **WebSocket:** 1000 messages/minute

---

## Pagination

Supported on list endpoints (incidents, alerts, etc.):

```
GET /incidents?page=1&limit=50
```

Response includes:
```json
{
  "success": true,
  "count": 50,
  "total": 245,
  "page": 1,
  "pages": 5,
  "data": [...]
}
```

---

## Filtering & Sorting

### Filtering
```
GET /incidents?severity=high&resolved=false&zone_id=xxx
```

### Sorting
```
GET /incidents?sort=-timestamp   (descending)
GET /incidents?sort=timestamp    (ascending)
```

---

## Example Workflow

1. **Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ptsi.com","password":"admin123"}'
```

2. **Get Risk Analytics**
```bash
curl -X GET http://localhost:5000/api/analytics/risk \
  -H "Authorization: Bearer <token>"
```

3. **Trigger Simulation**
```bash
curl -X POST http://localhost:5000/api/simulation/trigger/overcrowding \
  -H "Authorization: Bearer <token>"
```

4. **Get Updated Incidents**
```bash
curl -X GET http://localhost:5000/api/incidents?limit=10 \
  -H "Authorization: Bearer <token>"
```

---

## Postman Collection

Import the provided `PTSI.postman_collection.json` for complete API testing.

---

Last Updated: March 5, 2024
