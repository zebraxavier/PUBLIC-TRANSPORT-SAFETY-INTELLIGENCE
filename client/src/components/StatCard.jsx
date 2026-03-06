import { motion } from 'framer-motion'
import GlassCard from './GlassCard'

const colorMap = {
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', glow: 'shadow-blue-500/20' },
    red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', glow: 'shadow-red-500/20' },
    yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', glow: 'shadow-yellow-500/20' },
    green: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', glow: 'shadow-green-500/20' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', glow: 'shadow-purple-500/20' },
    cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', glow: 'shadow-cyan-500/20' },
}

export default function StatCard({ title, value, subtitle, icon, color = 'blue', trend, delay = 0 }) {
    const c = colorMap[color] || colorMap.blue

    return (
        <GlassCard className={`relative overflow-hidden border ${c.border}`} transition={{ delay, duration: 0.4 }}>
            {/* Background glow */}
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl ${c.bg}`} />

            <div className="relative">
                <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${c.bg}`}>
                        {icon}
                    </div>
                    {trend !== undefined && (
                        <span className={`text-xs font-medium ${trend >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
                        </span>
                    )}
                </div>

                <div className={`text-3xl font-bold mt-1 ${c.text} tabular-nums`}>
                    {value}
                </div>
                <div className="text-sm text-gray-300 font-medium mt-0.5">{title}</div>
                {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
            </div>
        </GlassCard>
    )
}
