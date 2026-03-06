import { useState, useEffect } from 'react'
import GlassCard from '../components/GlassCard'
import { IncidentBarChart, RiskLineChart, DailyLineChart, ZoneRiskDoughnut } from '../components/SafetyChart'
import { analyticsAPI, zonesAPI } from '../services/apiService'
import { motion } from 'framer-motion'

const DEMO_HOURLY = Array.from({ length: 24 }, (_, h) => ({
    hour: h, label: `${h.toString().padStart(2, '0')}:00`,
    avgRisk: 15 + Math.sin(h / 3) * 20 + (h >= 7 && h <= 9 ? 35 : 0) + (h >= 17 && h <= 20 ? 30 : 0),
    incidents: [0, 0, 0, 0, 0, 1, 2, 5, 4, 3, 2, 2, 3, 2, 2, 1, 3, 5, 6, 4, 3, 2, 1, 0][h] || 0
}))

const DEMO_ZONE_RISK = [
    { name: 'Central Bus Terminal', riskScore: 72, riskLevel: 'danger' },
    { name: 'Outer Ring Highway', riskScore: 84, riskLevel: 'danger' },
    { name: 'Harbor Bus Stop', riskScore: 61, riskLevel: 'warning' },
    { name: 'Metro Station Alpha', riskScore: 48, riskLevel: 'warning' },
    { name: 'Suburban Rail Junction', riskScore: 38, riskLevel: 'safe' },
    { name: 'Airport Express', riskScore: 21, riskLevel: 'safe' },
    { name: 'Tech Park Shuttle', riskScore: 18, riskLevel: 'safe' },
]

const DEMO_INSIGHTS = {
    mostDangerousZones: [
        { name: 'Outer Ring Highway', riskScore: 84 },
        { name: 'Central Bus Terminal', riskScore: 72 },
        { name: 'Harbor Bus Stop', riskScore: 61 },
    ],
    peakUnsafeHours: [
        { hour: 18, label: '18:00', count: 9 },
        { hour: 8, label: '08:00', count: 7 },
        { hour: 19, label: '19:00', count: 6 },
        { hour: 7, label: '07:00', count: 5 },
        { hour: 17, label: '17:00', count: 5 },
    ],
    dangerCount: 2, safeCount: 3, totalZones: 8
}

export default function RiskAnalytics() {
    const [hourly, setHourly] = useState(DEMO_HOURLY)
    const [zoneRisk, setZoneRisk] = useState(DEMO_ZONE_RISK)
    const [insights, setInsights] = useState(DEMO_INSIGHTS)
    const [daily, setDaily] = useState([])
    const [byType, setByType] = useState([])

    useEffect(() => {
        const load = async () => {
            try {
                const [riskRes, insRes] = await Promise.allSettled([analyticsAPI.getRisk(), analyticsAPI.getInsights()])
                if (riskRes.status === 'fulfilled') {
                    const d = riskRes.value.data.data
                    setHourly(d.hourly || DEMO_HOURLY)
                    setZoneRisk(d.zoneRisk || DEMO_ZONE_RISK)
                    setDaily(d.daily || [])
                    setByType(d.byType || [])
                }
                if (insRes.status === 'fulfilled') setInsights(insRes.value.data.data || DEMO_INSIGHTS)
            } catch { }
        }
        load()
    }, [])

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-white">Risk Analytics</h1>
                <p className="text-sm text-gray-400 mt-1">Comprehensive safety analysis, patterns, and insights</p>
            </div>

            {/* Insights Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Danger Zones */}
                <GlassCard transition={{ delay: 0 }}>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">🔴 Most Dangerous Zones</div>
                    {insights.mostDangerousZones.map((z, i) => (
                        <div key={z.name} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">#{i + 1}</span>
                                <span className="text-sm text-gray-300 truncate max-w-[130px]">{z.name}</span>
                            </div>
                            <span className="text-red-400 font-bold text-sm">{z.riskScore}</span>
                        </div>
                    ))}
                </GlassCard>

                {/* Peak Hours */}
                <GlassCard transition={{ delay: 0.1 }}>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">⏰ Peak Unsafe Hours</div>
                    {insights.peakUnsafeHours.map((h, i) => (
                        <div key={h.hour} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">#{i + 1}</span>
                                <span className="text-sm text-gray-300">{h.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${(h.count / 10) * 100}%` }} />
                                </div>
                                <span className="text-yellow-400 font-bold text-sm">{h.count}</span>
                            </div>
                        </div>
                    ))}
                </GlassCard>

                {/* Zone Summary */}
                <GlassCard transition={{ delay: 0.2 }}>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">🛡️ Zone Safety Summary</div>
                    {[
                        { label: 'Safe Zones', count: insights.safeCount, color: 'bg-green-500', text: 'text-green-400' },
                        { label: 'Warning Zones', count: (insights.totalZones - insights.safeCount - insights.dangerCount), color: 'bg-yellow-500', text: 'text-yellow-400' },
                        { label: 'Danger Zones', count: insights.dangerCount, color: 'bg-red-500', text: 'text-red-400' },
                    ].map(item => (
                        <div key={item.label} className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                                <span className="text-sm text-gray-300">{item.label}</span>
                            </div>
                            <span className={`font-bold text-base ${item.text}`}>{item.count}</span>
                        </div>
                    ))}
                    <div className="mt-3 pt-3 border-t border-white/5 text-center text-xs text-gray-500">
                        {insights.totalZones} zones monitored
                    </div>
                </GlassCard>
            </div>

            {/* Hourly Risk Chart */}
            <GlassCard transition={{ delay: 0.25 }}>
                <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-semibold text-gray-300">Hourly Risk Profile (24h)</div>
                    <span className="badge-info">Live data</span>
                </div>
                <RiskLineChart data={hourly} height={240} />
            </GlassCard>

            {/* Zone Risk Distribution + Type Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <GlassCard transition={{ delay: 0.3 }}>
                    <div className="text-sm font-semibold text-gray-300 mb-4">Zone Risk Scores</div>
                    <div className="space-y-2">
                        {DEMO_ZONE_RISK.map(z => (
                            <div key={z.name} className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 w-32 truncate">{z.name}</span>
                                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${z.riskScore}%` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className={`h-full rounded-full ${z.riskLevel === 'danger' ? 'bg-red-500' : z.riskLevel === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`}
                                    />
                                </div>
                                <span className={`text-xs font-bold w-8 text-right ${z.riskLevel === 'danger' ? 'text-red-400' : z.riskLevel === 'warning' ? 'text-yellow-400' : 'text-green-400'}`}>{z.riskScore}</span>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                <GlassCard transition={{ delay: 0.35 }}>
                    <div className="text-sm font-semibold text-gray-300 mb-4">Zone Risk Distribution</div>
                    <ZoneRiskDoughnut data={zoneRisk} height={220} />
                </GlassCard>
            </div>
        </div>
    )
}
