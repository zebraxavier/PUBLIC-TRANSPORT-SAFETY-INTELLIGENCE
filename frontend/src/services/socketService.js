/**
 * WebSocket Service
 * Provides a singleton WebSocket connection for the entire application
 * FIX: Improved error handling, reconnection logic, and event normalization
 */

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';

class SocketService {
    constructor() {
        this.ws = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;  // Increased from 5
        this.reconnectTimer = null;
        this.isConnected = false;
        this.connectionListeners = [];
        this.isConnecting = false;
        this.connectResolve = null;
        this.connectReject = null;
    }

    /**
     * Connect to WebSocket server
     */
    connect() {
        // Prevent duplicate connections
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('WebSocket already OPEN, skipping...');
            return Promise.resolve();
        }
        
        if (this.isConnecting) {
            console.log('Connection already in progress...');
            return new Promise((resolve, reject) => {
                // Wait for existing connection to resolve
                const checkConnection = setInterval(() => {
                    if (!this.isConnecting) {
                        clearInterval(checkConnection);
                        if (this.isConnected) {
                            resolve();
                        } else {
                            reject(new Error('Connection failed'));
                        }
                    }
                }, 100);
            });
        }

        this.isConnecting = true;

        return new Promise((resolve, reject) => {
            this.connectResolve = resolve;
            this.connectReject = reject;
            
            try {
                console.log('Connecting to WebSocket:', WS_URL);
                
                // Close existing socket if any
                if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
                    this.ws.close();
                }
                
                this.ws = new WebSocket(WS_URL);

                this.ws.onopen = () => {
                    console.log('✅ WebSocket connected');
                    this.isConnected = true;
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    
                    // Notify connection listeners
                    this.connectionListeners.forEach(cb => cb(true));
                    
                    if (this.connectResolve) {
                        this.connectResolve();
                        this.connectResolve = null;
                        this.connectReject = null;
                    }
                };

                this.ws.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);
                        this.handleMessage(msg);
                    } catch (err) {
                        console.error('Error parsing WebSocket message:', err);
                    }
                };

                this.ws.onclose = (event) => {
                    console.log('🔌 WebSocket disconnected:', event.code, event.reason);
                    this.isConnected = false;
                    this.isConnecting = false;
                    
                    // Notify connection listeners
                    this.connectionListeners.forEach(cb => cb(false));
                    
                    // Reject pending connection promise if any
                    if (this.connectReject) {
                        this.connectReject(new Error('Connection closed'));
                        this.connectResolve = null;
                        this.connectReject = null;
                    }
                    
                    // Attempt reconnection (only if not manually closed)
                    if (event.code !== 1000) {
                        this.attemptReconnect();
                    }
                };

                this.ws.onerror = (err) => {
                    console.error('WebSocket error:', err);
                    this.isConnecting = false;
                    if (this.connectReject) {
                        this.connectReject(err);
                        this.connectResolve = null;
                        this.connectReject = null;
                    }
                };
            } catch (err) {
                console.error('Failed to create WebSocket:', err);
                this.isConnecting = false;
                reject(err);
            }
        });
    }

    /**
     * Handle incoming WebSocket messages
     * FIX: Normalize data format for consistent handling
     */
    handleMessage(msg) {
        console.log('📨 WebSocket message:', msg.type, msg.data ? '(with data)' : '');
        
        // Normalize detection data format (handle both camelCase and snake_case)
        if (msg.type === 'camera_detection' && msg.data) {
            msg.data = this.normalizeDetectionData(msg.data);
        }
        
        // Notify registered listeners for this event type
        const listeners = this.listeners.get(msg.type) || [];
        listeners.forEach(callback => {
            try {
                callback(msg);
            } catch (err) {
                console.error('Error in message listener:', err);
            }
        });

        // Also notify 'any' listeners
        const anyListeners = this.listeners.get('*') || [];
        anyListeners.forEach(callback => callback(msg));
    }

    /**
     * Normalize detection data to handle both camelCase and snake_case
     */
    normalizeDetectionData(data) {
        if (!data) return null;
        
        // If already has metrics, it's already in our format
        if (data.metrics) {
            return data;
        }
        
        // If snake_case, convert to camelCase for consistency
        return {
            riskScore: data.risk_score ?? data.riskScore,
            riskLevel: data.risk_level ?? data.riskLevel,
            peopleCount: data.people_count ?? data.peopleCount,
            vehicleCount: data.vehicle_count ?? data.vehicleCount,
            crowdDensity: data.crowd_density ?? data.crowdDensity,
            movementSpeed: data.movement_speed ?? data.movementSpeed,
            detectedObjects: data.detected_objects ?? data.detectedObjects,
            zoneId: data.zone_id ?? data.zoneId,
            zoneName: data.zone_name ?? data.zoneName,
            timestamp: data.timestamp,
            alert: data.alert,
            rawDetections: data.raw_detections ?? data.rawDetections,
            detectionMode: data.detection_mode ?? data.detectionMode
        };
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached, stopping');
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect().catch(err => {
                console.error('Reconnection failed:', err.message);
            });
        }, delay);
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close(1000, 'Manual disconnect');
            this.ws = null;
        }

        this.isConnected = false;
        this.isConnecting = false;
    }

    /**
     * Send a message through WebSocket
     */
    send(type, data = {}) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, ...data }));
            return true;
        }
        console.warn('WebSocket not connected, cannot send message');
        return false;
    }

    /**
     * Subscribe to a specific event type
     */
    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(eventType);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }

    /**
     * Subscribe to any event
     */
    onAny(callback) {
        return this.on('*', callback);
    }

    /**
     * Register a connection status listener
     */
    onConnectionChange(callback) {
        this.connectionListeners.push(callback);
        return () => {
            const index = this.connectionListeners.indexOf(callback);
            if (index > -1) {
                this.connectionListeners.splice(index, 1);
            }
        };
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return this.isConnected;
    }
}

// Export singleton instance
const socketService = new SocketService();

export default socketService;

// Export event types for consistency
export const WS_EVENTS = {
    CONNECTED: 'connected',
    DETECTION: 'detection',
    CAMERA_DETECTION: 'camera_detection',
    ALERT: 'alert',
    NEW_ALERT: 'new_alert',
    RISK_UPDATE: 'risk_update',
    ZONE_RISK_UPDATE: 'zone_risk_update',
    NEW_INCIDENT: 'new_incident',
    SIMULATION_EVENT: 'simulation_event',
    CAMERA_ALERT: 'camera_alert',
    INCIDENT_RESOLVED: 'incident_resolved',
    DASHBOARD_UPDATE: 'dashboardUpdate',
    MAP_INCIDENT: 'mapIncident',
};

// Usage examples:
/*
import socketService, { WS_EVENTS } from './services/socketService';

// Connect on app start
socketService.connect();

// Subscribe to alerts
const unsubscribe = socketService.on(WS_EVENTS.NEW_ALERT, (msg) => {
    console.log('New alert:', msg.payload);
});

// Later, unsubscribe
unsubscribe();

// Send a message
socketService.send('reportIncident', { data: incidentData });
*/

