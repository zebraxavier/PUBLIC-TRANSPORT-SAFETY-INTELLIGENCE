# PTSI System Architecture

## Overview

PUBLIC TRANSPORT SAFETY INTELLIGENCE is a production-grade, AI-powered platform for real-time transport safety monitoring. The system combines computer vision, machine learning, IoT simulation, and real-time analytics to provide predictive safety alerts in urban transport environments.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile Devices                            │
│                    (Camera / Sensors)                            │
└────────────────┬────────────────────────────────────────────────┘
                 │ WebRTC / Video Stream
┌────────────────▼────────────────────────────────────────────────┐
│                    Load Balancer / Reverse Proxy                 │
│              (nginx / AWS ALB / Azure Load Balancer)             │
└────────────────┬────────────────────────────────────────────────┘
                 │
        ┌────────┴────────┬─────────────────┬──────────────────┐
        │                 │                 │                  │
┌───────▼────────┐ ┌─────▼─────┐ ┌────────▼─────────┐ ┌──────▼────────┐
│  React Frontend │ │Node Backend│ │ Python AI Service │ │  Static Assets│
│ (Port 5173)    │ │(Port 5000) │ │  (Port 8000)     │ │  (CDN/S3)     │
└────────┬────────┘ └─────┬─────┘ └────────┬─────────┘ └───────────────┘
         │                │                │
         └────────────────┼────────────────┘
                          │ WebSocket / HTTP
                    ┌─────▼──────────┐
                    │  Redis Streams  │
                    │   & Pub/Sub     │
                    │  (Port 6379)    │
                    └─────┬───────────┘
                          │
                    ┌─────▼──────────┐
                    │  MongoDB        │
                    │  (Port 27017)   │
                    │  - Incidents    │
                    │  - Alerts       │
                    │  - Zones        │
                    │  - Analytics    │
                    └─────────────────┘
```

---

## Component Architecture

### 1. Frontend (React 18 + Vite)

**Location:** `/frontend`

**Responsibilities:**
- Real-time dashboard UI
- Live WebSocket connections
- Camera stream display
- Interactive map visualization
- Analytics charts
- Alert notifications

**Key Technologies:**
- React 18 with Hooks
- Vite for fast dev/build
- TailwindCSS 3 for styling
- Framer Motion for animations
- Leaflet for mapping
- Chart.js for analytics
- Lucide React for icons

**Structure:**
```
src/
├── pages/           (7 main pages)
├── components/      (Reusable UI components)
├── hooks/           (Custom React hooks)
├── services/        (API Axios client)
├── context/         (React Context)
└── assets/          (Images, styles)
```

---

### 2. Backend API (Node.js + Express)

**Location:** `/backend`

**Responsibilities:**
- REST API for dashboard
- WebSocket server for real-time alerts
- MongoDB data persistence
- Redis for caching/queues
- Request routing to AI service
- Authentication & Authorization
- Incident/Alert/Zone management

**Key Technologies:**
- Express.js for REST API
- ws for WebSocket
- Mongoose for MongoDB
- ioredis for Redis
- JWT for authentication
- bcryptjs for password hashing

**Structure:**
```
backend/
├── server.js                (Express + WebSocket app)
├── routes/                  (8 API route files)
├── controllers/             (7 business logic files)
├── models/                  (7 MongoDB schemas)
├── services/                (Queue, Redis, Analytics)
├── middleware/              (Auth, error handling)
├── simulation/              (Incident generation)
└── seed/                    (Database initialization)
```

**API Endpoints:** 30+ endpoints across 8 routes

---

### 3. AI Service (Python FastAPI)

**Location:** `/ai-service`

**Responsibilities:**
- Computer vision frame processing
- Object detection (YOLO simulation)
- Movement tracking (DeepSORT)
- Anomaly detection
- ML-based risk prediction
- Simulation scenario generation

**Key Technologies:**
- FastAPI for async HTTP
- OpenCV for image processing
- scikit-learn for ML models
- scipy for numerical computing
- pydantic for validation

**Structure:**
```
ai-service/
├── main.py                  (FastAPI app)
├── routers/                 (4 endpoint groups)
│   ├── detection.py         (CV frame processing)
│   ├── predict.py           (ML risk prediction)
│   ├── simulate.py          (Scenario generation)
│   └── stream_ingest.py     (RTSP streams - optional)
├── models/                  (AI/ML modules)
│   ├── unified_risk_engine.py (RandomForest + rules)
│   ├── risk_model.pkl       (Trained model)
│   └── scaler.pkl           (Feature scaling)
└── cv/                      (Computer Vision)
    ├── detector.py          (YOLOv8-style detection)
    ├── tracker.py           (DeepSORT tracker)
    ├── anomaly.py           (Anomaly detection)
    └── movement_analyzer.py (Trajectory analysis)
