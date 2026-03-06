# Transport Safety Intelligence - Bug Report & Reconstruction Plan

## PHASE 1 — FULL PROJECT AUDIT

### IDENTIFIED ISSUES

#### 1. BROKEN IMPORTS & STRUCTURE
| File | Issue | Severity |
|------|-------|----------|
| client/src/App.jsx | Uses deprecated `AppProvider` import (not found in context) | HIGH |
| frontend/src/App.jsx | Missing AppProvider wrapper - no global state | HIGH |
| backend/server.js | Missing WebSocket route path (/ws vs root) | HIGH |
| server/src/app.js | Missing index.js entry point | HIGH |

#### 2. MISSING DEPENDENCIES & APIs
| Issue | Details | Severity |
|-------|---------|----------|
| No Login/Register pages | Frontend has no authentication UI | CRITICAL |
| No Vehicle API | Required API missing completely | CRITICAL |
| No Driver API | Required API missing completely | CRITICAL |
| No DELETE /incidents/:id | Required API endpoint missing | HIGH |
| No analytics endpoints | /analytics/accidents, /analytics/risk-score, /analytics/danger-zones missing | HIGH |

#### 3. API ENDPOINT ERRORS
| Endpoint | Issue | Severity |
|----------|-------|----------|
| POST /api/auth/register | No validation, missing from server/ routes | HIGH |
| GET /api/analytics/risk | Works in backend/ but missing totalAlerts in summary | MEDIUM |
| WebSocket /ws | Frontend connects to /ws but backend serves at root | CRITICAL |

#### 4. BACKEND RUNTIME ERRORS
| File | Error | Severity |
|------|-------|----------|
| backend/controllers/authController.js | Demo login hardcoded (security issue) | HIGH |
| backend/server.js | No global error handling middleware | HIGH |
| backend/middleware/ | Empty folder, no auth middleware | HIGH |

#### 5. STATE MANAGEMENT ISSUES
| Issue | Location | Severity |
|-------|----------|----------|
| No auth context | frontend/src/context/ missing | HIGH |
| AppProvider missing | frontend/src/App.jsx | HIGH |
| No token management | Frontend has no JWT storage | HIGH |

#### 6. SECURITY VULNERABILITIES
| Issue | Details | Severity |
|-------|---------|----------|
| Hardcoded credentials | Demo admin login in authController.js | CRITICAL |
| No JWT verification | Routes not protected | CRITICAL |
| No rate limiting | Vulnerable to brute force | HIGH |
| CORS wide open | origin: '*' in production | HIGH |

#### 7. DATABASE SCHEMA ISSUES
| Model | Issue | Severity |
|-------|-------|----------|
| Incident | Missing geolocation indexes | MEDIUM |
| Zone | No geospatial indexing for map queries | MEDIUM |
| User | Missing password validation | MEDIUM |

#### 8. DUPLICATE STRUCTURE
| Issue | Details |
|-------|---------|
| Two frontends | client/ and frontend/ with similar code |
| Two backends | backend/ (complete) and server/ (incomplete) |
| Confusion | Which to use? |

#### 9. UI COMPONENT BUGS
| Issue | Location | Severity |
|-------|----------|----------|
| No error boundaries | React app crashes on errors | HIGH |
| No loading states | Some components missing loaders | MEDIUM |
| Map not working | MapView may have tile loading issues | MEDIUM |

---

## RECONSTRUCTION PLAN

### PHASE 2 — RESTRUCTURE

**Primary Structure**: Use `frontend/` and `backend/` as the main projects

**Frontend Structure to Implement**:
```
frontend/src/
├── components/     (existing - keep)
├── pages/          (add Login, Register)
├── layouts/        (create)
├── hooks/          (existing - enhance)
├── services/       (existing - fix)
├── context/        (add AuthContext)
├── utils/          (create)
└── styles/         (existing tailwind)
```

**Backend Structure** (already exists in backend/):
```
backend/
├── config/         (create)
├── controllers/    (existing - fix)
├── routes/         (existing - add missing)
├── models/         (existing - enhance)
├── middleware/     (create - auth, error)
├── services/       (existing)
├── utils/          (create)
└── validators/    (create)
```

### PHASE 3 — FIX BACKEND

**Required APIs to Add**:
1. DELETE /api/incidents/:id
2. GET /api/vehicles (new)
3. POST /api/vehicles (new)
4. GET /api/drivers (new)
5. POST /api/drivers (new)
6. GET /api/analytics/accidents (new)
7. GET /api/analytics/risk-score (new)
8. GET /api/analytics/danger-zones (new)

**Fixes Required**:
- Add auth middleware for protected routes
- Add request validation
- Add global error handler
- Fix response standardization

### PHASE 4 — DATABASE

**Schemas to Fix**:
1. User - add validation, role enum
2. Incident - add 2dsphere index for geo queries
3. Zone - add 2dsphere index
4. Add Vehicle model
5. Add Driver model

### PHASE 5 — FRONTEND

**Pages to Add**:
1. Login.jsx
2. Register.jsx

**Fixes**:
1. Add AuthContext for JWT management
2. Fix API service with proper error handling
3. Add protected routes
4. Fix WebSocket connection

### PHASE 6 — UI IMPROVEMENTS

Already implemented with:
- TailwindCSS ✓
- Glassmorphism ✓
- Framer Motion ✓
- Responsive layouts ✓

### PHASE 7 — SECURITY

**Add**:
- bcrypt password hashing ✓ (existing but hardcoded demo)
- JWT authentication (partial)
- Role-based access control
- helmet middleware
- express-rate-limit

### PHASE 8-10 — FINAL

- Fix all remaining issues
- Test all endpoints
- Verify frontend-backend integration

