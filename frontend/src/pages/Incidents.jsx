import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Search, Filter, RefreshCw, ChevronDown } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { getIncidents } from '../services/apiService';

const SEV_CLASSES = {
    low: { badge: 'badge-safe', label: 'Low' },
    medium: { badge: 'badge-warning', label: 'Medium' },
    high: { badge: 'badge-danger', label: 'High' },
    critical: { badge: 'badge-critical', label: 'Critical' },
};

const TYPE_LABELS = {
    overcrowding: 'Overcrowding',
    aggressive_traffic: 'Aggressive Traffic',
    congestion: 'Congestion',
    suspicious_movement: 'Suspicious Activity',
    emergency: 'Emergency',
};

export default function Incidents() {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sevFilter, setSevFilter] = useState('all');
    const [expanded, setExpanded] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getIncidents({ limit: 50, sort: '-createdAt' });
            const data = res.data?.data || res.data || [];
            setIncidents(data);
        } catch {
            setIncidents([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = incidents.filter(inc => {
        const matchSearch = !search ||
            inc.type?.toLowerCase().includes(search.toLowerCase()) ||
            inc.zoneName?.toLowerCase().includes(search.toLowerCase()) ||
            inc.description?.toLowerCase().includes(search.toLowerCase());
        const matchSev = sevFilter === 'all' || inc.severity === sevFilter;
        return matchSearch && matchSev;
    });

    return (
        <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">Incidents</h1>
                    <p className="text-slate-500 text-sm mt-0.5">{incidents.length} total incidents detected</p>
                </div>
                <button onClick={load} className="btn-neon flex items-center gap-2">
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <GlassCard className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by type, zone, description…"
                            className="w-full pl-8 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={13} className="text-slate-500" />
                        {['all', 'low', 'medium', 'high', 'critical'].map(s => (
                            <button
                                key={s}
                                onClick={() => setSevFilter(s)}
                                className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-all ${sevFilter === s
                                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                    : 'text-slate-400 border border-transparent hover:border-white/10'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </GlassCard>

            {/* Incident list */}
            {loading ? (
                <div className="flex items-center justify-center h-32">
                    <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-2">
                    <AnimatePresence>
                        {filtered.length === 0 && (
                            <div className="text-center py-16 text-slate-500">
                                <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No incidents found</p>
                                <p className="text-xs mt-1">Run a simulation or seed the database</p>
                            </div>
                        )}
                        {filtered.map((inc, i) => {
                            const sev = SEV_CLASSES[inc.severity] || SEV_CLASSES.low;
                            const isExpanded = expanded === inc._id;
                            return (
                                <motion.div
                                    key={inc._id || i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                                >
                                    <GlassCard
                                        className="p-4 cursor-pointer"
                                        onClick={() => setExpanded(isExpanded ? null : inc._id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <AlertTriangle
                                                size={16}
                                                className={
                                                    inc.severity === 'critical' ? 'text-red-400' :
                                                        inc.severity === 'high' ? 'text-orange-400' :
                                                            inc.severity === 'medium' ? 'text-yellow-400' : 'text-green-400'
                                                }
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="text-sm font-semibold text-slate-200">
                                                        {TYPE_LABELS[inc.type] || inc.type || 'Unknown'}
                                                    </span>
                                                    <span className={sev.badge}>{sev.label}</span>
                                                    {inc.status === 'active' && <span className="badge-danger flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />ACTIVE</span>}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5 truncate">{inc.description}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-xs text-slate-500">{inc.zoneName || 'Unknown Zone'}</p>
                                                <p className="text-xs text-slate-600 mt-0.5">
                                                    {inc.createdAt ? new Date(inc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                </p>
                                            </div>
                                            <ChevronDown
                                                size={14}
                                                className={`text-slate-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                            />
                                        </div>

                                        {/* Expanded detail */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                                        {[
                                                            ['People Count', inc.detectionData?.peopleCount ?? inc.detectionData?.people_count ?? '—'],
                                                            ['Vehicle Count', inc.detectionData?.vehicleCount ?? inc.detectionData?.vehicle_count ?? '—'],
                                                            ['Crowd Density', inc.detectionData?.crowdDensity ? `${Math.round(inc.detectionData.crowdDensity * 100)}%` : '—'],
                                                            ['Risk Score', inc.detectionData?.riskScore ?? '—'],
                                                        ].map(([k, v]) => (
                                                            <div key={k}>
                                                                <p className="text-slate-500">{k}</p>
                                                                <p className="text-slate-200 font-semibold mt-0.5">{v}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </GlassCard>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
