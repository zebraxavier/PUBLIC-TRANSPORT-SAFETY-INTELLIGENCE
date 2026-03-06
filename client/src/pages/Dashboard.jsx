import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import StatCard from '../components/StatCard'
import GlassCard from '../components/GlassCard'
import RiskGauge from '../components/RiskGauge'
import AlertPanel from '../components/AlertPanel'
import MapView from '../components/MapView'
import { IncidentBarChart, DailyLineChart, ZoneRiskDoughnut } from '../components/SafetyChart'
import { useApp } from '../context/AppContext'
import { useSimulation } from '../hooks/useSimulation'
import { analyticsAPI, alertsAPI, zonesAPI } from '../services/apiService'

// Fallback demo data when backend is not running
const DEMO_ANALYTICS = {
    kpis: { totalIncidents: 30, activeIncidents: 8, totalAlerts: 20, unreadAlerts: 5, avgRisk: 47 },
    daily: [
        { date: 'Feb 27', incidents: 4 }, { date: 'Feb 28', incidents: 7 }, { date: 'Mar 1', incidents: 5 },
        { date: 'Mar 2', incidents: 9 }, { date: 'Mar 3', incidents: 6 }, { date: 'Mar 4', incidents: 11 }, { date: 'Mar 5', incidents: 8 },
    ],
    byType: [
        { type: 'overcrowding', count: 10 }, { type: 'congestion', count: 8 },
        { type: 'aggressive_traffic', count: 6 }, { type: 'suspicious_movement', count: 4 }, { type: 'accident', count: 2 },
    ],
    zoneRisk: [
        { name: 'Central Bus Terminal', riskScore: 72, riskLevel: 'danger' },
        { name: 'Outer Ring Highway', riskScore: 84, riskLevel: 'danger' },
        { name: 'Harbor Bus Stop', riskScore: 61, riskLevel: 'warning' },
        { name: 'Metro Station Alpha', riskScore: 48, riskLevel: 'warning' },
        { name: 'Suburban Rail Junction', riskScore: 38, riskLevel: 'safe' },
    ]
}

const DEMO_ZONES = [
    { _id: '1', name: 'Central Bus Terminal', type: 'terminal', location: { lat: 13.0827, lng: 80.2707 }, riskScore: 72, riskLevel: 'danger', crowdDensity: 0.85, vehicleCount: 42, incidentCount: 12, safetyScore: 28 },
    { _id: '2', name: 'Metro Station Alpha', type: 'metro', location: { lat: 13.0604, lng: 80.2496 }, riskScore: 48, riskLevel: 'warning', crowdDensity: 0.55, vehicleCount: 18, incidentCount: 5, safetyScore: 62 },
    { _id: '3', name: 'Airport Express Stop', type: 'train_station', location: { lat: 12.9941, lng: 80.1709 }, riskScore: 21, riskLevel: 'safe', crowdDensity: 0.25, vehicleCount: 9, incidentCount: 1, safetyScore: 89 },
    { _id: '4', name: 'Harbor Bus Stop', type: 'bus_stop', location: { lat: 13.0839, lng: 80.2890 }, riskScore: 61, riskLevel: 'warning', crowdDensity: 0.67, vehicleCount: 22, incidentCount: 7, safetyScore: 52 },
    { _id: '5', name: 'Suburban Rail Junction', type: 'train_station', location: { lat: 13.1067, lng: 80.2928 }, riskScore: 38, riskLevel: 'safe', crowdDensity: 0.42, vehicleCount: 14, incidentCount: 3, safetyScore: 75 },
    { _id: '6', name: 'Outer Ring Highway', type: 'highway', location: { lat: 13.0181, lng: 80.2090 }, riskScore: 84, riskLevel: 'danger', crowdDensity: 0.30, vehicleCount: 68, incidentCount: 18, safetyScore: 16 },
]

const DEMO_ALERTS = [
    { _id: 'a1', title: '🚨 Overcrowding Emergency', message: 'Extreme crowd density at Central Bus Terminal. Risk: 92', severity: 'critical', zoneName: 'Central Bus Terminal', isRead: false, createdAt: new Date(Date.now() - 120000) },
    { _id: 'a2', title: '🚗 Traffic Surge Alert', message: 'Heavy vehicle congestion on Outer Ring Highway', severity: 'danger', zoneName: 'Outer Ring Highway', isRead: false, createdAt: new Date(Date.now() - 540000) },
    { _id: 'a3', title: '⚠️ Crowd Density Warning', message: 'Metro Station Alpha approaching capacity', severity: 'warning', zoneName: 'Metro Station Alpha', isRead: true, createdAt: new Date(Date.now() - 3600000) },
    { _id: 'a4', title: '✅ Zone Cleared', message: 'Airport Express Stop returned to safe status', severity: 'info', zoneName: 'Airport Express Stop', isRead: true, createdAt: new Date(Date.now() - 7200000) },
]

