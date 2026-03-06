/**
 * Camera Analyzer Controller
 * Handles real-time camera frame analysis for transport safety detection
 * Now integrates with Python AI service (YOLO) for real object detection
 * 
 * FIXED: Updated to handle new data format with density_level and movement_level
 * FIXED: Added comprehensive debug logging for pipeline verification
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// AI Service configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_RETRY_INTERVAL_MS = parseInt(process.env.AI_RETRY_INTERVAL_MS || '10000', 10);

// Flag to use simulation mode when AI service is unavailable
let useSimulation = false;
let lastAIFailureAt = 0;

/**
 * Call the Python AI service for real YOLO detection
 * Falls back to simulation if service is unavailable
 * FIXED: Added comprehensive debug logging
 */
async function callAIService(frameBase64, zoneId, zoneName) {
    console.log('\n' + '='.repeat(60));
    console.log('[AI Service] Calling AI service with frame, zone:', zoneId);
    console.log('[AI Service] Frame data length:', frameBase64?.length);
    console.log('='.repeat(60));
    
    try {
        console.log('[AI Service] Making POST request to:', `${AI_SERVICE_URL}/detect`);
        
        const response = await axios.post(`${AI_SERVICE_URL}/detect`, {
            frame: frameBase64,
            source: 'webcam',
            zone_id: zoneId
        }, {
            timeout: 15000, // Increased timeout for YOLO processing
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('[AI Service] Response received');
        console.log('[AI Service] Success:', response.data?.success);
        console.log('[AI Service] Data keys:', response.data?.data ? Object.keys(response.data.data) : 'none');
        
        if (response.data && response.data.success) {
            // Service recovered: clear fallback mode.
            useSimulation = false;
            lastAIFailureAt = 0;
            const data = response.data.data;
            console.log('[AI Service] Detection results:');
            console.log('  - people_count:', data.people_count);
            console.log('  - vehicle_count:', data.vehicle_count);
            console.log('  - crowd_density:', data.crowd_density);
            console.log('  - movement_level:', data.movement_level);
            console.log('  - density_level:', data.density_level);
            console.log('  - risk_score:', data.risk_score);
            console.log('  - risk_level:', data.risk_level);
            console.log('  - detection_mode:', data.detection_mode);
            console.log('  - detections:', data.detections?.length);
            
            return data;
        }
        throw new Error('Invalid AI service response: ' + JSON.stringify(response.data));
    } catch (error) {
        console.error('[AI Service] Error:', error.message);
        if (error.response) {
            console.error('[AI Service] Response status:', error.response.status);
            console.error('[AI Service] Response data:', error.response.data);
        }
        console.warn('[AI Service] Falling back to simulation');
        useSimulation = true;
        lastAIFailureAt = Date.now();
        return null;
    }
}

/**
 * Convert detection results from AI service format to frontend format
 * FIXED: Updated to handle new fields: density_level, movement_level
 */
function convertDetectionResult(aiResult, zoneId, zoneName) {
    const peopleCount = aiResult.people_count || 0;
    const vehicleCount = aiResult.vehicle_count || 0;
    const crowdDensity = aiResult.crowd_density || 0;
    const congestionLevel = aiResult.congestion_level || 0;
    const movementSpeed = aiResult.movement_speed || 'LOW';
    const movementLevel = aiResult.movement_level || 'LOW';  // FIXED: Add movement_level
    const densityLevel = aiResult.density_level || 'LOW';  // FIXED: Add density_level
    const riskScore = aiResult.risk_score || 0;
    const riskLevel = aiResult.risk_level || 'LOW';
    const detections = aiResult.detections || [];
    
    // Convert detections to detected objects format
    const detectedObjects = [];
    const objectCounts = {};
    
    detections.forEach(d => {
        const type = d.class;
        objectCounts[type] = (objectCounts[type] || 0) + 1;
    });
    
    Object.entries(objectCounts).forEach(([type, count]) => {
        detectedObjects.push({ type, count });
    });
    
    // Determine alert status based on risk level
    const alert = riskLevel === 'HIGH' || riskLevel === 'danger' || crowdDensity > 0.8;

    return {
        riskScore: Math.round(riskScore),
        riskLevel: riskLevel.toUpperCase(),
        detectedObjects,
        alert,
        metrics: {
            peopleCount,
            vehicleCount,
            crowdDensity: parseFloat(crowdDensity.toFixed(2)),
            congestionLevel: parseFloat(congestionLevel.toFixed(2)),
            movementSpeed,
            movementLevel,  // FIXED: Add movement_level to metrics
            densityLevel    // FIXED: Add density_level to metrics
        },
        // Include raw detections for bounding box overlay
        rawDetections: detections,
        detectionMode: aiResult.detection_mode || 'simulation',
        zoneId,
        zoneName,
        timestamp: new Date()
    };
}

// Non-random fallback when AI is unavailable.
// This avoids showing fake crowd counts in live monitoring.
function simulateDetection(zoneId, zoneName) {
    console.warn('[Fallback] AI unavailable. Returning non-random safe defaults.');

    return {
        riskScore: 0,
        riskLevel: 'LOW',
        detectedObjects: [],
        alert: false,
        metrics: {
            peopleCount: 0,
            vehicleCount: 0,
            crowdDensity: 0,
            congestionLevel: 0,
            movementSpeed: 'LOW',
            movementLevel: 'LOW',
            densityLevel: 'LOW'
        },
        rawDetections: [],
        detectionMode: 'unavailable',
        zoneId,
        zoneName,
        timestamp: new Date()
    };
}

/**
 * Main AI analysis function - calls Python service or falls back to simulation
 * FIXED: Added comprehensive debug logging
 */
async function analyzeFrameWithAI(frameBuffer, zoneId, zoneName) {
    console.log('\n' + '='.repeat(60));
    console.log('[AI Analysis] Starting frame analysis');
    console.log('[AI Analysis] Frame buffer type:', Buffer.isBuffer(frameBuffer) ? 'Buffer' : typeof frameBuffer);
    console.log('[AI Analysis] Frame buffer length:', frameBuffer?.length);
    const now = Date.now();
    const retryWindowElapsed = now - lastAIFailureAt >= AI_RETRY_INTERVAL_MS;
    console.log('[AI Analysis] Simulation mode:', useSimulation);
    console.log('[AI Analysis] Retry window elapsed:', retryWindowElapsed);
    console.log('='.repeat(60));
    
    // Try AI service unless fallback mode is active and retry window has not elapsed.
    const shouldTryAI = !!frameBuffer && (!useSimulation || retryWindowElapsed);
    if (shouldTryAI) {
        try {
            // Convert buffer to base64 if needed
            const frameBase64 = Buffer.isBuffer(frameBuffer) 
                ? frameBuffer.toString('base64')
                : frameBuffer;
            
            console.log('[AI Analysis] Calling AI service...');
            const aiResult = await callAIService(frameBase64, zoneId, zoneName);
            
            if (aiResult) {
                console.log('[AI Analysis] Real YOLO detection result:', aiResult.risk_score);
                return convertDetectionResult(aiResult, zoneId, zoneName);
            } else {
                console.log('[AI Analysis] AI service returned null, using simulation');
            }
        } catch (error) {
            console.warn('[AI Analysis] Service call failed:', error.message);
            console.log('[AI Analysis] Using simulation fallback');
        }
    } else if (useSimulation && frameBuffer) {
        const msRemaining = Math.max(0, AI_RETRY_INTERVAL_MS - (now - lastAIFailureAt));
        console.log(`[AI Analysis] Skipping AI call during cooldown (${msRemaining}ms remaining)`);
    }
    
    // Fall back to simulation
    return simulateDetection(zoneId, zoneName);
}

// POST /api/camera/analyze - Analyze camera frame
exports.analyzeFrame = async (req, res) => {
    try {
        const { frame_base64, image_url, zone_id, zone_name, stream_id } = req.body;

        // Validate input
        if (!frame_base64 && !image_url) {
            return res.status(400).json({
                success: false,
                error: 'Either frame_base64 or image_url is required'
            });
        }

        const frameBuffer = frame_base64 ? Buffer.from(frame_base64, 'base64') : null;
        const zoneId = zone_id || 'default';
        const zoneName = zone_name || 'Unknown Zone';

        console.log('\n[Camera Controller] analyzeFrame called');
        console.log('[Camera Controller] Zone:', zoneId, zoneName);

        // Analyze the frame
        const result = await analyzeFrameWithAI(frameBuffer, zoneId, zoneName);

        console.log('[Camera Controller] Analysis complete:', result.riskScore, result.riskLevel);

// If high risk, create alert
        if (result.alert) {
            const Alert = require('../models/Alert');
            const alert = new Alert({
                title: `Safety Alert: ${result.riskLevel} Risk Detected`,
                message: `Risk score: ${result.riskScore}. Detected ${result.metrics.peopleCount} people, ${result.metrics.vehicleCount} vehicles in ${zoneName}`,
                severity: result.riskLevel === 'HIGH' ? 'danger' : 'warning',
                zone_id: zoneId,
                zone_name: zoneName,
                simulated: true
            });
            await alert.save();

            // Broadcast alert via WebSocket
            if (global.broadcast) {
                global.broadcast({ type: 'camera_alert', data: { alert, analysis: result } });
            }
        }

        // ALWAYS broadcast detection results for live updates (not just alerts)
        if (global.broadcast) {
            global.broadcast({
                type: 'camera_detection',
                data: {
                    riskScore: result.riskScore,
                    riskLevel: result.riskLevel,
                    detectedObjects: result.detectedObjects,
                    metrics: result.metrics,
                    rawDetections: result.rawDetections || [],
                    detectionMode: result.detectionMode,
                    alert: result.alert,
                    zoneId: result.zoneId,
                    zoneName: result.zoneName,
                    timestamp: result.timestamp
                }
            });
            console.log("[Camera Controller] Broadcasting camera_detection event:", result.riskScore);
        }

        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error('[Camera Controller] Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/camera/analyze-multipart - Handle multipart file upload
exports.analyzeMultipart = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        const { zone_id, zone_name } = req.body;
        const frameBuffer = req.file.buffer;
        const zoneId = zone_id || 'default';
        const zoneName = zone_name || 'Upload Zone';

        // Analyze the frame
        const result = await analyzeFrameWithAI(frameBuffer, zoneId, zoneName);

        // Broadcast detection results
        if (global.broadcast) {
            global.broadcast({
                type: 'camera_detection',
                data: {
                    riskScore: result.riskScore,
                    riskLevel: result.riskLevel,
                    detectedObjects: result.detectedObjects,
                    metrics: result.metrics,
                    rawDetections: result.rawDetections || [],
                    detectionMode: result.detectionMode,
                    alert: result.alert,
                    zoneId: result.zoneId,
                    zoneName: result.zoneName,
                    timestamp: result.timestamp
                }
            });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/camera/status - Get camera analyzer status
exports.getStatus = async (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'active',
            model: 'transport-safety-v1',
            supportedFeatures: [
                'people_detection',
                'vehicle_detection',
                'crowd_density',
                'congestion_analysis',
                'accident_detection',
                'dangerous_behavior'
            ],
            lastUpdate: new Date()
        }
    });
};

// Export the AI analysis function for WebSocket use
exports.analyzeFrameWithAI = analyzeFrameWithAI;

