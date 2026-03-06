import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'

const SEVERITY_CONFIG = {
    critical: { bg: 'bg-red-900/30', border: 'border-red-500/50', text: 'text-red-300', dot: 'bg-red-500 animate-pulse', badge: 'badge-critical' },
    danger: { bg: 'bg-red-800/20', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-500', badge: 'badge-danger' },
    warning: { bg: 'bg-yellow-900/20', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-500 animate-pulse', badge: 'badge-warning' },
    info: { bg: 'bg-blue-900/20', border: 'border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500', badge: 'badge-info' },
}

function AlertItem({ alert, onMarkRead }) {
    const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info
    const time = alert.createdAt ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true }) : 'just now'

    return (
        <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className={`flex gap-3 p-3 rounded-xl border ${cfg.bg} ${cfg.border} ${!alert.isRead ? 'ring-1 ring-white/10' : 'opacity-70'}`}
        >
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${cfg.text} truncate`}>{alert.title}</p>
                    <span className={cfg.badge}>{alert.severity}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{alert.message}</p>
                <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] text-gray-600">{time}</span>
                    {alert.zoneName && (
                        <span className="text-[11px] text-gray-500 truncate ml-2">📍 {alert.zoneName}</span>
                    )}
                    {!alert.isRead && onMarkRead && (
                        <button onClick={() => onMarkRead(alert._id)} className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors ml-2">✓ Mark read</button>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

export default function AlertPanel({ alerts = [], onMarkRead, maxHeight = 'max-h-[420px]', showEmpty = true }) {
    return (
        <div className={`${maxHeight} overflow-y-auto space-y-2 pr-1`}>
            <AnimatePresence initial={false}>
                {alerts.length === 0 && showEmpty ? (
                    <div className="text-center py-10 text-gray-600">
                        <div className="text-4xl mb-2">✅</div>
                        <p className="text-sm">No alerts at this time</p>
                    </div>
                ) : (
                    alerts.map((alert, i) => (
                        <AlertItem key={alert._id || i} alert={alert} onMarkRead={onMarkRead} />
                    ))
                )}
            </AnimatePresence>
        </div>
    )
}
