import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, AlertOctagon, Bell } from 'lucide-react';
import { getAlerts, markAlertRead, markAllAlertsRead } from '../services/apiService';

const SEV_MAP = {
    info: { icon: Info, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/5' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/5' },
    danger: { icon: AlertTriangle, color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/5' },
    critical: { icon: AlertOctagon, color: 'text-red-400', border: 'border-red-500/40', bg: 'bg-red-500/8' },
};

export default function AlertPanel({ liveAlert, maxItems = 8 }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const res = await getAlerts({ limit: maxItems, sort: '-createdAt' });
            setAlerts(res.data?.data || res.data || []);
        } catch {
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // Prepend real-time alert from WebSocket
    useEffect(() => {
        if (!liveAlert) return;
        setAlerts(prev => [liveAlert, ...prev].slice(0, maxItems));
    }, [liveAlert]);

    const handleRead = async (id) => {
        try { await markAlertRead(id); } catch { /* silent */ }
        setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
    };

    const handleReadAll = async () => {
        try { await markAllAlertsRead(); } catch { /* silent */ }
        setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    };

    if (loading) return (
        <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Bell size={14} className="text-cyan-400" />
                    <span className="text-sm font-semibold text-slate-200">Live Alerts</span>
                    {alerts.filter(a => !a.isRead).length > 0 && (
                        <span className="badge-danger">{alerts.filter(a => !a.isRead).length}</span>
                    )}
                </div>
                <button onClick={handleReadAll} className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                    Mark all read
                </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                    {alerts.length === 0 && (
                        <p className="text-xs text-slate-500 text-center py-6">No alerts yet</p>
                    )}
                    {alerts.map((alert, i) => {
                        const sev = SEV_MAP[alert.severity] || SEV_MAP.info;
                        const Icon = sev.icon;
                        return (
                            <motion.div
                                key={alert._id || i}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                onClick={() => handleRead(alert._id)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${sev.border} ${sev.bg} ${!alert.isRead ? 'ring-1 ring-red-500/20' : 'opacity-60'}`}
                            >
                                <div className="flex items-start gap-2">
                                    <Icon size={13} className={`${sev.color} mt-0.5 flex-shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-semibold ${sev.color}`}>{alert.title}</p>
                                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{alert.message}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            {alert.zoneName && <span className="text-xs text-slate-500">{alert.zoneName}</span>}
                                            {alert.riskScore && <span className={`text-xs font-bold ${sev.color}`}>RS: {alert.riskScore}</span>}
                                        </div>
                                    </div>
                                    {!alert.isRead && <div className="w-2 h-2 rounded-full bg-red-400 mt-1 flex-shrink-0 animate-pulse" />}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
