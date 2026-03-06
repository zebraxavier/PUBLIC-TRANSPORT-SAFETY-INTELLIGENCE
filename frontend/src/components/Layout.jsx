import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Radio, BarChart3, Map, AlertTriangle,
    Bell, ShieldAlert, Activity, Wifi, WifiOff
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useState, useEffect } from 'react';

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/live', label: 'Live Monitoring', icon: Radio },
    { to: '/analytics', label: 'Risk Analytics', icon: BarChart3 },
    { to: '/map', label: 'Transport Map', icon: Map },
    { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
    { to: '/alerts', label: 'Alerts', icon: Bell },
];

export default function Layout() {
    const { connected, lastAlert, alertCount, clearAlertCount } = useWebSocket();
    const location = useLocation();
    const [toastAlert, setToastAlert] = useState(null);

    // Show toast when WS alert arrives
    useEffect(() => {
        if (!lastAlert) return;
        setToastAlert(lastAlert);
        const t = setTimeout(() => setToastAlert(null), 5000);
        return () => clearTimeout(t);
    }, [lastAlert]);

    return (
        <div className="flex h-screen overflow-hidden bg-[#050811]">

            {/* ── Sidebar ─────────────────────────────────────────── */}
            <aside className="w-64 flex-shrink-0 flex flex-col bg-[#080d1a] border-r border-white/5">

                {/* Branding */}
                <div className="px-6 pt-6 pb-5 border-b border-white/5">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                            <ShieldAlert size={16} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-cyan-400/70 font-medium tracking-widest uppercase">Public Transport</p>
                        </div>
                    </div>
                    <h1 className="text-gradient-blue text-base font-bold leading-tight mt-1">Safety Intelligence</h1>
                </div>

                {/* Connection indicator */}
                <div className="px-6 py-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        {connected
                            ? <><Wifi size={12} className="text-green-400" /><span className="text-xs text-green-400">Live Connected</span></>
                            : <><WifiOff size={12} className="text-red-400" /><span className="text-xs text-red-400">Reconnecting…</span></>
                        }
                        {connected && <span className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                    {navItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative
                                ${isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                                }`
                            }
                        >
                            <Icon size={16} />
                            <span>{label}</span>
                            {to === '/alerts' && alertCount > 0 && (
                                <span
                                    onClick={clearAlertCount}
                                    className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse"
                                >
                                    {alertCount > 9 ? '9+' : alertCount}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom status */}
                <div className="px-6 py-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Activity size={11} />
                        <span>PTSI v1.0 · Smart City</span>
                    </div>
                </div>
            </aside>

            {/* ── Main Content ─────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto bg-grid">
                <Outlet />
            </main>

            {/* ── Alert Toast ──────────────────────────────────────── */}
            <AnimatePresence>
                {toastAlert && (
                    <motion.div
                        key={toastAlert._id || Date.now()}
                        initial={{ x: 400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 400, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed top-5 right-5 z-50 w-80 glass-card border-red-500/40 p-4"
                        style={{ boxShadow: '0 0 30px rgba(255,51,102,0.25)' }}
                    >
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-red-300">{toastAlert.title || '⚠️ Alert'}</p>
                                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{toastAlert.message}</p>
                                {toastAlert.riskScore && (
                                    <p className="text-xs text-red-400 mt-1 font-medium">Risk Score: {toastAlert.riskScore}</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
