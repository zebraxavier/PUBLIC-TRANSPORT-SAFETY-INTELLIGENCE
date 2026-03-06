const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);

// ─── WebSocket Server ───────────────────────────────────────────────────────
// Create WebSocket server separately, then attach to HTTP server
const wss = new WebSocket.Server({ noServer: true });

// Store connected clients globally
global.wssClients = new Set();
let wsClientCounter = 0;

// Handle WebSocket upgrade from HTTP server
server.on('upgrade', (request, socket, head) => {
    // Parse pathname from URL
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = url.pathname;
    
    console.log('WebSocket upgrade request for:', pathname);
    
    if (pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    ws.clientId = `ws-client-${++wsClientCounter}`;
    console.log('[WebSocket] Client connected:', ws.clientId);
    global.wssClients.add(ws);
    
    // Send welcome message
    ws.send(JSON.stringify({ 
        type: 'connected', 
        message: 'PTSI WebSocket connected',
        timestamp: new Date().toISOString()
    }));

// Handle incoming messages
    ws.on('message', async (message) => {
        try {
            const msg = JSON.parse(message.toString());
            console.log('\n' + '='.repeat(60));
            console.log('[WebSocket] Received message:', msg.type);
            console.log('[WebSocket] Message keys:', Object.keys(msg));
            if (msg.frame) {
                console.log('[WebSocket] Frame data length:', msg.frame.length);
            }
            console.log('='.repeat(60));
            
            // Handle camera frame messages
            if (msg.type === 'cameraFrame') {
                console.log('[WebSocket] Processing camera frame...');
                console.log('[WebSocket] Zone:', msg.zone_id || 'default');
                
                // Analyze the frame (now async)
                const { analyzeFrameWithAI } = require('./controllers/cameraController');
                const frameBuffer = msg.frame ? Buffer.from(msg.frame, 'base64') : null;
                
                if (frameBuffer) {
                    console.log('[WebSocket] Frame buffer created, length:', frameBuffer.length);
                    
                    // Call async function to get real YOLO detection
                    // FIX: Properly await the async function
                    let result;
                    try {
                        console.log('[WebSocket] Calling analyzeFrameWithAI...');
                        result = await analyzeFrameWithAI(frameBuffer, msg.zone_id || 'default', msg.zone_name || 'Unknown Zone');
                        console.log('[WebSocket] Analysis complete, result:', result.riskScore, result.riskLevel, result.detectionMode);
                    } catch (aiError) {
                        console.error('[WebSocket] AI Analysis error:', aiError.message);
                        // Send error response back to client
                        ws.send(JSON.stringify({
                            type: 'camera_detection_error',
                            error: aiError.message,
                            timestamp: new Date().toISOString()
                        }));
                        return;
                    }
                    
                    console.log('[WebSocket] Frame analyzed, risk score:', result.riskScore, 'mode:', result.detectionMode);
                    
                    // Prepare the detection data
                    const detectionData = {
                        riskScore: result.riskScore,
                        riskLevel: result.riskLevel,
                        detectedObjects: result.detectedObjects,
                        metrics: {
                            peopleCount: result.metrics.peopleCount,
                            vehicleCount: result.metrics.vehicleCount,
                            crowdDensity: result.metrics.crowdDensity,
                            congestionLevel: result.metrics.congestionLevel,
                            movementSpeed: result.metrics.movementSpeed,
                            movementLevel: result.metrics.movementLevel || 'LOW',
                            densityLevel: result.metrics.densityLevel || 'LOW'
                        },
                        // Include raw detections for bounding box overlay
                        rawDetections: result.rawDetections || [],
                        detectionMode: result.detectionMode || 'simulation',
                        alert: result.alert,
                        zoneId: result.zoneId,
                        zoneName: result.zoneName,
                        timestamp: result.timestamp ? result.timestamp.toISOString() : new Date().toISOString()
                    };
                    
                    // Send detection result back to client
                    console.log('[WebSocket] Sending camera_detection response...');
                    ws.send(JSON.stringify({
                        type: 'camera_detection',
                        data: detectionData,
                        timestamp: new Date().toISOString()
                    }));
                    
                    // Also broadcast to all clients
                    if (global.broadcast) {
                        console.log('[WebSocket] Broadcasting to all clients...');
                        global.broadcast({
                            type: 'camera_detection',
                            data: detectionData
                        });
                    }
                    const cameraAnalysisData = {
                        peopleCount: detectionData.metrics.peopleCount || 0,
                        vehicleCount: detectionData.metrics.vehicleCount || 0,
                        densityLevel: detectionData.metrics.densityLevel || 'LOW',
                        movementLevel: detectionData.metrics.movementLevel || 'LOW',
                        riskScore: detectionData.riskScore || 0,
                        zoneId: detectionData.zoneId,
                        zoneName: detectionData.zoneName,
                        timestamp: detectionData.timestamp
                    };

                    if (global.broadcast) {
                        console.log('[WebSocket] Broadcasting camera_analysis:', cameraAnalysisData);
                        global.broadcast({
                            type: 'camera_analysis',
                            data: cameraAnalysisData
                        });
                    }

                    if ((detectionData.riskScore || 0) > 70 && global.broadcast) {
                        const liveAlert = {
                            level: 'HIGH',
                            message: `High crowd congestion detected in ${detectionData.zoneName || 'Unknown Zone'}`,
                            riskScore: detectionData.riskScore || 0,
                            zoneName: detectionData.zoneName || 'Unknown Zone',
                            createdAt: new Date().toISOString()
                        };

                        console.log('[WebSocket] Broadcasting live_alert:', liveAlert);
                        global.broadcast({
                            type: 'live_alert',
                            data: liveAlert
                        });
                    }
                    
                    // Create alert if high risk
                    if (result.alert) {
                        try {
                            const Alert = require('./models/Alert');
                            const alert = new Alert({
                                title: `Safety Alert: ${result.riskLevel} Risk Detected`,
                                message: `Risk score: ${result.riskScore}. Detected ${result.metrics.peopleCount} people, ${result.metrics.vehicleCount} vehicles in ${result.zoneName}`,
                                severity: result.riskLevel === 'HIGH' ? 'danger' : 'warning',
                                zone_id: result.zoneId,
                                zone_name: result.zoneName,
                                simulated: result.detectionMode === 'simulation'
                            });
                            await alert.save();
                            
                            if (global.broadcast) {
                                global.broadcast({ type: 'camera_alert', data: { alert, analysis: result } });
                            }
                        } catch (e) {
                            console.warn('[WebSocket] Alert creation skipped:', e.message);
                        }
                    }
                } else {
                    console.log('[WebSocket] No frame data in message, skipping analysis');
                }
            }
        } catch (err) {
            console.error('[WebSocket] Error processing message:', err);
        }
    });

    ws.on('close', () => {
        console.log('[WebSocket] Client disconnected:', ws.clientId);
        global.wssClients.delete(ws);
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
    });
});

// Global broadcast function
global.broadcast = (data) => {
    const message = JSON.stringify({
        ...data,
        timestamp: new Date().toISOString()
    });
    
    global.wssClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
            } catch (e) {
                console.error('Broadcast error:', e.message);
            }
        }
    });
};

