import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, CheckCheck, Filter, RefreshCw, AlertTriangle, Info, AlertOctagon } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { getAlerts, markAlertRead, markAllAlertsRead } from '../services/apiService';
import { useWebSocket } from '../hooks/useWebSocket';

const SEV_CONFIG = {
    info: { icon: Info, color: 'text-blue-400', border: 'border-blue-500/25', bg: 'bg-blue-500/5', badge: 'bg-blue-500/20 text-blue-400' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400', border: 'border-yellow-500/25', bg: 'bg-yellow-500/5', badge: 'bg-yellow-500/20 text-yellow-400' },
    danger: { icon: AlertTriangle, color: 'text-orange-400', border: 'border-orange-500/25', bg: 'bg-orange-500/5', badge: 'bg-orange-500/20 text-orange-400' },
    critical: { icon: AlertOctagon, color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/8', badge: 'bg-red-500/20 text-red-400' },
};

export default function Alerts() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sevFilter, setSevFilter] = useState('all');
    const [showUnread, setShowUnread] = useState(false);
    const { lastAlert } = useWebSocket();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAlerts({ limit: 100, sort: '-createdAt' });
            setAlerts(res.data?.data || res.data || []);
        } catch {
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Prepend WS live alert
    useEffect(() => {
        if (!lastAlert) return;
        setAlerts(prev => {
            const exists = prev.some(a => a._id === lastAlert._id);
            if (exists) return prev;
            return [{ ...lastAlert, isRead: false }, ...prev];
        });
    }, [lastAlert]);

    const handleRead = async (id) => {
        try { await markAlertRead(id); } catch { /* silent */ }
        setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
    };

    const handleReadAll = async () => {
        try { await markAllAlertsRead(); } catch { /* silent */ }
        setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    };

    const filtered = alerts.filter(a => {
        const matchSev = sevFilter === 'all' || a.severity === sevFilter;
        const matchUnread = !showUnread || !a.isRead;
        return matchSev && matchUnread;
    });

    const unreadCount = alerts.filter(a => !a.isRead).length;

    return (
        <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        Alerts
                        {unreadCount > 0 && (
                            <span className="text-sm font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded-full animate-pulse">
                                {unreadCount} unread
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">{alerts.length} total · real-time WebSocket feed</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleReadAll} className="btn-neon flex items-center gap-2 text-xs">
                        <CheckCheck size={13} />
                        Mark All Read
                    </button>
                    <button onClick={load} className="btn-neon flex items-center gap-2">
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <GlassCard className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter size={13} className="text-slate-500" />
                        <span className="text-xs text-slate-400">Severity:</span>
                        {['all', 'info', 'warning', 'danger', 'critical'].map(s => (
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
                    <button
                        onClick={() => setShowUnread(!showUnread)}
                        className={`ml-auto flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all ${showUnread
                            ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                            : 'text-slate-400 border border-transparent hover:border-white/10'
                            }`}
                    >
                        {showUnread ? <BellOff size={12} /> : <Bell size={12} />}
                        {showUnread ? 'Showing Unread' : 'Show Unread Only'}
                    </button>
                </div>
            </GlassCard>

            {/* Alert list */}
            {loading ? (
                <div className="flex items-center justify-center h-32">
                    <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-2">
                    <AnimatePresence>
                        {filtered.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-16 text-slate-500"
                            >
                                <Bell size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No alerts found</p>
                                <p className="text-xs mt-1">Trigger a simulation to generate alerts</p>
                            </motion.div>
                        )}
                        {filtered.map((alert, i) => {
                            const cfg = SEV_CONFIG[alert.severity] || SEV_CONFIG.info;
                            const Icon = cfg.icon;
                            return (
                                <motion.div
                                    key={alert._id || i}
                                    layout
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ delay: Math.min(i * 0.015, 0.2) }}
                                    onClick={() => handleRead(alert._id)}
                                    className={`glass-card p-4 cursor-pointer transition-all duration-200 border ${cfg.border} ${cfg.bg} ${!alert.isRead ? 'ring-1 ring-inset ring-white/5' : 'opacity-65'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.badge}`}>
                                            <Icon size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className={`text-sm font-semibold ${cfg.color}`}>{alert.title}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.badge}`}>{alert.severity}</span>
                                                {!alert.isRead && <span className="text-xs text-cyan-400 animate-pulse">● NEW</span>}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{alert.message}</p>
                                            <div className="flex items-center gap-4 mt-2">
                                                {alert.zoneName && <span className="text-xs text-slate-500">📍 {alert.zoneName}</span>}
                                                {alert.riskScore && <span className={`text-xs font-bold ${cfg.color}`}>RS: {alert.riskScore}</span>}
                                                <span className="text-xs text-slate-600 ml-auto">
                                                    {alert.createdAt ? new Date(alert.createdAt).toLocaleString('en-US', {
                                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    }) : 'Just now'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
