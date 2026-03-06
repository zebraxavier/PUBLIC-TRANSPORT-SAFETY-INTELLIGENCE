import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = 'ws://localhost:5000/ws';
const MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket() {
    const ws = useRef(null);
    const reconnectTimeout = useRef(null);
    const reconnectAttempts = useRef(0);
    const isManualClose = useRef(false);

    const [connected, setConnected] = useState(false);
    const [lastDetection, setLastDetection] = useState(null);
    const [lastAlert, setLastAlert] = useState(null);
    const [lastRiskUpdate, setLastRiskUpdate] = useState(null);
    const [alertCount, setAlertCount] = useState(0);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [liveZoneUpdate, setLiveZoneUpdate] = useState(null);

    const normalizeDetectionData = (data) => {
        if (!data) return null;

        if (data.metrics) {
            return {
                risk_score: data.riskScore,
                risk_level: data.riskLevel,
                people_count: data.metrics.peopleCount,
                vehicle_count: data.metrics.vehicleCount,
                crowd_density: data.metrics.crowdDensity,
                density_level: data.metrics.densityLevel,
                movement_speed: data.metrics.movementSpeed,
                movement_level: data.metrics.movementLevel,
                detected_objects: data.detectedObjects,
                zone_id: data.zoneId,
                zone_name: data.zoneName,
                timestamp: data.timestamp,
            };
        }

        if (data.risk_score !== undefined) {
            return data;
        }

        return {
            risk_score: data.riskScore,
            risk_level: data.riskLevel,
            people_count: data.peopleCount,
            vehicle_count: data.vehicleCount,
            crowd_density: data.crowdDensity,
            density_level: data.densityLevel,
            movement_speed: data.movementSpeed,
            movement_level: data.movementLevel,
            detected_objects: data.detectedObjects,
            zone_id: data.zoneId,
            zone_name: data.zoneName,
            timestamp: data.timestamp,
        };
    };

    const scheduleReconnect = useCallback((delayMs = 3000) => {
        if (isManualClose.current) return;

        if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
            console.warn('Max WebSocket reconnection attempts reached');
            return;
        }

        reconnectAttempts.current += 1;
        console.log(`Scheduling reconnect attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS} in ${Math.round(delayMs / 1000)} seconds...`);
        reconnectTimeout.current = setTimeout(() => {
            connect();
        }, delayMs);
    }, []);

    const connect = useCallback(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            console.log('WebSocket already OPEN, skipping');
            return;
        }

        if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
            console.log('WebSocket already CONNECTING, skipping');
            return;
        }

        isManualClose.current = false;
        console.log('Creating WebSocket connection to:', WS_URL);

        try {
            if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
                ws.current.close();
            }

            ws.current = new WebSocket(WS_URL);

            ws.current.onopen = (event) => {
                console.log('WebSocket connected successfully', event?.type || 'open');
                setConnected(true);
                reconnectAttempts.current = 0;

                if (reconnectTimeout.current) {
                    clearTimeout(reconnectTimeout.current);
                    reconnectTimeout.current = null;
                }
            };

            ws.current.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    console.log('WebSocket message received:', msg.type);

                    switch (msg.type) {
                        case 'connected':
                            console.log('Server confirmed connection:', msg.message);
                            break;

                        case 'detection':
                        case 'camera_detection':
                        case 'camera_analysis': {
                            let normalizedDetection = normalizeDetectionData(msg.data || msg.payload);

                            if (normalizedDetection && normalizedDetection.data) {
                                normalizedDetection = normalizeDetectionData(normalizedDetection.data);
                            }

                            if (normalizedDetection && !normalizedDetection.metrics) {
                                normalizedDetection.metrics = {
                                    peopleCount: normalizedDetection.people_count || normalizedDetection.peopleCount || 0,
                                    vehicleCount: normalizedDetection.vehicle_count || normalizedDetection.vehicleCount || 0,
                                    crowdDensity: normalizedDetection.crowd_density || normalizedDetection.crowdDensity || 0,
                                    movementSpeed: normalizedDetection.movement_speed || normalizedDetection.movementSpeed || 'LOW',
                                    movementLevel: normalizedDetection.movement_level || normalizedDetection.movementLevel || 'LOW',
                                    densityLevel: normalizedDetection.density_level || normalizedDetection.densityLevel || 'LOW',
                                };
                            }

                            setLastDetection(normalizedDetection);
                            if (normalizedDetection?.risk_score !== undefined) {
                                setLastRiskUpdate({ risk_score: normalizedDetection.risk_score });
                            }
                            console.log('Camera update received', normalizedDetection);
                            break;
                        }

                        case 'alert':
                        case 'new_alert':
                        case 'live_alert': {
                            const incomingAlert = msg.data || msg.payload || {};
                            const normalizedAlert = incomingAlert.severity
                                ? incomingAlert
                                : {
                                    _id: incomingAlert._id || `live-${Date.now()}`,
                                    title: incomingAlert.title || 'Live Safety Alert',
                                    message: incomingAlert.message || 'High crowd congestion detected',
                                    severity: incomingAlert.level === 'HIGH' ? 'danger' : 'warning',
                                    zoneName: incomingAlert.zoneName,
                                    riskScore: incomingAlert.riskScore,
                                    createdAt: incomingAlert.createdAt || new Date().toISOString(),
                                    isRead: false,
                                };
                            setLastAlert(normalizedAlert);
                            setAlertCount((count) => count + 1);
                            console.log('Live alert received', normalizedAlert);
                            break;
                        }

                        case 'risk_update':
                        case 'zone_risk_update':
                            if (Array.isArray(msg.data)) {
                                setLiveZoneUpdate(msg.data[0]);
                            } else {
                                setLiveZoneUpdate(msg.data);
                            }
                            setLastRiskUpdate(msg.data || msg.payload);
                            break;

                        case 'new_incident':
                            setLastAlert(msg.data || msg.payload);
                            setAlertCount((count) => count + 1);
                            break;

                        case 'incident_resolved':
                        case 'incident_deleted':
                            break;

                        case 'simulation_event':
                            if (msg.payload?.detection) {
                                const normalized = normalizeDetectionData(msg.payload.detection);
                                setLastDetection(normalized);
                            }
                            if (msg.payload?.risk_score !== undefined) {
                                setLastRiskUpdate({ risk_score: msg.payload.risk_score });
                            }
                            break;

                        case 'camera_alert':
                            if (msg.data?.alert) {
                                setLastAlert(msg.data.alert);
                                setAlertCount((count) => count + 1);
                            }
                            if (msg.data?.analysis) {
                                const normalized = normalizeDetectionData(msg.data.analysis);
                                setLastDetection(normalized);
                            }
                            break;

                        case 'dashboardUpdate':
                            setDashboardStats(msg.data);
                            break;

                        case 'mapIncident':
                            setLiveZoneUpdate(msg.data);
                            break;

                        default:
                            console.log('Unknown message type:', msg.type);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            ws.current.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                setConnected(false);
                scheduleReconnect(3000);
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            scheduleReconnect(5000);
        }
    }, [scheduleReconnect]);

    useEffect(() => {
        connect();

        return () => {
            console.log('Cleaning up WebSocket...');
            isManualClose.current = true;
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
            if (ws.current) {
                ws.current.close(1000, 'Component unmounting');
            }
        };
    }, [connect]);

    const clearAlertCount = useCallback(() => setAlertCount(0), []);

    return {
        connected,
        lastDetection,
        lastAlert,
        lastRiskUpdate,
        alertCount,
        clearAlertCount,
        dashboardStats,
        liveZoneUpdate,
    };
}
