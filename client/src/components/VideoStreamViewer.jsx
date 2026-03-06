import { useEffect, useRef, useState } from 'react'
import { visionAPI } from '../services/apiService'
import { useApp } from '../context/AppContext'
import { motion } from 'framer-motion'

export default function VideoStreamViewer({ zoneId }) {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const intervalRef = useRef(null)
    const [status, setStatus] = useState('idle') // idle | starting | active | error
    const [stats, setStats] = useState(null)
    const [frameCount, setFrameCount] = useState(0)
    const { setLiveDetection } = useApp()

    const startStream = async () => {
        setStatus('starting')
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 640, height: 480 }, audio: false })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play()
            }
            setStatus('active')
            // Capture and send frame every 3 seconds
            intervalRef.current = setInterval(() => captureAndSendFrame(), 3000)
        } catch (err) {
            console.error('Camera error:', err)
            setStatus('error')
        }
    }

    const stopStream = () => {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
        if (intervalRef.current) clearInterval(intervalRef.current)
        if (videoRef.current) videoRef.current.srcObject = null
        streamRef.current = null
        setStatus('idle')
    }

    const captureAndSendFrame = async () => {
        if (!videoRef.current || !canvasRef.current) return
        const ctx = canvasRef.current.getContext('2d')
        canvasRef.current.width = 320
        canvasRef.current.height = 240
        ctx.drawImage(videoRef.current, 0, 0, 320, 240)
        const frame = canvasRef.current.toDataURL('image/jpeg', 0.7).split(',')[1]
        setFrameCount(f => f + 1)
        try {
            const res = await visionAPI.sendDetection({ frameData: frame, zoneId, source: 'mobile' })
            const d = res.data.detection
            setStats(d)
            setLiveDetection(d)
        } catch (e) {
            // Silent fail - backend may not be running
        }
    }

    useEffect(() => () => stopStream(), [])

    return (
        <div className="space-y-4">
            {/* Video */}
            <div className="relative rounded-2xl overflow-hidden bg-black/50" style={{ aspectRatio: '16/9' }}>
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <canvas ref={canvasRef} className="hidden" />

                {status === 'idle' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                        <div className="text-5xl mb-4">📷</div>
                        <h3 className="text-lg font-semibold text-white mb-2">Mobile Camera IoT Sensor</h3>
                        <p className="text-gray-400 text-sm mb-6">Use your device camera as a real-time transport monitoring sensor. Frames are analyzed by the AI service.</p>
                        <button onClick={startStream} className="btn-primary text-white text-sm font-semibold px-6 py-3">
                            🚀 Start Camera Stream
                        </button>
                    </div>
                )}

                {status === 'starting' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-gray-300 text-sm">Requesting camera access...</p>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl mb-3">⛔</div>
                            <p className="text-red-400 font-medium">Camera access denied</p>
                            <p className="text-gray-400 text-sm mt-1">Enable camera permission and try again</p>
                            <button onClick={startStream} className="btn-primary text-white text-sm mt-4 px-4 py-2">Retry</button>
                        </div>
                    </div>
                )}

                {status === 'active' && (
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs text-white font-medium">LIVE · {frameCount} frames</span>
                    </div>
                )}
            </div>

            {/* Controls */}
            {status === 'active' && (
                <div className="flex gap-3">
                    <button onClick={captureAndSendFrame} className="btn-primary text-white text-sm flex-1">
                        📸 Analyze Now
                    </button>
                    <button onClick={stopStream} className="btn-danger text-white text-sm flex-1">
                        ⏹ Stop Stream
                    </button>
                </div>
            )}

            {/* Detection stats */}
            {stats && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">Last Detection</div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            { label: 'People', value: stats.people_count, icon: '👥', color: 'text-blue-400' },
                            { label: 'Vehicles', value: stats.vehicle_count, icon: '🚗', color: 'text-orange-400' },
                            { label: 'Density', value: `${(stats.crowd_density * 100).toFixed(0)}%`, icon: '📊', color: 'text-purple-400' },
                            { label: 'Movement', value: stats.movement_speed, icon: '⚡', color: 'text-cyan-400' },
                        ].map(s => (
                            <div key={s.label} className="text-center">
                                <div className="text-xl">{s.icon}</div>
                                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                                <div className="text-xs text-gray-500">{s.label}</div>
                            </div>
                        ))}
                    </div>
                    <div className={`mt-3 text-center text-sm font-semibold ${stats.riskLevel === 'danger' ? 'text-red-400' : stats.riskLevel === 'warning' ? 'text-yellow-400' : 'text-green-400'}`}>
                        Risk Score: {stats.riskScore} — {stats.riskLevel?.toUpperCase()}
                    </div>
                </motion.div>
            )}
        </div>
    )
}
