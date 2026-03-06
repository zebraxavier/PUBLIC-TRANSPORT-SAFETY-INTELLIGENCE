import { useState } from 'react'
import GlassCard from '../components/GlassCard'
import VideoStreamViewer from '../components/VideoStreamViewer'
import { useApp } from '../context/AppContext'
import { useSimulation } from '../hooks/useSimulation'
import { motion } from 'framer-motion'

export default function LiveMonitoring() {
    const { liveDetection } = useApp()
    const { triggerScenario, loading, SCENARIOS } = useSimulation()
    const [lastScenario, setLastScenario] = useState(null)

    const handleSimulate = async (scenarioId) => {
        const result = await triggerScenario(scenarioId)
        if (result) setLastScenario({ ...result, id: scenarioId })
    }

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Live Monitoring</h1>
                <p className="text-sm text-gray-400 mt-1">Mobile IoT camera streaming and AI computer vision analysis</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Video Stream */}
                <GlassCard className="lg:col-span-2" transition={{ delay: 0 }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-semibold text-gray-300">📡 IoT Camera Feed</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Stream Active
                        </div>
                    </div>
                    <VideoStreamViewer />
                </GlassCard>

                {/* Live Detection Results */}
                <div className="space-y-4">
                    <GlassCard transition={{ delay: 0.1 }}>
                        <div className="text-sm font-semibold text-gray-300 mb-3">🧠 AI Detection Output</div>
                        {liveDetection ? (
                            <div className="space-y-3">
                                {[
                                    { label: '👥 People Count', value: liveDetection.people_count, color: 'text-blue-400' },
                                    { label: '🚗 Vehicle Count', value: liveDetection.vehicle_count, color: 'text-orange-400' },
                                    { label: '📊 Crowd Density', value: `${((liveDetection.crowd_density || 0) * 100).toFixed(0)}%`, color: 'text-purple-400' },
                                    { label: '⚡ Movement', value: liveDetection.movement_speed, color: 'text-cyan-400' },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5">
                                        <span className="text-xs text-gray-400">{item.label}</span>
                                        <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                                    </div>
                                ))}
                                {((liveDetection.riskScore !== undefined) || (liveDetection.risk_score !== undefined)) && (
                                    <div className={`text-center mt-3 py-2 rounded-lg text-sm font-bold ${(liveDetection.riskLevel || liveDetection.risk_category) === 'danger' ? 'bg-red-500/20 text-red-400' :
                                        (liveDetection.riskLevel || liveDetection.risk_category) === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-green-500/20 text-green-400'
                                        }`}>
                                        Risk: {liveDetection.riskScore ?? liveDetection.risk_score} — {(liveDetection.riskLevel || liveDetection.risk_category || 'SAFE')?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-600">
                                <div className="text-3xl mb-2">📊</div>
                                <p className="text-sm">Start camera or run simulation</p>
                            </div>
                        )}
                    </GlassCard>

                    {/* YOLO Info */}
                    <GlassCard transition={{ delay: 0.2 }}>
                        <div className="text-sm font-semibold text-gray-300 mb-3">🔬 CV Pipeline</div>
                        <div className="space-y-2 text-xs text-gray-500">
                            {['YOLOv8 Object Detection', 'Crowd Density Estimation', 'Optical Flow Analysis', 'Risk Score Inference', 'WebSocket Broadcast'].map((step, i) => (
                                <div key={step} className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[9px] text-indigo-400 font-bold">{i + 1}</div>
                                    <span>{step}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* Simulation Controls */}
            <GlassCard transition={{ delay: 0.3 }}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-sm font-semibold text-gray-300">🎮 Simulation Engine</div>
                        <div className="text-xs text-gray-500 mt-0.5">Trigger synthetic transport scenarios for testing</div>
                    </div>
                    {loading && (
                        <div className="flex items-center gap-2 text-xs text-indigo-400">
                            <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            Processing...
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {SCENARIOS.map(s => (
                        <button
                            key={s.id}
                            onClick={() => handleSimulate(s.id)}
                            disabled={loading}
                            className={`p-3 rounded-xl text-center transition-all duration-200 border ${s.color === 'red' ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-300' :
                                s.color === 'green' ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20 text-green-300' :
                                    'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-300'
                                } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                        >
                            <div className="text-2xl mb-1">{s.icon}</div>
                            <div className="text-xs font-semibold">{s.label}</div>
                        </button>
                    ))}
                </div>

                {/* Last simulation result */}
                {lastScenario && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <div className="text-xs text-indigo-400 font-semibold mb-2">✅ Last Simulation: {lastScenario.id}</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
                            <div><div className="text-blue-400 font-bold text-base">{lastScenario.detection?.people_count}</div><div className="text-gray-500">People</div></div>
                            <div><div className="text-orange-400 font-bold text-base">{lastScenario.detection?.vehicle_count}</div><div className="text-gray-500">Vehicles</div></div>
                            <div><div className="text-purple-400 font-bold text-base">{((lastScenario.detection?.crowd_density || 0) * 100).toFixed(0)}%</div><div className="text-gray-500">Density</div></div>
                            <div><div className={`font-bold text-base ${(lastScenario.riskScore ?? lastScenario.risk_score) >= 65 ? 'text-red-400' : (lastScenario.riskScore ?? lastScenario.risk_score) >= 35 ? 'text-yellow-400' : 'text-green-400'}`}>{(lastScenario.riskScore ?? lastScenario.risk_score)}</div><div className="text-gray-500">Risk Score</div></div>
                        </div>
                    </motion.div>
                )}
            </GlassCard>
        </div>
    )
}
