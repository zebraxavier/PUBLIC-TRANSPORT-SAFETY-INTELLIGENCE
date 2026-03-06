import axios from 'axios'

const BASE_URL = '/api'

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
})

// Add auth token if present
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ptsi_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

api.interceptors.response.use(
    res => res,
    err => {
        console.error('API Error:', err.response?.data?.error || err.message)
        return Promise.reject(err)
    }
)

// Auth
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    demoLogin: () => api.post('/auth/demo'),
}

// Zones
export const zonesAPI = {
    getSafety: () => api.get('/zones/safety'),
    getAll: () => api.get('/zones'),
    getById: (id) => api.get(`/zones/${id}`),
}

// Incidents
export const incidentsAPI = {
    getAll: (params) => api.get('/incidents', { params }),
    getStats: () => api.get('/incidents/stats'),
    getById: (id) => api.get(`/incidents/${id}`),
    updateStatus: (id, status) => api.patch(`/incidents/${id}/status`, { status }),
}

// Alerts
export const alertsAPI = {
    getAll: (params) => api.get('/alerts', { params }),
    getStats: () => api.get('/alerts/stats'),
    markRead: (id) => api.patch(`/alerts/${id}/read`),
    markAllRead: () => api.patch('/alerts/read-all'),
}

// Analytics
export const analyticsAPI = {
    getRisk: () => api.get('/analytics/risk'),
    getInsights: () => api.get('/analytics/insights'),
}

// Vision
export const visionAPI = {
    sendDetection: (data) => api.post('/vision/detection', data),
    simulate: (scenario, zoneId) => api.post('/vision/simulate', { scenario, zoneId }),
}
