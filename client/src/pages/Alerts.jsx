import { useState, useEffect } from 'react'
import GlassCard from '../components/GlassCard'
import AlertPanel from '../components/AlertPanel'
import { alertsAPI } from '../services/apiService'
import { useApp } from '../context/AppContext'
import { formatDistanceToNow } from 'date-fns'

const DEMO_ALERTS = Array.from({ length: 15 }, (_, i) => ({
    _id: `alt${i}`,
    title: ['🚨 Overcrowding Emergency', '🚗 Traffic Surge Alert', '⚠️ High Crowd Density', '👁️ Suspicious Activity', '✅ Zone Cleared'][i % 5],
    message: [
        'Extreme crowd density detected at Central Bus Terminal. Risk Score: 92.',
        'Aggressive vehicle congestion on Outer Ring Highway. Vehicles: 68.',
        'Metro Station Alpha approaching capacity threshold.',
        'Unusual movement patterns detected at Harbor Bus Stop.',
        'Airport Express Stop returned to safe operational status.',
    ][i % 5],
    severity: ['critical', 'danger', 'warning', 'warning', 'info'][i % 5],
    zoneName: ['Central Bus Terminal', 'Outer Ring Highway', 'Metro Station Alpha', 'Harbor Bus Stop', 'Airport Express'][i % 5],
    isRead: i > 4,
    riskScore: 92 - i * 4,
    createdAt: new Date(Date.now() - i * 1800000).toISOString(),
}))

export default function Alerts() {
    const [alerts, setAlerts] = useState(DEMO_ALERTS)
    const [stats, setStats] = useState({ total: 20, unread: 5, critical: 2, danger: 4 })
    const [filter, setFilter] = useState('all')
    const { alerts: wsAlerts, clearUnread } = useApp()

    useEffect(() => {
        clearUnread()
        const load = async () => {
            try {
                const [alertsRes, statsRes] = await Promise.allSettled([
                    alertsAPI.getAll({ limit: 50 }),
                    alertsAPI.getStats()
                ])
                if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.data.data || DEMO_ALERTS)
                if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data || stats)
            } catch { }
        }
        load()
    }, [])

    // Merge WS live alerts
    const allAlerts = [...wsAlerts, ...alerts].slice(0, 80)

    const filtered = filter === 'all' ? allAlerts : allAlerts.filter(a => a.severity === filter)

    const handleMarkRead = async (id) => {
        try {
            await alertsAPI.markRead(id)
            setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a))
        } catch { }
    }

    const handleMarkAllRead = async () => {
        try {
            await alertsAPI.markAllRead()
            setAlerts(prev => prev.map(a => ({ ...a, isRead: true })))
        } catch { }
    }

    return (
        <div className="p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white">Alerts</h1>
                    <p className="text-sm text-gray-400 mt-1">Real-time safety alert log with severity classification</p>
                </div>
                <button onClick={handleMarkAllRead} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                    ✓ Mark all read
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Alerts', value: allAlerts.length, color: 'text-gray-300' },
                    { label: 'Unread', value: allAlerts.filter(a => !a.isRead).length, color: 'text-blue-400' },
                    { label: 'Critical', value: allAlerts.filter(a => a.severity === 'critical').length, color: 'text-red-400' },
                    { label: 'Today', value: allAlerts.filter(a => new Date(a.createdAt) > new Date(Date.now() - 86400000)).length, color: 'text-yellow-400' },
                ].map(s => (
                    <div key={s.label} className="glass-card p-4 text-center">
                        <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
                {[
                    { id: 'all', label: 'All' },
                    { id: 'critical', label: '🔴 Critical' },
                    { id: 'danger', label: '⛔ Danger' },
                    { id: 'warning', label: '⚠️ Warning' },
                    { id: 'info', label: 'ℹ️ Info' },
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f.id
                                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                            }`}
                    >
                        {f.label} ({
                            f.id === 'all' ? allAlerts.length : allAlerts.filter(a => a.severity === f.id).length
                        })
                    </button>
                ))}
            </div>

            {/* Alerts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* All Alerts Panel */}
                <GlassCard transition={{ delay: 0 }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-semibold text-gray-300">Alert Feed</div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-xs text-gray-500">Live</span>
                        </div>
                    </div>
                    <AlertPanel alerts={filtered} onMarkRead={handleMarkRead} maxHeight="max-h-[600px]" />
                </GlassCard>

                {/* Alert Stats Breakdown */}
                <div className="space-y-4">
                    <GlassCard transition={{ delay: 0.15 }}>
                        <div className="text-sm font-semibold text-gray-300 mb-4">Alert Severity Breakdown</div>
                        {[
                            { label: 'Critical', sev: 'critical', color: 'bg-red-900/50 border-red-500/50', text: 'text-red-300', dot: 'bg-red-500' },
                            { label: 'Danger', sev: 'danger', color: 'bg-red-800/30 border-red-500/30', text: 'text-red-400', dot: 'bg-red-400' },
                            { label: 'Warning', sev: 'warning', color: 'bg-yellow-900/20 border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-500' },
                            { label: 'Info', sev: 'info', color: 'bg-blue-900/20 border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500' },
                        ].map(item => {
                            const count = allAlerts.filter(a => a.severity === item.sev).length
                            const pct = allAlerts.length > 0 ? (count / allAlerts.length) * 100 : 0
                            return (
                                <div key={item.sev} className={`flex items-center gap-3 p-3 rounded-xl border mb-2 ${item.color}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
                                    <span className={`text-sm font-medium ${item.text} flex-1`}>{item.label}</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 h-1.5 bg-black/30 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${item.dot}`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className={`text-base font-bold ${item.text} w-6 text-right`}>{count}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </GlassCard>

                    {/* Recent high-severity  */}
                    <GlassCard transition={{ delay: 0.25 }}>
                        <div className="text-sm font-semibold text-gray-300 mb-4">🔴 High Severity Recent</div>
                        {allAlerts.filter(a => a.severity === 'critical' || a.severity === 'danger').slice(0, 5).map((alert, i) => (
                            <div key={alert._id || i} className="py-2.5 border-b border-white/5 last:border-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-200 font-medium truncate flex-1">{alert.title}</span>
                                    <span className="badge-critical ml-2 flex-shrink-0">{alert.severity}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5 flex items-center justify-between">
                                    <span>📍 {alert.zoneName}</span>
                                    <span>{alert.createdAt ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true }) : ''}</span>
                                </div>
                            </div>
                        ))}
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