export default function Dashboard() {
    const [analytics, setAnalytics] = useState(DEMO_ANALYTICS)
    const [zones, setZones] = useState(DEMO_ZONES)
    const [alerts, setAlerts] = useState(DEMO_ALERTS)
    const [loading, setLoading] = useState(false)
    const { riskScore, riskLevel } = useApp()
    const { triggerScenario, loading: simLoading, SCENARIOS } = useSimulation()

    useEffect(() => {
        const load = async () => {
            try {
                const [analyticsRes, zonesRes, alertsRes] = await Promise.allSettled([
                    analyticsAPI.getRisk(),
                    zonesAPI.getSafety(),
                    alertsAPI.getAll({ limit: 10 }),
                ])
                if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data.data)
                if (zonesRes.status === 'fulfilled') setZones(zonesRes.value.data.data?.zones || DEMO_ZONES)
                if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.data.data || DEMO_ALERTS)
            } catch { /* Use demo data */ }
        }
        load()
    }, [])

    const kpis = analytics?.kpis || DEMO_ANALYTICS.kpis

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Command Center</h1>
                    <p className="text-sm text-gray-400 mt-1">Real-time public transport safety overview · Chennai Metro Area</p>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live · {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* KPI Stats */}
            <div className="dashboard-grid">
                <StatCard icon="⚠️" title="Total Incidents" value={kpis.totalIncidents} subtitle="All time" color="red" delay={0} />
                <StatCard icon="🔴" title="Active Incidents" value={kpis.activeIncidents} subtitle="Requires attention" color="red" delay={0.05} />
                <StatCard icon="🔔" title="Total Alerts" value={kpis.totalAlerts} subtitle={`${kpis.unreadAlerts} unread`} color="yellow" delay={0.1} />
                <StatCard icon="📊" title="Avg Risk Score" value={kpis.avgRisk} subtitle="Across all zones" color="purple" delay={0.15} />
                <StatCard icon="🛡️" title="Zones Monitored" value={zones.length} subtitle="Active sensors" color="blue" delay={0.2} />
                <StatCard icon="✅" title="Safe Zones" value={zones.filter(z => z.riskLevel === 'safe').length} subtitle={`${zones.filter(z => z.riskLevel === 'danger').length} in danger`} color="green" delay={0.25} />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Risk Gauge + Simulation */}
                <GlassCard className="lg:col-span-1 flex flex-col items-center" transition={{ delay: 0.3 }}>
                    <div className="text-sm font-semibold text-gray-300 mb-2">System Risk Score</div>
                    <RiskGauge score={riskScore || kpis.avgRisk} level={riskLevel || 'warning'} size={180} />

                    <div className="w-full mt-5">
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">Quick Simulations</div>
                        <div className="grid grid-cols-2 gap-2">
                            {SCENARIOS.slice(0, 4).map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => triggerScenario(s.id)}
                                    disabled={simLoading}
                                    className={`text-xs py-2 px-3 rounded-lg text-left transition-all duration-200 border ${s.color === 'red' ? 'bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20' :
                                            s.color === 'green' ? 'bg-green-500/10 border-green-500/20 text-green-300 hover:bg-green-500/20' :
                                                'bg-yellow-500/10 border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20'
                                        } ${simLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {s.icon} {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </GlassCard>

                {/* Daily Incidents Chart */}
                <GlassCard className="lg:col-span-2" transition={{ delay: 0.35 }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-semibold text-gray-300">Daily Incidents (Last 7 Days)</div>
                        <span className="badge-warning">Last 7 days</span>
                    </div>
                    <DailyLineChart data={analytics?.daily || DEMO_ANALYTICS.daily} height={230} />
                </GlassCard>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <GlassCard transition={{ delay: 0.4 }}>
                    <div className="text-sm font-semibold text-gray-300 mb-4">Incidents by Type</div>
                    <IncidentBarChart data={analytics?.byType || DEMO_ANALYTICS.byType} height={200} />
                </GlassCard>
                <GlassCard transition={{ delay: 0.45 }}>
                    <div className="text-sm font-semibold text-gray-300 mb-4">Zone Risk Distribution</div>
                    <ZoneRiskDoughnut data={analytics?.zoneRisk || DEMO_ANALYTICS.zoneRisk} height={200} />
                </GlassCard>
            </div>

            {/* Map + Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                <GlassCard className="lg:col-span-3 p-0 overflow-hidden" transition={{ delay: 0.5 }}>
                    <div className="p-4 border-b border-white/5">
                        <div className="text-sm font-semibold text-gray-300">Live Safety Map</div>
                    </div>
                    <MapView zones={zones} height="360px" />
                </GlassCard>

                <GlassCard className="lg:col-span-2" transition={{ delay: 0.55 }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-semibold text-gray-300">Recent Alerts</div>
                        <span className="badge-danger">{alerts.filter(a => !a.isRead).length} unread</span>
                    </div>
                    <AlertPanel alerts={alerts} maxHeight="max-h-[340px]" />
                </GlassCard>
            </div>
        </div>
    )
}
