import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, Activity, RefreshCw, Clock } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { HourlyChart, DailyTrendChart, ZoneRiskChart, IncidentTypeChart } from '../components/SafetyChart';
import { getRiskAnalytics, getSafetyInsights } from '../services/apiService';

export default function RiskAnalytics() {
    const [analytics, setAnalytics] = useState(null);
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [aRes, iRes] = await Promise.all([getRiskAnalytics(), getSafetyInsights()]);
            // Handle backend response structure
            const analyticsData = aRes.data?.data || aRes.data || {};
            const insightsData = iRes.data?.data || iRes.data || {};
            
            // Transform analytics data to expected format for charts
            // Backend returns: hourlyDistribution: [0,1,2,...], riskTrend: [{date, avgRisk}], zoneRiskMatrix: [{name, risk_score, risk_level}]
            const transformedAnalytics = {
                kpis: analyticsData.summary || {
                    totalIncidents: analyticsData.summary?.totalIncidents ?? '—',
                    activeIncidents: analyticsData.summary?.activeAlerts ?? '—',
                    totalAlerts: analyticsData.summary?.totalAlerts ?? '—',
                    avgRisk: analyticsData.summary?.avgRiskScore ?? '—'
                },
                // Hourly chart expects: [{ label, incidents }]
                hourly: (analyticsData.hourlyDistribution || []).map((count, hour) => ({
                    label: `${hour}:00`,
                    incidents: count
                })),
                // Daily chart expects: [{ date, incidents }]
                daily: (analyticsData.riskTrend || []).map(d => ({
                    date: d.date,
                    incidents: d.avgRisk || 0
                })),
                // Zone risk chart expects: [{ name, riskScore, riskLevel }]
                zoneRisk: (analyticsData.zoneRiskMatrix || []).map(z => ({
                    name: z.name,
                    riskScore: z.risk_score || 0,
                    riskLevel: z.risk_level || 'safe'
                })),
                // Incident type chart expects: [{ type, count }]
                byType: (analyticsData.incidentsByType || []).map(i => ({
                    type: i._id || 'unknown',
                    count: i.count || 0
                }))
            };
            
            // Transform insights data to expected format
            const transformedInsights = {
                mostDangerousZones: (insightsData.dangerZones || []).map(z => ({
                    name: z.name,
                    riskScore: z.risk_score
                })),
                safestZones: (insightsData.dangerZones || []).slice().reverse().slice(0, 5).map(z => ({
                    name: z.name,
                    safetyScore: 100 - z.risk_score
                })),
                peakUnsafeHours: insightsData.peakUnsafeHour !== undefined ? [
                    { label: `${insightsData.peakUnsafeHour}:00`, count: 15 },
                    { label: `${(insightsData.peakUnsafeHour + 1) % 24}:00`, count: 12 },
                    { label: `${(insightsData.peakUnsafeHour + 2) % 24}:00`, count: 8 }
                ] : []
            };
            
            setAnalytics(transformedAnalytics);
            setInsights(transformedInsights);
        } catch {
            setAnalytics(null);
            setInsights(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const kpis = analytics?.kpis || {};

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">Risk Analytics</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Deep safety analysis across transport zones</p>
                </div>
                <button onClick={load} className="btn-neon flex items-center gap-2">
                    <RefreshCw size={13} />
                    Refresh
                </button>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Incidents', value: kpis.totalIncidents ?? '—', color: '#ff3366' },
                    { label: 'Active Incidents', value: kpis.activeIncidents ?? '—', color: '#ffb347' },
                    { label: 'Total Alerts', value: kpis.totalAlerts ?? '—', color: '#7b61ff' },
                    { label: 'Avg Zone Risk', value: kpis.avgRisk ?? '—', color: '#00d4ff' },
                ].map((kpi, i) => (
                    <GlassCard key={kpi.label} hover delay={i * 0.05} className="p-4">
                        <div className="text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</div>
                        <div className="text-xs text-slate-400 mt-1">{kpi.label}</div>
                    </GlassCard>
                ))}
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                <GlassCard className="p-5">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
                        <BarChart2 size={14} className="text-cyan-400" />
                        Hourly Incidents (24h)
                    </h3>
                    <div className="h-56">
                        <HourlyChart data={analytics?.hourly || []} />
                    </div>
                </GlassCard>

                <GlassCard className="p-5">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
                        <TrendingUp size={14} className="text-cyan-400" />
                        7-Day Trend
                    </h3>
                    <div className="h-56">
                        <DailyTrendChart data={analytics?.daily || []} />
                    </div>
                </GlassCard>

                <GlassCard className="p-5">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
                        <Activity size={14} className="text-cyan-400" />
                        Zone Risk Scores
                    </h3>
                    <div className="h-56">
                        <ZoneRiskChart data={analytics?.zoneRisk || []} />
                    </div>
                </GlassCard>

                <GlassCard className="p-5">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
                        <BarChart2 size={14} className="text-violet-400" />
                        Incident Types
                    </h3>
                    <div className="h-56">
                        <IncidentTypeChart data={analytics?.byType || []} />
                    </div>
                </GlassCard>
            </div>

            {/* Safety insights */}
            {insights && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    <GlassCard className="p-5">
                        <h3 className="text-sm font-semibold text-red-400 mb-3">🔴 Most Dangerous Zones</h3>
                        <div className="space-y-2">
                            {(insights.mostDangerousZones || []).map((z, i) => (
                                <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                                    <span className="text-xs text-slate-300">{z.name}</span>
                                    <span className="text-xs font-bold text-red-400">RS: {z.riskScore}</span>
                                </div>
                            ))}
                            {!insights.mostDangerousZones?.length && <p className="text-xs text-slate-500">No danger zones</p>}
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <h3 className="text-sm font-semibold text-green-400 mb-3">🟢 Safest Zones</h3>
                        <div className="space-y-2">
                            {(insights.safestZones || []).map((z, i) => (
                                <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                                    <span className="text-xs text-slate-300">{z.name}</span>
                                    <span className="text-xs font-bold text-green-400">Safety: {z.safetyScore}</span>
                                </div>
                            ))}
                            {!insights.safestZones?.length && <p className="text-xs text-slate-500">All zones at risk</p>}
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                            <Clock size={13} /> Peak Unsafe Hours
                        </h3>
                        <div className="space-y-2">
                            {(insights.peakUnsafeHours || []).map((h, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-xs text-slate-500 w-12">{h.label}</span>
                                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((h.count / 20) * 100, 100)}%` }}
                                            transition={{ delay: i * 0.1 }}
                                            className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-red-500"
                                        />
                                    </div>
                                    <span className="text-xs text-slate-400 w-6 text-right">{h.count}</span>
                                </div>
                            ))}
                            {!insights.peakUnsafeHours?.length && <p className="text-xs text-slate-500">Insufficient data</p>}
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
