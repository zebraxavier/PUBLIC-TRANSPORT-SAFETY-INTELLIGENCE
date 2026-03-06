import { useState, useEffect } from 'react'
import GlassCard from '../components/GlassCard'
import MapView from '../components/MapView'
import { zonesAPI } from '../services/apiService'

const DEMO_ZONES = [
    { _id: '1', name: 'Central Bus Terminal', type: 'terminal', location: { lat: 13.0827, lng: 80.2707, address: 'Central Station, Chennai' }, riskScore: 72, riskLevel: 'danger', crowdDensity: 0.85, vehicleCount: 42, incidentCount: 12, safetyScore: 28 },
    { _id: '2', name: 'Metro Station Alpha', type: 'metro', location: { lat: 13.0604, lng: 80.2496, address: 'T. Nagar Metro, Chennai' }, riskScore: 48, riskLevel: 'warning', crowdDensity: 0.55, vehicleCount: 18, incidentCount: 5, safetyScore: 62 },
    { _id: '3', name: 'Airport Express Stop', type: 'train_station', location: { lat: 12.9941, lng: 80.1709, address: 'Chennai Airport' }, riskScore: 21, riskLevel: 'safe', crowdDensity: 0.25, vehicleCount: 9, incidentCount: 1, safetyScore: 89 },
    { _id: '4', name: 'Harbor Bus Stop', type: 'bus_stop', location: { lat: 13.0839, lng: 80.2890, address: 'Harbor Area, Chennai' }, riskScore: 61, riskLevel: 'warning', crowdDensity: 0.67, vehicleCount: 22, incidentCount: 7, safetyScore: 52 },
    { _id: '5', name: 'Suburban Rail Junction', type: 'train_station', location: { lat: 13.1067, lng: 80.2928, address: 'Perambur, Chennai' }, riskScore: 38, riskLevel: 'safe', crowdDensity: 0.42, vehicleCount: 14, incidentCount: 3, safetyScore: 75 },
    { _id: '6', name: 'Outer Ring Highway', type: 'highway', location: { lat: 13.0181, lng: 80.2090, address: 'OMR Highway, Chennai' }, riskScore: 84, riskLevel: 'danger', crowdDensity: 0.30, vehicleCount: 68, incidentCount: 18, safetyScore: 16 },
    { _id: '7', name: 'Market Bus Stop', type: 'bus_stop', location: { lat: 13.0504, lng: 80.2137, address: 'Koyambedu Market, Chennai' }, riskScore: 55, riskLevel: 'warning', crowdDensity: 0.72, vehicleCount: 19, incidentCount: 6, safetyScore: 58 },
    { _id: '8', name: 'Tech Park Shuttle', type: 'bus_stop', location: { lat: 12.9352, lng: 80.2161, address: 'Sholinganallur, Chennai' }, riskScore: 18, riskLevel: 'safe', crowdDensity: 0.20, vehicleCount: 7, incidentCount: 0, safetyScore: 95 },
]

const RISK_COLORS = {
    safe: { text: 'text-green-400', badge: 'badge-safe', dot: 'bg-green-500' },
    warning: { text: 'text-yellow-400', badge: 'badge-warning', dot: 'bg-yellow-500 animate-pulse' },
    danger: { text: 'text-red-400', badge: 'badge-danger', dot: 'bg-red-500 animate-pulse' },
}

export default function TransportMap() {
    const [zones, setZones] = useState(DEMO_ZONES)
    const [selectedZone, setSelectedZone] = useState(null)
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        zonesAPI.getSafety()
            .then(res => setZones(res.data.data?.zones || DEMO_ZONES))
            .catch(() => { })
    }, [])

    const filtered = filter === 'all' ? zones : zones.filter(z => z.riskLevel === filter)

    return (
        <div className="p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white">Safety Map</h1>
                    <p className="text-sm text-gray-400 mt-1">Real-time transport zone safety visualization</p>
                </div>
                {/* Filter Buttons */}
                <div className="flex gap-2">
                    {['all', 'safe', 'warning', 'danger'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${filter === f
                                    ? f === 'safe' ? 'bg-green-500/30 text-green-300 border border-green-500/50' :
                                        f === 'warning' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' :
                                            f === 'danger' ? 'bg-red-500/30 text-red-300 border border-red-500/50' :
                                                'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                }`}
                        >
                            {f === 'all' ? `All (${zones.length})` :
                                f === 'safe' ? `✅ Safe (${zones.filter(z => z.riskLevel === 'safe').length})` :
                                    f === 'warning' ? `⚠️ Warning (${zones.filter(z => z.riskLevel === 'warning').length})` :
                                        `🔴 Danger (${zones.filter(z => z.riskLevel === 'danger').length})`}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                {/* Map */}
                <GlassCard className="lg:col-span-3 p-0 overflow-hidden" transition={{ delay: 0 }}>
                    <MapView zones={filtered} height="520px" />
                </GlassCard>

                {/* Zone List */}
                <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
                    {zones.sort((a, b) => b.riskScore - a.riskScore).map(z => {
                        const cfg = RISK_COLORS[z.riskLevel]
                        return (
                            <GlassCard
                                key={z._id}
                                className={`p-3 cursor-pointer border ${selectedZone?._id === z._id ? 'border-indigo-500/50' : 'border-white/5'}`}
                                hover
                                onClick={() => setSelectedZone(z)}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                    <span className="text-xs font-semibold text-gray-200 truncate flex-1">{z.name}</span>
                                    <span className={`text-sm font-black ${cfg.text}`}>{z.riskScore}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500">{z.type?.replace('_', ' ')}</span>
                                    <span className={cfg.badge + ' text-[10px]'}>{z.riskLevel}</span>
                                </div>
                                <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${z.riskLevel === 'danger' ? 'bg-red-500' : z.riskLevel === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`}
                                        style={{ width: `${z.riskScore}%` }} />
                                </div>
                            </GlassCard>
                        )
                    })}
                </div>
            </div>

            {/* Selected Zone Details */}
            {selectedZone && (
                <GlassCard transition={{ duration: 0.3 }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="text-base font-bold text-white">{selectedZone.name}</div>
                            <div className="text-xs text-gray-500">{selectedZone.location?.address}</div>
                        </div>
                        <button onClick={() => setSelectedZone(null)} className="text-gray-500 hover:text-gray-300 text-xl">×</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        {[
                            { label: 'Risk Score', value: selectedZone.riskScore, color: RISK_COLORS[selectedZone.riskLevel].text },
                            { label: 'Safety Score', value: selectedZone.safetyScore, color: 'text-green-400' },
                            { label: 'Crowd Density', value: `${((selectedZone.crowdDensity || 0) * 100).toFixed(0)}%`, color: 'text-blue-400' },
                            { label: 'Incidents', value: selectedZone.incidentCount || 0, color: 'text-red-400' },
                        ].map(s => (
                            <div key={s.label}>
                                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}
        </div>
    )
}
