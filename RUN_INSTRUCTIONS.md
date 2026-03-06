# Transport Safety Intelligence - Complete Setup & Running Instructions

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (optional - runs in demo mode without it)
- Redis (optional - runs in demo mode without it)

### Running the Backend

```bash
cd backend
npm install
npm start
```

The backend will start on http://localhost:5000

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on http://localhost:5173

## WebSocket Configuration

### Connection Details
- **WebSocket URL**: `ws://localhost:5000/ws`
- **Path**: `/ws`
- **Protocol**: Native WebSocket (ws://)

### Frontend Configuration
The frontend uses the `useWebSocket` hook located at `frontend/src/hooks/useWebSocket.js`.
Environment variables can be set in `frontend/.env`:
```
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000/ws
```

### WebSocket Events

#### Server → Client Events
| Event | Description | Payload |
|-------|-------------|---------|
| `connected` | Connection confirmation | `{ type, message, timestamp }` |
| `new_incident` | New incident reported | `{ type, payload: { ...incident, alert }, timestamp }` |
| `new_alert` | New alert created | `{ type, payload: alert, timestamp }` |
| `simulation_event` | Simulation result | `{ type, payload: { ...detection, risk_score }, timestamp }` |
| `zone_risk_update` | Zone risk update | `{ type, payload: zoneData, timestamp }` |
| `camera_alert` | Camera detection alert | `{ type, payload: { alert, analysis }, timestamp }` |
| `incident_resolved` | Incident resolved | `{ type, data: incident, timestamp }` |

#### Client → Server Events
| Event | Description |
|-------|-------------|
| `ping` | Keep-alive ping |
| `subscribe` | Subscribe to events |
| `cameraFrame` | Send camera frame data |
| `reportIncident` | Report an incident |

### Reconnection Strategy
- Maximum 5 reconnection attempts
- Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 30s)
- Automatic reconnection on disconnect

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login (demo: admin@ptsi.com / admin123)

### Incidents
- GET `/api/incidents` - List all incidents
- POST `/api/incidents` - Create incident
- GET `/api/incidents/:id` - Get incident by ID

### Vehicles
- GET `/api/vehicles` - List vehicles
- POST `/api/vehicles` - Create vehicle (admin/operator)
- GET `/api/vehicles/stats` - Get vehicle statistics

### Drivers
- GET `/api/drivers` - List drivers
- POST `/api/drivers` - Create driver (admin/operator)
- GET `/api/drivers/stats` - Get driver statistics

### Analytics
- GET `/api/analytics/risk` - Risk analytics
- GET `/api/analytics/accidents` - Accident statistics
- GET `/api/analytics/risk-score` - Overall risk score
- GET `/api/analytics/danger-zones` - Danger zones analysis

### Alerts
- GET `/api/alerts` - List alerts

### Camera Analyzer
- POST `/api/camera/analyze` - Analyze camera frame (base64)
- POST `/api/camera/analyze-multipart` - Analyze multipart file upload
- GET `/api/camera/status` - Get analyzer status

### Zones
- GET `/api/zones` - List zones
- GET `/api/zones/safety` - Zone safety data

## Camera Analyzer Module

### Frontend Component
The CameraAnalyzer component in `frontend/src/components/CameraAnalyzer.jsx` provides:
- Webcam access
- Real-time frame capture (every 3 seconds)
- AI-based analysis via backend API
- Visual alerts for high-risk situations
- Detection history

### Backend API
The camera controller (`backend/controllers/cameraController.js`) provides:
- Base64 frame analysis
- Multipart file upload support
- Simulated AI detection (people, vehicles, crowd density, risk score)
- Automatic alert creation for high-risk scenarios

### Response Format
```json
{
  "success": true,
  "data": {
    "riskScore": 45,
    "riskLevel": "MEDIUM",
    "detectedObjects": [
      { "type": "person", "count": 25 },
      { "type": "vehicle", "count": 8 }
    ],
    "alert": false,
    "metrics": {
      "peopleCount": 25,
      "vehicleCount": 8,
      "crowdDensity": 0.25,
      "congestionLevel": 0.2,
      "movementSpeed": 1.5
    },
    "zoneId": "main-gate",
    "zoneName": "Main Gate",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## Demo Credentials
- Email: admin@ptsi.com
- Password: admin123

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ptsi_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## Features Implemented

1. ✅ Authentication (JWT)
2. ✅ Incident Management
3. ✅ Vehicle Management
4. ✅ Driver Management
5. ✅ Real-time Analytics
6. ✅ Alert System
7. ✅ Camera Analyzer (Real-time AI Detection)
8. ✅ WebSocket Support
9. ✅ Zone Management
10. ✅ Simulation Engine

## Project Structure

```
backend/
├── server.js              # Main server entry
├── controllers/           # API controllers
├── routes/               # API routes
├── models/              # Mongoose models
├── middleware/           # Auth & error handling
├── services/            # Business logic
├── simulation/          # Simulation engine
└── seed/                # Database seeding

frontend/
├── src/
│   ├── components/      # React components
│   │   └── CameraAnalyzer.jsx
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── context/         # React context
│   └── hooks/           # Custom hooks
```

## Troubleshooting

### MongoDB not available
The backend will run in demo mode without MongoDB, using in-memory data.

### Redis not available
WebSocket broadcasts will use fallback mode without Redis.

### Camera access denied
Ensure the browser has camera permissions and the site is served over HTTPS (or localhost).