```

**AI Endpoints:** 6 endpoints

---

### 4. Data Layer

**MongoDB Collections:**
- **zones** - Transport locations with risk scores
- **incidents** - Detected safety events
- **alerts** - User notifications
- **sensor_streams** - Active camera feeds
- **analytics_hourly** - Aggregated hourly stats
- **users** - Authentication and profiles

**Redis:**
- **Streams** - Frame queue (frames:queue)
- **Pub/Sub** - Real-time broadcasts (ptsi:broadcasts)
- **Cache** - Analytics, sessions

---

### 5. Message Queues & Pub/Sub

**Redis Streams:**
```
frames:queue → Frame buffer from camera
↓
AI Worker processes
↓
Result published to ptsi:broadcasts
```

**Redis Pub/Sub:**
```
ptsi:broadcasts → Consumed by WebSocket server
↓
Broadcast to connected clients
```

This architecture enables:
- Async frame processing
- Non-blocking API responses
- Real-time client updates

---

## Data Flow Diagrams

### Frame Processing Pipeline

```
Phone Camera
    ↓
POST /api/stream/frame (binary)
    ↓
Backend enqueue()
    ↓
Redis Streams (frames:queue)
    ↓
AI Service Worker (background)
    ↓
Process frame:
    - Detect objects (YOLOv8)
    - Track trajectories (DeepSORT)
    - Compute crowd_density
    - Check for anomalies
    ↓
Compute risk_score:
    - ML model inference
    - Apply hard rules
    - Determine risk_level
    ↓
Redis Pub/Sub (ptsi:broadcasts)
    ↓
Backend WebSocket server
    ↓
Broadcast to React dashboard
    ↓
Update in real-time
```

### Alert Generation Flow

```
Risk Score ≥ 65 (Danger)
    ↓
Create Incident (MongoDB)
    ↓
Create Alert (MongoDB)
    ↓
Update Zone risk_score
    ↓
Broadcast via:
    - WebSocket
    - Redis Pub/Sub
    ↓
Frontend receives
    ↓
Toast notification
    ↓
Add to Alert Panel
    ↓
Update KPI cards
```

### Analytics Aggregation

```
Raw detections
    ↓
analyticsAggregator.recordDetection()
    ↓
In-memory buffer
    ↓
Every 30 seconds:
    flush() to AnalyticsHourly
    ↓
Update Zone metrics
    ↓
Cache in Redis
    ↓
Dashboard queries AnalyticsHourly
```

---

## Risk Assessment Model

### Hybrid ML + Rule-Based Approach

```
Input Features:
├── crowd_density (0-1)
├── vehicle_count (0-200)
├── congestion_level (0-1)
├── time_of_day (0-23)
├── weather_condition (0-1)
├── location_type (0-4)
└── anomaly_score (0-1)
    ↓
├─ ML Path:
│  ├── RandomForestClassifier
│  ├── StandardScaler normalization
│  └── Probability → Score (0-100)
│
└─ Rule-Based Path:
   ├── Danger Rules (if crowd > 0.9 → score 85)
   ├── Warning Rules (if vehicles > 30 → score 45)
   └── Other conditions
    ↓
Final Score = max(ML_score, RuleScore)
    ↓
Categorize:
├── 0-34: SAFE (🟢)
├── 35-64: WARNING (🟡)
└── 65-100: DANGER (🔴)
```

---

## Security Architecture

### Authentication & Authorization

```
Browser/App
    ↓
