import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle, Users, Car, Activity, Shield,
    TrendingUp, BarChart2, RefreshCw
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import RiskGauge from '../components/RiskGauge';
import AlertPanel from '../components/AlertPanel';
import { HourlyChart, DailyTrendChart } from '../components/SafetyChart';
import { getRiskAnalytics } from '../services/apiService';
import { useWebSocket } from '../hooks/useWebSocket';

const KPI = ({ icon: Icon, label, value, sub, color, delay }) => (
    <GlassCard hover delay={delay} className="p-5">
        <div className="flex items-start justify-between mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
                <Icon size={18} style={{ color }} />
            </div>
            <span className="text-xs text-slate-500">24h</span>
        </div>
        <div className="text-2xl font-black text-white">{value}</div>
        <div className="text-xs text-slate-400 mt-1">{label}</div>
        {sub && <div className="text-xs font-medium mt-1" style={{ color }}>{sub}</div>}
    </GlassCard>
);

export default function Dashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const { connected, lastDetection, lastAlert, liveZoneUpdate, dashboardStats } = useWebSocket();
    const [liveRisk, setLiveRisk] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getRiskAnalytics();
            const data = res.data?.data || res.data || {};
            
            // Transform backend response to expected format
            const transformed = {
                kpis: data.summary || {
                    totalIncidents: data.summary?.totalIncidents ?? 0,
                    activeIncidents: data.summary?.activeAlerts ?? 0,
                    totalAlerts: data.summary?.totalAlerts ?? 0,
                    unreadAlerts: data.summary?.activeAlerts ?? 0,
                    avgRisk: data.summary?.avgRiskScore ?? 0
                },
                hourly: (data.hourlyDistribution || []).map((count, hour) => ({
                    label: `${hour}:00`,
                    incidents: count
                })),
                daily: (data.riskTrend || []).map(d => ({
                    date: d.date,
                    incidents: d.avgRisk || 0
                }))
            };
            
            setAnalytics(transformed);
        } catch {
            setAnalytics(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Update live risk score from WS detection
    useEffect(() => {
        if (lastDetection?.riskScore !== undefined) {
            setLiveRisk(lastDetection.riskScore);
        } else if (lastDetection?.risk_score !== undefined) {
            setLiveRisk(lastDetection.risk_score);
        }
    }, [lastDetection]);

    // Update analytics from dashboardStats WebSocket event
    useEffect(() => {
        if (dashboardStats?.summary) {
            setAnalytics(prev => prev ? {
                ...prev,
                kpis: {
                    totalIncidents: dashboardStats.summary.totalIncidents ?? prev.kpis.totalIncidents,
                    activeIncidents: dashboardStats.summary.activeAlerts ?? prev.kpis.activeIncidents,
                    totalAlerts: dashboardStats.summary.totalAlerts ?? prev.kpis.totalAlerts,
                    unreadAlerts: dashboardStats.summary.activeAlerts ?? prev.kpis.unreadAlerts,
                    avgRisk: dashboardStats.summary.avgRiskScore ?? prev.kpis.avgRisk
                }
            } : null);
        }
    }, [dashboardStats]);

    const kpis = analytics?.kpis || {};
    const riskScore = liveRisk ?? kpis.avgRisk ?? 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">Command Center</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Transport Safety Intelligence Dashboard</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${connected ? 'border-green-500/30 bg-green-500/5 text-green-400' : 'border-red-500/30 bg-red-500/5 text-red-400'}`}>
                        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                        {connected ? 'Live' : 'Offline'}
                    </div>
                    <button onClick={load} disabled={loading} className="btn-neon flex items-center gap-2">
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KPI icon={AlertTriangle} label="Total Incidents" value={kpis.totalIncidents ?? '—'} sub="All time" color="#ff3366" delay={0} />
                <KPI icon={Activity} label="Active Incidents" value={kpis.activeIncidents ?? '—'} sub="Right now" color="#ffb347" delay={0.05} />
                <KPI icon={Shield} label="Alerts Triggered" value={kpis.totalAlerts ?? '—'} sub="Total" color="#7b61ff" delay={0.1} />
                <KPI icon={TrendingUp} label="Unread Alerts" value={kpis.unreadAlerts ?? '—'} sub="Need action" color="#ff6b35" delay={0.15} />
                <KPI icon={BarChart2} label="Avg Zone Risk" value={kpis.avgRisk ?? '—'} sub="Score / 100" color="#00d4ff" delay={0.2} />
            </div>

            {/* Middle row — gauge + live detection + alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Risk Gauge */}
                <GlassCard className="p-6 flex flex-col items-center justify-center" glow={riskScore >= 65 ? 'red' : riskScore >= 35 ? '' : 'green'}>
                    <p className="text-xs font-semibold text-slate-400 mb-4 tracking-widest uppercase">System Risk Index</p>
                    <RiskGauge score={Math.round(riskScore)} label="Overall Risk Score" size={180} />
                    {liveRisk !== null && (
                        <p className="text-xs text-cyan-400 mt-3 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            Live feed updating
                        </p>
                    )}
                </GlassCard>

                {/* Live Detection Feed */}
                <GlassCard className="p-5">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
                        <Users size={14} className="text-cyan-400" />
                        Live Detection Feed
                    </h3>
                    {lastDetection ? (
                        <div className="space-y-3">
                            {[
                                { label: 'People Detected', value: lastDetection.people_count ?? '—', icon: Users, color: '#00d4ff' },
                                { label: 'Vehicles', value: lastDetection.vehicle_count ?? '—', icon: Car, color: '#7b61ff' },
                                {
                                    label: 'Crowd Density',
                                    value: lastDetection.density_level ?? `${Math.round((lastDetection.crowd_density || 0) * 100)}%`,
                                    icon: Activity,
                                    color: '#ffb347'
                                },
                                {
                                    label: 'Movement Speed',
                                    value: lastDetection.movement_level ?? lastDetection.movement_speed ?? '—',
                                    icon: TrendingUp,
                                    color: '#00ff88'
                                },
                            ].map(({ label, value, icon: Icon, color }) => (
                                <div key={label} className="flex items-center justify-between p-2.5 rounded-lg bg-white/3">
                                    <div className="flex items-center gap-2">
                                        <Icon size={13} style={{ color }} />
                                        <span className="text-xs text-slate-400">{label}</span>
                                    </div>
                                    <span className="text-sm font-bold" style={{ color }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm">
                            <Activity size={24} className="mb-2 opacity-40" />
                            Waiting for live data…
                        </div>
                    )}
                </GlassCard>

                {/* Alert Panel */}
                <GlassCard className="p-5">
                    <AlertPanel liveAlert={lastAlert} maxItems={5} />
                </GlassCard>
            </div>

            {/* Charts row */}
            {analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <GlassCard className="p-5">
                        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
                            <BarChart2 size={14} className="text-cyan-400" />
                            Hourly Incident Breakdown (24h)
                        </h3>
                        <div className="h-48">
                            <HourlyChart data={analytics.hourly || []} />
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
                            <TrendingUp size={14} className="text-cyan-400" />
                            7-Day Incident Trend
                        </h3>
                        <div className="h-48">
                            <DailyTrendChart data={analytics.daily || []} />
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
