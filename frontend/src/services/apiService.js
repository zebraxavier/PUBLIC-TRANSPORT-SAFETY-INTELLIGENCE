import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

// ── JWT Token Interceptor ────────────────────────────────────────────────────
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('ptsi_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for handling token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('ptsi_token');
            localStorage.removeItem('ptsi_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
    api.post('/auth/login', { email, password });

export const register = (name, email, password, role) =>
    api.post('/auth/register', { name, email, password, role });

export const getCurrentUser = () =>
    api.get('/auth/me');

// ── Incidents ─────────────────────────────────────────────────────────────────
export const getIncidents = (params = {}) =>
    api.get('/incidents', { params });

export const getIncidentById = (id) =>
    api.get(`/incidents/${id}`);

export const deleteIncident = (id) =>
    api.delete(`/incidents/${id}`);

// ── Alerts ────────────────────────────────────────────────────────────────────
export const getAlerts = (params = {}) =>
    api.get('/alerts', { params });

export const markAlertRead = (id) =>
    api.patch(`/alerts/${id}/read`);

export const markAllAlertsRead = () =>
    api.patch('/alerts/read-all');

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getRiskAnalytics = () =>
    api.get('/analytics/risk');

export const getSafetyInsights = () =>
    api.get('/analytics/insights');

// ── Zones ─────────────────────────────────────────────────────────────────────
export const getZones = () =>
    api.get('/zones');

export const getZoneSafety = () =>
    api.get('/zones/safety');

// ── Vision / Detection ────────────────────────────────────────────────────────
export const sendDetection = (payload) =>
    api.post('/vision/detection', payload);

export const triggerSimulation = (scenario, zoneId) =>
    api.post('/simulation/trigger/' + scenario, { zoneId });

export const getSimulationStatus = () =>
    api.get('/simulation/status');

export const toggleSimulation = (active) =>
    api.post('/simulation/toggle', { active });

// ── Stream ────────────────────────────────────────────────────────────────────
export const startStream = (payload) =>
    api.post('/stream/start', payload);

export const sendFrame = (formData) =>
    api.post('/stream/frame', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// ── Vehicles ─────────────────────────────────────────────────────────────────
export const getVehicles = (params = {}) =>
    api.get('/vehicles', { params });

export const getVehicleById = (id) =>
    api.get(`/vehicles/${id}`);

export const createVehicle = (data) =>
    api.post('/vehicles', data);

export const updateVehicle = (id, data) =>
    api.put(`/vehicles/${id}`, data);

export const deleteVehicle = (id) =>
    api.delete(`/vehicles/${id}`);

export const getVehicleStats = () =>
    api.get('/vehicles/stats');

// ── Drivers ─────────────────────────────────────────────────────────────────
export const getDrivers = (params = {}) =>
    api.get('/drivers', { params });

export const getDriverById = (id) =>
    api.get(`/drivers/${id}`);

export const createDriver = (data) =>
    api.post('/drivers', data);

export const updateDriver = (id, data) =>
    api.put(`/drivers/${id}`, data);

export const deleteDriver = (id) =>
    api.delete(`/drivers/${id}`);

export const getDriverStats = () =>
    api.get('/drivers/stats');

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getAccidents = (params = {}) =>
    api.get('/analytics/accidents', { params });

export const getRiskScore = () =>
    api.get('/analytics/risk-score');

export const getDangerZones = () =>
    api.get('/analytics/danger-zones');

// ── Camera Analyzer ──────────────────────────────────────────────────────────
export const analyzeCameraFrame = (frameBase64, zoneId, zoneName) =>
    api.post('/camera/analyze', { 
        frame_base64: frameBase64, 
        zone_id: zoneId, 
        zone_name: zoneName 
    });

export const analyzeCameraMultipart = (formData) =>
    api.post('/camera/analyze-multipart', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
    });

export const getCameraStatus = () =>
    api.get('/camera/status');

export default api;
