import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Camera, CameraOff, AlertTriangle, 
    Users, Car, Activity, Shield, RefreshCw, Upload, Volume2, VolumeX, Zap, Eye
} from 'lucide-react';
import GlassCard from './GlassCard';

// Configuration for frame capture
const FRAME_INTERVAL = 200; // 200ms = 5 FPS (target 3-5 FPS)
const FRAME_QUALITY = 0.6; // Compress image to reduce bandwidth

// Class colors for bounding boxes
const CLASS_COLORS = {
    person: '#00ff00',     // Green
    car: '#00ffff',        // Cyan
    bus: '#ff00ff',        // Magenta
    truck: '#ff8800',      // Orange
    motorcycle: '#ffff00', // Yellow
    bicycle: '#ff4444'     // Red
};

export default function CameraAnalyzer({ zoneId = 'default', zoneName = 'Main Station' }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const overlayCanvasRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);
    const wsRef = useRef(null);
    const frameCounterRef = useRef(0);
    const [showOverlay, setShowOverlay] = useState(true);

    const [isStreaming, setIsStreaming] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAlert, setShowAlert] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [analysisHistory, setAnalysisHistory] = useState([]);
    const [fps, setFps] = useState(0);
    const lastFrameTimeRef = useRef(Date.now());

    // WebSocket connection for real-time updates - FIX: Use shared socket service
    const connectWebSocket = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
        
        const wsUrl = 'ws://localhost:5000/ws';
        console.log('🔌 Connecting to WebSocket:', wsUrl);
        
        try {
            wsRef.current = new WebSocket(wsUrl);
            
            wsRef.current.onopen = () => {
                console.log('✅ WebSocket connected for camera');
            };
            
            wsRef.current.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    console.log('\n' + '='.repeat(60));
                    console.log('[Frontend WebSocket] Message received');
                    console.log('[Frontend WebSocket] Type:', msg.type);
                    console.log('[Frontend WebSocket] Keys:', Object.keys(msg));
                    console.log('='.repeat(60));
                    
                    // FIX: Handle both camelCase and snake_case data formats
                    if (msg.type === 'camera_detection' || msg.type === 'cameraDetection') {
                        console.log('[Frontend] Detection data received');
                        console.log('[Frontend] Risk score:', msg.data?.riskScore);
                        console.log('[Frontend] People count:', msg.data?.metrics?.peopleCount);
                        console.log('[Frontend] Vehicle count:', msg.data?.metrics?.vehicleCount);
                        console.log('[Frontend] Movement level:', msg.data?.metrics?.movementLevel);
                        console.log('[Frontend] Density level:', msg.data?.metrics?.densityLevel);
                        console.log('[Frontend] Detection mode:', msg.data?.detectionMode);
                        console.log('[Frontend] Raw detections:', msg.data?.rawDetections?.length);
                        
                        // Normalize data if needed
                        let data = msg.data;
                        
                        // Handle the case where data is nested under "data" property
                        if (data && data.data) {
                            data = data.data;
                        }
                        
                        if (data && !data.metrics && data.risk_score !== undefined) {
                            // Convert snake_case to camelCase
                            data = {
                                riskScore: data.risk_score,
                                riskLevel: data.risk_level,
                                peopleCount: data.people_count,
                                vehicleCount: data.vehicle_count,
                                crowdDensity: data.crowd_density,
                                movementSpeed: data.movement_speed,
                                detectedObjects: data.detected_objects,
                                zoneId: data.zone_id,
                                zoneName: data.zone_name,
                                timestamp: data.timestamp,
                                alert: data.alert,
                                rawDetections: data.raw_detections,
                                detectionMode: data.detection_mode,
                                metrics: {
                                    peopleCount: data.people_count,
                                    vehicleCount: data.vehicle_count,
                                    crowdDensity: data.crowd_density,
                                    movementSpeed: data.movement_speed,
                                    movementLevel: data.movement_level || 'LOW',
                                    densityLevel: data.density_level || 'LOW'
                                }
                            };
                        }
                        
                        // Ensure metrics exist
                        if (data && !data.metrics) {
                            data.metrics = {
                                peopleCount: data.peopleCount || 0,
                                vehicleCount: data.vehicleCount || 0,
                                crowdDensity: data.crowdDensity || 0,
                                movementSpeed: data.movementSpeed || 'LOW',
                                movementLevel: data.movementLevel || 'LOW',
                                densityLevel: data.densityLevel || 'LOW'
                            };
                        }
                        
                        console.log('[Frontend] Normalized data - people:', data.metrics?.peopleCount, 'vehicles:', data.metrics?.vehicleCount);
                        
                        // Update UI with real-time detection data
                        if (data) {
                            setAnalysisResult(data);
                            setAnalysisHistory(prev => [data, ...prev].slice(0, 10));
                            console.log('[Frontend] Analysis result updated, score:', data.riskScore, 'level:', data.riskLevel);
                            if (data.alert || data.riskLevel === 'HIGH') {
                                setShowAlert(true);
                                if (soundEnabled) playAlertSound();
                                setTimeout(() => setShowAlert(false), 3000);
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[Frontend] WS parse error:', e);
                }
            };
            
            wsRef.current.onerror = (err) => {
                console.error('❌ WebSocket error:', err);
            };
            
            wsRef.current.onclose = () => {
                console.log('🔌 WebSocket closed, reconnecting in 3s...');
                setTimeout(connectWebSocket, 3000);
            };
        } catch (e) {
            console.error('WebSocket connection failed:', e);
        }
    }, [soundEnabled]);

    const analyzeFrame = async (frameBase64, zId, zName) => {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        
        console.log('\n' + '='.repeat(60));
        console.log('[Frontend] analyzeFrame called');
        console.log('[Frontend] Zone:', zId, zName);
        console.log('[Frontend] Frame length:', frameBase64?.length);
        console.log('='.repeat(60));
        
        // Try WebSocket first for real-time updates
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log('[Frontend] Sending frame via WebSocket, counter:', frameCounterRef.current++);
            
            const message = {
                type: 'cameraFrame',
                frame: frameBase64,
                zone_id: zId,
                zone_name: zName
            };
            console.log('[Frontend] WebSocket message keys:', Object.keys(message));
            
            wsRef.current.send(JSON.stringify(message));
            console.log('[Frontend] Frame sent via WebSocket successfully');
            // Return null to indicate we're waiting for WebSocket response
            return null;
        } else {
            console.log('[Frontend] WebSocket not connected, using HTTP fallback');
        }
        
        // Fallback to HTTP
        console.log('[Frontend] Sending frame via HTTP API');
        const response = await fetch(`${API_BASE}/camera/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frame_base64: frameBase64, zone_id: zId, zone_name: zName })
        });
        const data = await response.json();
        console.log('[Frontend] Frame analysis result:', data.data?.riskScore);
        return data.data;
    };

    const startCamera = async () => {
        try {
            setError(null);
            console.log('📷 Starting camera...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setIsStreaming(true);
                // Connect WebSocket for real-time updates
                connectWebSocket();
                videoRef.current.onloadedmetadata = () => startAnalysis();
            }
        } catch (err) {
            console.error('Camera error:', err);
            setError('Unable to access camera. Please grant camera permissions.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsStreaming(false);
        frameCounterRef.current = 0;
    };

    const captureFrame = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !isStreaming) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Calculate FPS using ref to avoid re-renders
        const now = Date.now();
        const delta = now - lastFrameTimeRef.current;
        if (delta > 0) {
            setFps(Math.round(1000 / delta));
        }
        lastFrameTimeRef.current = now;
        
        const ctx = canvas.getContext('2d');
        
        // Resize for performance (smaller = faster processing)
        const targetWidth = 320;
        const targetHeight = 240;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        
        // Compress frame to reduce bandwidth
        const frameBase64 = canvas.toDataURL('image/jpeg', FRAME_QUALITY).split(',')[1];
        
        console.log('🖼️ Frame captured:', frameBase64.substring(0, 50) + '...');
        
        setLoading(true);
        try {
            const result = await analyzeFrame(frameBase64, zoneId, zoneName);
            // Only update state if we got a result (HTTP fallback)
            if (result) {
                console.log('✅ Frame analyzed, risk score:', result.riskScore);
                setAnalysisResult(result);
                setAnalysisHistory(prev => [result, ...prev].slice(0, 10));
                if (result.alert || result.riskLevel === 'HIGH') {
                    setShowAlert(true);
                    if (soundEnabled) playAlertSound();
                    setTimeout(() => setShowAlert(false), 3000);
                }
            }
        } catch (err) {
            console.error('Analysis error:', err);
        } finally {
            setLoading(false);
        }
    }, [isStreaming, zoneId, zoneName, soundEnabled]);

    const startAnalysis = () => {
        console.log('🎬 Starting frame capture analysis with interval:', FRAME_INTERVAL, 'ms');
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(captureFrame, FRAME_INTERVAL);
        captureFrame(); // Capture first frame immediately
    };

    const playAlertSound = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('Audio not supported');
        }
    };

    useEffect(() => {
        return () => { stopCamera(); };
    }, []);

    const getRiskColor = (level) => {
        switch (level) {
            case 'HIGH': return 'text-red-500';
            case 'MEDIUM': return 'text-yellow-500';
            default: return 'text-green-500';
        }
    };

    const getRiskBgColor = (level) => {
        switch (level) {
            case 'HIGH': return 'bg-red-500/20 border-red-500/50';
            case 'MEDIUM': return 'bg-yellow-500/20 border-yellow-500/50';
            default: return 'bg-green-500/20 border-green-500/50';
        }
    };

    // Draw bounding boxes on overlay canvas
    const drawBoundingBoxes = useCallback((detections, videoWidth, videoHeight) => {
        const canvas = overlayCanvasRef.current;
        if (!canvas || !detections || detections.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        
        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        detections.forEach(det => {
            const bbox = det.bbox;
            if (!bbox || bbox.length < 4) return;
            
            // bbox is [x1, y1, x2, y2] in normalized 0-1 coordinates
            const [nx1, ny1, nx2, ny2] = bbox;
            const x1 = nx1 * videoWidth;
            const y1 = ny1 * videoHeight;
            const x2 = nx2 * videoWidth;
            const y2 = ny2 * videoHeight;
            const width = x2 - x1;
            const height = y2 - y1;
            
            const color = CLASS_COLORS[det.class] || '#ffffff';
            const confidence = det.confidence || 0;
            
            // Draw bounding box
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x1, y1, width, height);
            
            // Draw label background
            const label = `${det.class} ${(confidence * 100).toFixed(0)}%`;
            ctx.fillStyle = color;
            ctx.font = '12px sans-serif';
            const textWidth = ctx.measureText(label).width;
            ctx.fillRect(x1, y1 - 18, textWidth + 8, 18);
            
            // Draw label text
            ctx.fillStyle = '#000';
            ctx.fillText(label, x1 + 4, y1 - 4);
        });
    }, []);

    // Update overlay when analysis result changes
    useEffect(() => {
        if (analysisResult?.rawDetections && videoRef.current) {
            const video = videoRef.current;
            if (video.videoWidth && video.videoHeight) {
                drawBoundingBoxes(
                    analysisResult.rawDetections,
                    video.videoWidth,
                    video.videoHeight
                );
            }
        }
    }, [analysisResult, drawBoundingBoxes]);

    return (
        <div className="space-y-4">
            <canvas ref={canvasRef} className="hidden" />
            <GlassCard className="relative overflow-hidden">
                <div className="relative aspect-video bg-black rounded-lg">
                    {isStreaming ? (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            {/* Overlay canvas for bounding boxes */}
                            <canvas 
                                ref={overlayCanvasRef} 
                                className="absolute inset-0 w-full h-full pointer-events-none"
                                style={{ objectFit: 'cover' }}
                            />
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                            <CameraOff size={48} className="text-slate-600 mb-4" />
                            <p className="text-slate-500 text-sm">Camera is off</p>
                            <p className="text-slate-600 text-xs mt-1">Click "Start Camera" to begin analysis</p>
                        </div>
                    )}
                    {loading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <RefreshCw size={32} className="text-cyan-400 animate-spin" />
                        </div>
                    )}
                    <AnimatePresence>
                        {showAlert && analysisResult?.alert && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="absolute inset-0 flex items-center justify-center bg-red-500/30"
                            >
                                <div className={`p-6 rounded-xl border-2 ${getRiskBgColor(analysisResult.riskLevel)}`}>
                                    <AlertTriangle size={48} className="text-red-500 mx-auto mb-2" />
                                    <p className="text-white font-bold text-xl text-center">{analysisResult.riskLevel} RISK DETECTED</p>
                                    <p className="text-white/80 text-sm text-center mt-2">Risk Score: {analysisResult.riskScore}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                {!isStreaming ? (
                                    <button onClick={startCamera} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium">
                                        <Camera size={16} /> Start Camera
                                    </button>
                                ) : (
                                    <button onClick={stopCamera} className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium">
                                        <CameraOff size={16} /> Stop
                                    </button>
                                )}
                            </div>
                            {isStreaming && (
                                <div className="flex gap-2">
                                    <button onClick={captureFrame} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                                        <Upload size={16} /> Analyze Now
                                    </button>
                                    <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-2 rounded-lg text-sm font-medium ${soundEnabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                        {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 rounded-lg">
                        <p className="text-white text-xs font-medium">{zoneName}</p>
                        <p className="text-slate-400 text-[10px]">Zone ID: {zoneId}</p>
                    </div>
                    {isStreaming && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-red-400 text-xs font-medium">LIVE</span>
                        </div>
                    )}
                </div>
            </GlassCard>
            {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
            {analysisResult && (
                <GlassCard className="p-4">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-cyan-400" /> Real-time Analysis
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className={`p-3 rounded-lg ${getRiskBgColor(analysisResult.riskLevel)} border`}>
                            <div className="flex items-center justify-between mb-1">
                                <Shield size={14} className={getRiskColor(analysisResult.riskLevel)} />
                                <span className={`text-xs font-bold ${getRiskColor(analysisResult.riskLevel)}`}>{analysisResult.riskLevel}</span>
                            </div>
                            <p className="text-2xl font-black text-white">{analysisResult.riskScore}</p>
                            <p className="text-[10px] text-slate-400">Risk Score</p>
                        </div>
                        <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                            <div className="flex items-center justify-between mb-1"><Users size={14} className="text-cyan-400" /></div>
                            <p className="text-2xl font-black text-white">{analysisResult.metrics?.peopleCount || '—'}</p>
                            <p className="text-[10px] text-slate-400">People Detected</p>
                        </div>
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                            <div className="flex items-center justify-between mb-1"><Car size={14} className="text-purple-400" /></div>
                            <p className="text-2xl font-black text-white">{analysisResult.metrics?.vehicleCount || '—'}</p>
                            <p className="text-[10px] text-slate-400">Vehicles</p>
                        </div>
                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                            <div className="flex items-center justify-between mb-1"><Activity size={14} className="text-yellow-400" /></div>
                            <p className="text-2xl font-black text-white">{Math.round((analysisResult.metrics?.crowdDensity || 0) * 100)}%</p>
                            <p className="text-[10px] text-slate-400">Crowd Density</p>
                        </div>
                        {/* FIXED: Add Movement Level and Density Level display */}
                        {analysisResult.metrics?.movementLevel && (
                            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                                <div className="flex items-center justify-between mb-1">
                                    <Activity size={14} className="text-orange-400" />
                                </div>
                                <p className="text-2xl font-black text-white">{analysisResult.metrics.movementLevel}</p>
                                <p className="text-[10px] text-slate-400">Movement Level</p>
                            </div>
                        )}
                        {analysisResult.metrics?.densityLevel && (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                <div className="flex items-center justify-between mb-1">
                                    <Users size={14} className="text-green-400" />
                                </div>
                                <p className="text-2xl font-black text-white">{analysisResult.metrics.densityLevel}</p>
                                <p className="text-[10px] text-slate-400">Density Level</p>
                            </div>
                        )}
                    </div>
                    {analysisResult.detectedObjects?.length > 0 && (
                        <div className="mt-4">
                            <p className="text-xs text-slate-400 mb-2">Detected Objects:</p>
                            <div className="flex flex-wrap gap-2">
                                {analysisResult.detectedObjects.map((obj, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">{obj.type} ({obj.count})</span>
                                ))}
                            </div>
                        </div>
                    )}
                </GlassCard>
            )}
            {analysisHistory.length > 1 && (
                <GlassCard className="p-4">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Activity size={16} className="text-cyan-400" /> Recent Analysis History
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {analysisHistory.slice(1).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded text-xs">
                                <span className="text-slate-400">{new Date(item.timestamp).toLocaleTimeString()}</span>
                                <div className="flex gap-4">
                                    <span className="text-slate-300">Score: {item.riskScore}</span>
                                    <span className={getRiskColor(item.riskLevel)}>{item.riskLevel}</span>
                                    <span className="text-cyan-400">{item.metrics?.peopleCount || 0} people</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}
        </div>
    );
}