console.log('🔌 WebSocket server configured');

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/incidents', require('./routes/incidentRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/zones', require('./routes/zoneRoutes'));
app.use('/api/stream', require('./routes/streamRoutes'));
app.use('/api/vision', require('./routes/visionRoutes'));
app.use('/api/simulation', require('./routes/simulationRoutes'));

// New routes - Vehicles and Drivers
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));

// Camera Analyzer route
app.use('/api/camera', require('./routes/cameraRoutes'));

// Health check endpoint (must be before error handling)
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'PTSI Backend', timestamp: new Date() }));

// Error handling middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');
app.use(notFound);
app.use(errorHandler);

// ─── MongoDB ─────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ptsi_db';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB connected');
        // Try to seed data
        try {
            const { seedAll } = require('./seed/seedData');
            await seedAll();
        } catch (e) {
            console.log('⚠️ Seed data skipped:', e.message);
        }
        // Try to start simulation
        try {
            const { startSimulation } = require('./simulation/simulationEngine');
            startSimulation();
        } catch (e) {
            console.log('⚠️ Simulation skipped:', e.message);
        }
    })
    .catch((err) => {
        console.warn('⚠️  MongoDB not available, running in demo mode:', err.message);
    });

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 PTSI Backend running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server ready at ws://localhost:${PORT}/ws`);
});

