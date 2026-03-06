import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Info, RefreshCw, Shield } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import MapView from '../components/MapView';
import { getZoneSafety } from '../services/apiService';
import { useWebSocket } from '../hooks/useWebSocket';
import { tamilNaduTransportLocations } from '../data/tamilNaduTransportLocations';

function normalizeRiskLevel(value) {
    const level = String(value || 'safe').toLowerCase();
    if (level === 'high') return 'danger';
    if (level === 'medium') return 'warning';
    if (level === 'low') return 'safe';
    return level;
}

function mergeLocationMetrics(safetyData) {
    const byLocationId = new Map();
    const byName = new Map();

    (safetyData || []).forEach((item) => {
        const locationId = item.locationId || item.location_id;
        if (locationId) byLocationId.set(locationId, item);
        if (item.name) byName.set(String(item.name).toLowerCase(), item);
    });

    return tamilNaduTransportLocations.map((location) => {
        const matched = byLocationId.get(location.id) || byName.get(location.name.toLowerCase()) || {};
        const riskLevel = normalizeRiskLevel(matched.riskLevel || matched.risk_level || 'safe');
        return {
            ...location,
            _id: matched._id || location.id,
            locationId: location.id,
            riskScore: matched.riskScore ?? matched.risk_score ?? 0,
            riskLevel,
            incidentCount: matched.incidentCount ?? matched.incident_count,
        };
    });
}

export default function TransportMap() {
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLocationId, setSelectedLocationId] = useState(tamilNaduTransportLocations[0]?.id || '');
    const { liveZoneUpdate } = useWebSocket();

    const load = async () => {
        setLoading(true);
        try {
            const res = await getZoneSafety();
            const safetyData = res.data?.data || res.data || [];
            setZones(mergeLocationMetrics(safetyData));
        } catch {
            setZones(mergeLocationMetrics([]));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        if (!liveZoneUpdate) return;

        const updateLocationId = liveZoneUpdate.locationId || liveZoneUpdate.location_id;
        const updateZoneName = String(liveZoneUpdate.zoneName || liveZoneUpdate.zone || '').toLowerCase();
        const updatedRiskLevel = normalizeRiskLevel(liveZoneUpdate.riskLevel || liveZoneUpdate.risk_level || 'safe');
        const updatedRiskScore = liveZoneUpdate.riskScore ?? liveZoneUpdate.risk_score ?? 0;

        setZones((prev) => prev.map((zone) => {
            const idMatch = updateLocationId && zone.locationId === updateLocationId;
            const nameMatch = updateZoneName && zone.name.toLowerCase() === updateZoneName;
            if (!idMatch && !nameMatch) return zone;
            return {
                ...zone,
                riskLevel: updatedRiskLevel,
                riskScore: updatedRiskScore,
            };
        }));
    }, [liveZoneUpdate]);

    const selectedLocation = zones.find((zone) => zone.locationId === selectedLocationId) || zones[0] || mergeLocationMetrics([])[0];

    const safeCount = zones.filter(z => z.riskLevel === 'safe').length;
    const warningCount = zones.filter(z => z.riskLevel === 'warning').length;
    const dangerCount = zones.filter(z => z.riskLevel === 'danger').length;

    return (
        <div className="p-6 space-y-5 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-white">Transport Safety Map</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Configured transport locations with live risk metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={selectedLocationId}
                        onChange={(e) => setSelectedLocationId(e.target.value)}
                        className="bg-[#0b1324] border border-white/10 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-cyan-400/40"
                    >
                        {tamilNaduTransportLocations.map((location) => (
                            <option key={location.id} value={location.id}>
                                {location.name}
                            </option>
                        ))}
                    </select>
                    <button onClick={load} className="btn-neon flex items-center gap-2">
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 flex-shrink-0">
                {[
                    { label: 'Safe Zones', count: safeCount, color: '#00ff88', dot: 'bg-green-400' },
                    { label: 'Warning Zones', count: warningCount, color: '#ffb347', dot: 'bg-yellow-400' },
                    { label: 'Danger Zones', count: dangerCount, color: '#ff3366', dot: 'bg-red-400' },
                ].map((s) => (
                    <GlassCard key={s.label} className="p-3 flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${s.dot} flex-shrink-0`} />
                        <div>
                            <div className="text-lg font-black" style={{ color: s.color }}>{s.count}</div>
                            <div className="text-xs text-slate-400">{s.label}</div>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* Map + sidebar */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-5 min-h-0">
                {/* Map */}
                <div className="lg:col-span-3 glass-card overflow-hidden" style={{ minHeight: '400px' }}>
                    <MapView
                        zones={zones}
                        selectedLocationId={selectedLocation.locationId}
                        onSelectLocation={setSelectedLocationId}
                    />
                </div>

                {/* Zone list */}
                <GlassCard className="p-4 overflow-y-auto">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2 sticky top-0 bg-[#080d1a] pb-2">
                        <Shield size={12} /> Zone Status
                    </h3>
                    <div className="space-y-2">
                        {loading && <div className="text-xs text-slate-500">Loading…</div>}
                        {zones.map((zone) => {
                            const rl = zone.riskLevel || 'safe';
                            const dotClass = rl === 'danger' ? 'bg-red-400' : rl === 'warning' ? 'bg-yellow-400' : 'bg-green-400';
                            const textColor = rl === 'danger' ? 'text-red-400' : rl === 'warning' ? 'text-yellow-400' : 'text-green-400';
                            return (
                                <motion.div
                                    key={zone.locationId}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`p-2.5 rounded-lg bg-white/3 border ${zone.locationId === selectedLocation.locationId ? 'border-cyan-400/40' : 'border-white/6'}`}
                                    onClick={() => setSelectedLocationId(zone.locationId)}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`w-2 h-2 rounded-full ${dotClass} flex-shrink-0`} />
                                        <span className="text-xs font-medium text-slate-200 truncate">{zone.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">{zone.type || 'Transport Location'}</span>
                                        <span className={`text-xs font-bold ${textColor}`}>{zone.riskScore ?? 0}</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                        {!loading && zones.length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-4">No configured transport locations available.</p>
                        )}
                    </div>
                </GlassCard>
            </div>

            {/* Legend */}
            <GlassCard className="p-3 flex-shrink-0">
                <div className="flex items-center gap-6 text-xs">
                    <span className="flex items-center gap-2 text-slate-400"><Info size={11} /> Map Legend:</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-400/60 border border-green-400" />Safe (0–34)</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400/60 border border-yellow-400" />Warning (35–64)</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-400/60 border border-red-400" />Danger (65–100)</span>
                    <span className="ml-auto text-slate-600">{selectedLocation?.name || 'Chennai Central Railway Station'}</span>
                </div>
            </GlassCard>
        </div>
    );
}
