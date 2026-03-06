import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Camera, Play, Zap, AlertCircle, Users, Car,
    Activity, Wind, Clock, MapPin
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import VideoStreamViewer from '../components/VideoStreamViewer';
import RiskGauge from '../components/RiskGauge';
import { triggerSimulation } from '../services/apiService';
import { useWebSocket } from '../hooks/useWebSocket';

const SCENARIOS = [
    { id: 'overcrowding', label: 'Overcrowding', icon: Users, color: '#ff3366', desc: 'High crowd density' },
    { id: 'traffic_surge', label: 'Traffic Surge', icon: Car, color: '#ff6b35', desc: 'Vehicle congestion' },
    { id: 'suspicious_movement', label: 'Suspicion', icon: AlertCircle, color: '#ffb347', desc: 'Erratic movement' },
    { id: 'congestion', label: 'Congestion', icon: Wind, color: '#7b61ff', desc: 'Mixed flow issue' },
    { id: 'emergency', label: 'Emergency', icon: Zap, color: '#ff0040', desc: 'Evacuation pattern' },
    { id: 'normal', label: 'All Clear', icon: Activity, color: '#00ff88', desc: 'Normal traffic' },
];

export default function LiveMonitoring() {
    const { connected, lastDetection } = useWebSocket();
    const [activeScenario, setActiveScenario] = useState(null);
    const [simulating, setSimulating] = useState(false);
    const [simResult, setSimResult] = useState(null);
    const [camDetection, setCamDetection] = useState(null);

    const runSimulation = useCallback(async (scenarioId) => {
        setSimulating(true);
        setActiveScenario(scenarioId);
        try {
            const res = await triggerSimulation(scenarioId);
            setSimResult(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setSimulating(false);
        }
    }, []);

    const detection = camDetection?.detection || camDetection || lastDetection;
    const riskScore = camDetection?.riskScore ?? simResult?.riskScore ?? lastDetection?.riskScore ?? lastDetection?.risk_score ?? 0;
    const riskLevel = camDetection?.riskLevel ?? simResult?.riskLevel ?? 'safe';
    const rawDetections = camDetection?.rawDetections || camDetection?.raw_detections || [];
    const peopleOnCamera = rawDetections
        .filter(d => d?.class === 'person')
        .map((person, index) => {
            const bbox = person.bbox || [0, 0, 0, 0];
            const centerX = ((bbox[0] + bbox[2]) / 2) * 100;
            const centerY = ((bbox[1] + bbox[3]) / 2) * 100;
            const id = person.track_id !== undefined ? person.track_id : index + 1;
            return {
                id,
                confidence: Math.round((person.confidence || 0) * 100),
                position: `${Math.round(centerX)}%, ${Math.round(centerY)}%`
            };
        });

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">Live Monitoring</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Phone camera IoT stream + simulation control</p>
                </div>
                <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${connected ? 'border-green-500/30 bg-green-500/5 text-green-400' : 'border-red-500/30 bg-red-500/5 text-red-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                    {connected ? 'WebSocket Live' : 'Reconnectingâ€¦'}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Camera Stream */}
                <div className="lg:col-span-2 space-y-5">
                    <GlassCard className="p-5">
                        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
                            <Camera size={14} className="text-cyan-400" />
                            Phone Camera IoT Stream
                        </h3>
                        <VideoStreamViewer onDetection={setCamDetection} />
                    </GlassCard>

                    {/* Simulation Controls */}
                    <GlassCard className="p-5">
                        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
                            <Play size={14} className="text-violet-400" />
                            Simulation Mode
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {SCENARIOS.map((s) => (
                                <motion.button
                                    key={s.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => runSimulation(s.id)}
                                    disabled={simulating}
                                    className={`p-3 rounded-xl border text-left transition-all duration-200 ${activeScenario === s.id
                                        ? 'border-opacity-60 bg-white/6'
                                        : 'border-white/8 bg-white/3 hover:bg-white/6'
                                        }`}
                                    style={{
                                        borderColor: activeScenario === s.id ? s.color : undefined,
                                        boxShadow: activeScenario === s.id ? `0 0 20px ${s.color}28` : undefined,
                                    }}
                                >
                                    <s.icon size={16} style={{ color: s.color }} className="mb-1.5" />
                                    <p className="text-xs font-bold text-slate-200">{s.label}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                                </motion.button>
                            ))}
                        </div>

                        {simulating && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-violet-400">
                                <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                                Running simulationâ€¦
                            </div>
                        )}

                        {simResult && !simulating && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-3 rounded-xl bg-white/3 border border-white/8 text-xs"
                            >
                                <p className="text-violet-400 font-semibold mb-2">Simulation Result: {simResult.scenario}</p>
                                <div className="grid grid-cols-3 gap-2 text-slate-400">
                                    <span>People: <b className="text-white">{simResult.detection?.people_count ?? 'â€”'}</b></span>
                                    <span>Vehicles: <b className="text-white">{simResult.detection?.vehicle_count ?? 'â€”'}</b></span>
                                    <span>Density: <b className="text-white">{Math.round((simResult.detection?.crowd_density || 0) * 100)}%</b></span>
                                </div>
                            </motion.div>
                        )}
                    </GlassCard>
                </div>

                {/* Right panel */}
                <div className="space-y-4">
                    {/* Risk Gauge */}
                    <GlassCard className="p-5 flex flex-col items-center" glow={riskScore >= 65 ? 'red' : ''}>
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-4">Current Risk</p>
                        <RiskGauge score={Math.round(riskScore)} label="Risk Score" size={160} />
                    </GlassCard>

                    {/* Detection stats */}
                    <GlassCard className="p-5">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Activity size={12} /> Detection Data
                        </h3>
                        <div className="space-y-2">
                            {[
                                { label: 'People', value: detection?.people_count ?? detection?.metrics?.peopleCount ?? '—', icon: Users, color: '#00d4ff' },
                                { label: 'Vehicles', value: detection?.vehicle_count ?? detection?.metrics?.vehicleCount ?? '—', icon: Car, color: '#7b61ff' },
                                {
                                    label: 'Density',
                                    value: detection?.density_level
                                        ?? detection?.metrics?.densityLevel
                                        ?? `${Math.round((detection?.crowd_density ?? detection?.metrics?.crowdDensity ?? 0) * 100)}%`,
                                    icon: Activity,
                                    color: '#ffb347'
                                },
                                {
                                    label: 'Movement',
                                    value: detection?.movement_level ?? detection?.movement_speed ?? detection?.metrics?.movementLevel ?? detection?.metrics?.movementSpeed ?? '—',
                                    icon: Wind,
                                    color: '#00ff88'
                                },
                            ].map(({ label, value, icon: Icon, color }) => (
                                <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <Icon size={12} style={{ color }} />
                                        <span className="text-xs text-slate-400">{label}</span>
                                    </div>
                                    <span className="text-xs font-bold text-white">{value}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Users size={12} /> People On Camera
                        </h3>
                        {peopleOnCamera.length === 0 ? (
                            <p className="text-xs text-slate-500">No person detected in the current frame.</p>
                        ) : (
                            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                {peopleOnCamera.map((person) => (
                                    <div key={person.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                                        <span className="text-xs font-semibold text-cyan-300">Person #{person.id}</span>
                                        <span className="text-xs text-slate-300">Conf: {person.confidence}%</span>
                                        <span className="text-xs text-slate-400">{person.position}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>

                    {/* Zone info */}
                    <GlassCard className="p-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <MapPin size={12} className="text-cyan-400" />
                            <span>Zone: <span className="text-slate-300">{simResult?.incident ? 'Simulated Zone' : 'Auto-detect'}</span></span>
                        </div>
                        {simResult?.detection?.timestamp && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5">
                                <Clock size={12} className="text-violet-400" />
                                <span>{new Date(simResult.detection.timestamp).toLocaleTimeString()}</span>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}