POST /api/auth/login (email + password)
    ↓
Backend validates credentials
    ↓
Generate JWT token
    ↓
Token stored in localStorage
    ↓
Include in all protected requests:
Authorization: Bearer <token>
    ↓
Express middleware validates JWT
    ↓
Attach user info to request
    ↓
Controller logic executes
```

### Data Security

- **In Transit:** HTTPS/TLS (configured via nginx)
- **At Rest:** MongoDB enterprise encryption
- **Passwords:** bcryptjs hashing (10 salt rounds)
- **Secrets:** Environment variables (never in code)
- **CORS:** Whitelist origins

---

## Scalability

### Horizontal Scaling

```
Load Balancer (nginx / AWS ALB)
├── Backend Instance 1
├── Backend Instance 2
├── Backend Instance 3
└── Backend Instance N

Redis (shared across instances)
MongoDB Replica Set (shared)
```

### Vertical Scaling

- Increase backend CPU/RAM
- Increase MongoDB connections
- Increase Redis memory

### Performance Optimization

- Frame queue batching (process 4 frames concurrently)
- Analytics caching (1-hour Redis TTL)
- Database indexing on frequently queried fields
- WebSocket connection pooling
- CDN for static assets

---

## Deployment Topologies

### Development

```
Local machine
├── Backend (npm run dev)
├── AI Service (uvicorn --reload)
├── Frontend (npm run dev)
├── MongoDB (local or Atlas)
└── Redis (local)
```

### Staging

```
Docker Compose on single VM
├── 1 backend container
├── 1 AI service container
├── 1 frontend container
├── MongoDB container
└── Redis container
```

### Production

```
Option A - Docker Compose with external services:
├── Backend (3+ replicas, load balanced)
├── AI Service (2+ replicas, load balanced)
├── Frontend (CDN)
├── MongoDB Atlas (managed)
└── AWS ElastiCache (managed Redis)

Option B - Kubernetes:
├── Backend Deployment (replicas: 3-10)
├── AI Service Deployment (replicas: 2-5)
├── Frontend StaticSet
├── MongoDB StatefulSet
└── Redis StatefulSet
├── Ingress Controller
└── HPA (Horizontal Pod Autoscaler)
```

---

## Monitoring & Observability

### Health Checks

```
GET /health                 → Backend health
GET /health                 → AI service health
db.adminCommand('ping')    → MongoDB health
PING                       → Redis health
```

### Logging

- **Backend:** Console + file logs (DEBUG/INFO/ERROR)
- **AI Service:** FastAPI logging
- **Frontend:** Browser console + error tracking (Sentry)
- **Aggregation:** ELK Stack (Elasticsearch/Logstash/Kibana)

### Metrics

- API response times (p99 < 200ms target)
- WebSocket latency (< 100ms target)
- AI frame processing time (< 500ms per frame)
- Database query times
- Error rates and types

### Alerts

- Error rate > 5%
- Response time > 1000ms
- MongoDB connection errors
- Redis memory > 80%
- Disk space < 10%

---

## API Gateway (Optional - for production)

```
Client
  ↓
API Gateway (Kong/AWS API Gateway)
├─ Rate limiting
├─ Request validation
├─ Authentication
├─ Logging
└─ Circuit breaker
  ↓
Backend Load Balancer
```

---

## Disaster Recovery

### Backup Strategy

```
Daily: MongoDB dump → S3
Every 6h: Redis RDB → S3

Recovery:
- RTO: 1 hour
- RPO: 15 minutes
```

### Multi-Region Failover

```
Primary: us-east-1
├── Backend (3 instances)
├── MongoDB (3-node replica set)
└── Redis (primary + replica)

Secondary: us-west-2
├── Standby replicas
├── MongoDB replica set member
└── Redis replica
```

---

## Future Enhancements

- [ ] Real CCTV integration (RTSP / ONVIF)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics (Apache Spark)
- [ ] Real ML model training (TensorFlow / PyTorch)
- [ ] Multi-language translation
- [ ] SMS/Email alerts
- [ ] Integration with emergency services APIs
- [ ] Blockchain for audit trail

---

**Last Updated:** March 5, 2024
