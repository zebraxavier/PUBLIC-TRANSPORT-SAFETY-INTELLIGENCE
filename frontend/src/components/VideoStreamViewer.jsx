import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, CameraOff, Send, Loader } from 'lucide-react';
import { sendDetection } from '../services/apiService';

// Configuration for frame capture - 200ms = 5 FPS (target 3-5 FPS)
const FRAME_INTERVAL = 200;
const FRAME_QUALITY = 0.6;
const CLASS_COLORS = {
    person: '#00ff88',
    car: '#00d4ff',
    bus: '#ff66cc',
    truck: '#ff9f43',
    motorcycle: '#ffe66d',
    bicycle: '#ff6b6b'
};

export default function VideoStreamViewer({ onDetection, zone }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const overlayCanvasRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);
    const wsRef = useRef(null);
    const frameCounterRef = useRef(0);

    const [streaming, setStreaming] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [lastResult, setLastResult] = useState(null);
    const [frameCount, setFrameCount] = useState(0);
    const [fps, setFps] = useState(0);
    const lastFrameTimeRef = useRef(Date.now());

    const drawBoundingBoxes = useCallback((detections) => {
        const video = videoRef.current;
        const canvas = overlayCanvasRef.current;
        if (!video || !canvas) return;

        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        if (!Array.isArray(detections) || detections.length === 0) return;

        detections.forEach((det) => {
            const bbox = det?.bbox;
            if (!bbox || bbox.length < 4) return;
            const [nx1, ny1, nx2, ny2] = bbox;
            const x = nx1 * width;
            const y = ny1 * height;
            const w = (nx2 - nx1) * width;
            const h = (ny2 - ny1) * height;
            const color = CLASS_COLORS[det.class] || '#ffffff';

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);

            let label = `${det.class} ${Math.round((det.confidence || 0) * 100)}%`;
            if (det.class === 'person' && det.track_id !== undefined) {
                label = `Person #${det.track_id}`;
            }

            ctx.font = '12px sans-serif';
            const textWidth = ctx.measureText(label).width;
            ctx.fillStyle = color;
            ctx.fillRect(x, Math.max(0, y - 18), textWidth + 8, 18);
            ctx.fillStyle = '#001018';
            ctx.fillText(label, x + 4, Math.max(12, y - 5));
        });
    }, []);

    // WebSocket connection for real-time updates
    const connectWebSocket = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
        
        const wsUrl = 'ws://localhost:5000/ws';
        console.log('🔌 Connecting to WebSocket:', wsUrl);
        
        try {
            wsRef.current = new WebSocket(wsUrl);
            
            wsRef.current.onopen = () => {
                console.log('✅ WebSocket connected for VideoStreamViewer');
            };
            
            wsRef.current.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    console.log('📨 WebSocket message:', msg.type);
                    
                    if (msg.type === 'camera_detection' || msg.type === 'cameraDetection') {
                        console.log('📊 Risk score update received:', msg.data?.riskScore);
                        
                        // FIX: Normalize data if needed (handle both camelCase and snake_case)
                        let data = msg.data;
                        
                        // Handle nested data
                        if (data && data.data) {
                            data = data.data;
                        }
                        
                        if (data && !data.metrics && data.risk_score !== undefined) {
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
                        
                        if (data && onDetection) {
                            onDetection(data);
                            setLastResult(data);
                            setFrameCount(prev => prev + 1);
                        }
                    }
                } catch (e) {
                    console.warn('WS parse error:', e);
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
    }, [onDetection]);

    const startCamera = useCallback(async () => {
        setError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setStreaming(true);
        } catch (err) {
            setError(`Camera error: ${err.message || 'Permission denied'}`);
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        setStreaming(false);
        setFrameCount(0);
    }, []);

    // Capture + send frames
    useEffect(() => {
        if (!streaming) return;
        
        // Connect WebSocket for real-time updates
        connectWebSocket();
        
        const captureAndSend = async () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState < 2) return;

            // Calculate FPS
            const now = Date.now();
            const delta = now - lastFrameTimeRef.current;
            if (delta > 0) {
                setFps(Math.round(1000 / delta));
            }
            lastFrameTimeRef.current = now;

            canvas.width = 320;
            canvas.height = 240;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, 320, 240);
            const base64 = canvas.toDataURL('image/jpeg', FRAME_QUALITY).split(',')[1];

            console.log('🖼️ Frame captured, sending to backend...');
            
            // Try WebSocket first for real-time updates
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                console.log('📤 Sending frame via WebSocket:', frameCounterRef.current++);
                wsRef.current.send(JSON.stringify({
                    type: 'cameraFrame',
                    frame: base64,
                    zone_id: zone?._id || 'default',
                    zone_name: zone?.name || 'Mobile Stream'
                }));
            } else {
                // Fallback to HTTP
                console.log('📤 Sending frame via HTTP API:', frameCounterRef.current++);
                setSending(true);
                try {
                    const res = await sendDetection({ frameData: base64, source: 'mobile', zoneId: zone?._id });
                    const result = res.data;
                    setLastResult(result);
                    setFrameCount(prev => prev + 1);
                    if (onDetection) onDetection(result);
                } catch {
                    // silently retry
                } finally {
                    setSending(false);
                }
            }
        };
        
        // Capture frames at the configured interval (200ms = 5 FPS)
        intervalRef.current = setInterval(captureAndSend, FRAME_INTERVAL);
        captureAndSend(); // Capture first frame immediately

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [streaming, zone, onDetection, connectWebSocket]);

    useEffect(() => {
        drawBoundingBoxes(lastResult?.rawDetections || lastResult?.raw_detections || []);
    }, [lastResult, drawBoundingBoxes]);

    return (
        <div className="space-y-3">
            {/* Video preview */}
            <div className="relative rounded-xl overflow-hidden bg-[#0a0f1e] border border-white/10" style={{ aspectRatio: '16/9' }}>
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                />
                <canvas ref={canvasRef} className="hidden" />
                <canvas
                    ref={overlayCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ objectFit: 'cover' }}
                />

                {!streaming && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <CameraOff size={36} className="text-slate-600" />
                        <p className="text-slate-500 text-sm">Camera not active</p>
                    </div>
                )}

                {streaming && (
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="badge-danger flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                            LIVE
                        </span>
                        {sending && <Loader size={12} className="text-cyan-400 animate-spin" />}
                    </div>
                )}

                {streaming && (
                    <div className="absolute top-3 right-3 text-xs text-slate-400 bg-black/50 px-2 py-1 rounded-lg">
                        Frames: {frameCount}
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-red-400 text-sm text-center px-4">{error}</p>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex gap-3">
                {!streaming ? (
                    <button onClick={startCamera} className="btn-neon flex items-center gap-2 flex-1 justify-center">
                        <Camera size={15} />
                        Start Camera Stream
                    </button>
                ) : (
                    <button onClick={stopCamera} className="btn-danger flex items-center gap-2 flex-1 justify-center">
                        <CameraOff size={15} />
                        Stop Stream
                    </button>
                )}
            </div>

            {/* Last detection result */}
            {lastResult?.detection && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-3 space-y-2"
                >
                    <p className="text-xs font-semibold text-cyan-400 flex items-center gap-2">
                        <Send size={11} /> Latest Detection
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                            ['People', lastResult.detection?.people_count ?? lastResult.detection?.peopleCount ?? '—'],
                            ['Vehicles', lastResult.detection?.vehicle_count ?? '—'],
                            ['Crowd Density', `${((lastResult.detection?.crowd_density || 0) * 100).toFixed(0)}%`],
                            ['Movement', lastResult.detection?.movement_speed || '—'],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                                <span className="text-slate-500">{k}</span>
                                <span className="text-slate-200 font-medium">{v}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <span className="text-xs text-slate-500">Risk Score</span>
                        <span className={`text-sm font-bold ${lastResult.riskScore >= 65 ? 'text-red-400' : lastResult.riskScore >= 35 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {lastResult.riskScore} — {lastResult.riskLevel?.toUpperCase()}
                        </span>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
