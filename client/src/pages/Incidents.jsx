import { useState, useEffect } from 'react'
import GlassCard from '../components/GlassCard'
import { incidentsAPI } from '../services/apiService'
import { formatDistanceToNow } from 'date-fns'

const DEMO_INCIDENTS = Array.from({ length: 20 }, (_, i) => ({
    _id: `inc${i}`,
    type: ['overcrowding', 'aggressive_traffic', 'congestion', 'suspicious_movement', 'accident'][i % 5],
    severity: ['low', 'medium', 'high', 'critical'][i % 4],
    status: ['active', 'resolved', 'monitoring'][i % 3],
    zoneName: ['Central Bus Terminal', 'Metro Station Alpha', 'Harbor Bus Stop', 'Outer Ring Highway', 'Suburban Rail Junction'][i % 5],
    description: [
        'Extreme crowd density detected. Passenger safety at risk.',
        'Heavy vehicle congestion observed. Route blocked.',
        'Unusual movement patterns detected. Security alert.',
        'Multiple vehicle incidents reported in zone.',
        'Congestion level exceeded safety threshold.',
    ][i % 5],
    detectionData: { riskScore: 40 + (i * 3) % 55, crowdDensity: 0.2 + (i * 0.04), vehicleCount: 5 + i * 2 },
    createdAt: new Date(Date.now() - i * 3600000 * 4).toISOString(),
}))

const SEVERITY_COLORS = {
    low: 'badge-info', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-critical'
}
const STATUS_COLORS = {
    active: 'text-red-400', resolved: 'text-green-400', monitoring: 'text-yellow-400'
}
const TYPE_ICONS = {
    overcrowding: '👥', aggressive_traffic: '🚗', congestion: '🚦', suspicious_movement: '👁️', accident: '💥', emergency: '🆘'
}

export default function Incidents() {
    const [incidents, setIncidents] = useState(DEMO_INCIDENTS)
    const [stats, setStats] = useState({ total: 30, active: 8, critical: 3 })
    const [filters, setFilters] = useState({ severity: '', status: '', type: '' })
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState(null)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const [incRes, statsRes] = await Promise.allSettled([
                    incidentsAPI.getAll({ ...filters, page, limit: 15 }),
                    incidentsAPI.getStats()
                ])
                if (incRes.status === 'fulfilled') setIncidents(incRes.value.data.data || DEMO_INCIDENTS)
                if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data || stats)
            } catch { }
            setLoading(false)
        }
        load()
    }, [filters, page])

    const handleResolve = async (id) => {
        try {
            await incidentsAPI.updateStatus(id, 'resolved')
            setIncidents(prev => prev.map(i => i._id === id ? { ...i, status: 'resolved' } : i))
        } catch { }
    }

    return (
        <div className="p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Incidents</h1>
                    <p className="text-sm text-gray-400 mt-1">All detected safety incidents across transport zones</p>
                </div>
                <div className="flex gap-4 text-center">
                    <div><div className="text-xl font-black text-red-400">{stats.total}</div><div className="text-xs text-gray-500">Total</div></div>
                    <div><div className="text-xl font-black text-orange-400">{stats.active}</div><div className="text-xs text-gray-500">Active</div></div>
                    <div><div className="text-xl font-black text-red-300">{stats.critical}</div><div className="text-xs text-gray-500">Critical</div></div>
                </div>
            </div>

            {/* Filters */}
            <GlassCard className="p-4">
                <div className="flex flex-wrap gap-3">
                    <select
                        value={filters.severity}
                        onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">All Severity</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>
                    <select
                        value={filters.status}
                        onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="monitoring">Monitoring</option>
                        <option value="resolved">Resolved</option>
                    </select>
                    <select
                        value={filters.type}
                        onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">All Types</option>
                        <option value="overcrowding">Overcrowding</option>
                        <option value="aggressive_traffic">Aggressive Traffic</option>
                        <option value="congestion">Congestion</option>
                        <option value="suspicious_movement">Suspicious Movement</option>
                        <option value="accident">Accident</option>
                    </select>
                    <button onClick={() => setFilters({ severity: '', status: '', type: '' })} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-2">Clear ×</button>
                </div>
            </GlassCard>

            {/* Table */}
            <GlassCard className="p-0 overflow-hidden" transition={{ delay: 0.1 }}>
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Severity</th>
                                    <th>Zone</th>
                                    <th>Risk</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidents.map(inc => (
                                    <tr key={inc._id} className="cursor-pointer" onClick={() => setSelected(inc)}>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span>{TYPE_ICONS[inc.type] || '⚠️'}</span>
                                                <span className="text-gray-200 capitalize">{inc.type?.replace(/_/g, ' ')}</span>
                                            </div>
                                        </td>
                                        <td><span className={SEVERITY_COLORS[inc.severity]}>{inc.severity}</span></td>
                                        <td className="text-gray-400 text-xs truncate max-w-[140px]">{inc.zoneName}</td>
                                        <td>
                                            <span className={`font-bold ${inc.detectionData?.riskScore >= 65 ? 'text-red-400' : inc.detectionData?.riskScore >= 35 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                {inc.detectionData?.riskScore || '-'}
                                            </span>
                                        </td>
                                        <td><span className={`text-xs font-semibold capitalize ${STATUS_COLORS[inc.status]}`}>{inc.status}</span></td>
                                        <td className="text-xs text-gray-500">{inc.createdAt ? formatDistanceToNow(new Date(inc.createdAt), { addSuffix: true }) : '-'}</td>
                                        <td onClick={e => e.stopPropagation()}>
                                            {inc.status !== 'resolved' && (
                                                <button onClick={() => handleResolve(inc._id)} className="text-xs text-green-400 hover:text-green-300 transition-colors">✓ Resolve</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </GlassCard>

            {/* Detail Modal */}
            {selected && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
                    <GlassCard className="w-full max-w-md" onClick={e => e.stopPropagation()} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }}>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="text-lg font-bold text-white capitalize">{selected.type?.replace(/_/g, ' ')}</div>
                                <div className="text-sm text-gray-400 mt-0.5">{selected.zoneName}</div>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-300 text-2xl leading-none">×</button>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">{selected.description}</p>
                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="bg-white/5 rounded-xl p-3">
                                <div className={`text-xl font-black ${selected.detectionData?.riskScore >= 65 ? 'text-red-400' : 'text-yellow-400'}`}>{selected.detectionData?.riskScore}</div>
                                <div className="text-xs text-gray-500">Risk Score</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3">
                                <div className="text-xl font-black text-blue-400">{selected.detectionData?.vehicleCount}</div>
                                <div className="text-xs text-gray-500">Vehicles</div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <span className={SEVERITY_COLORS[selected.severity]}>{selected.severity}</span>
                            <span className={`text-xs font-semibold capitalize ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    )
}
