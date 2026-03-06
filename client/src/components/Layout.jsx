import { NavLink, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { useApp } from '../context/AppContext'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
    { to: '/dashboard', icon: '⚡', label: 'Dashboard' },
    { to: '/live', icon: '📡', label: 'Live Monitor' },
    { to: '/analytics', icon: '📊', label: 'Risk Analytics' },
    { to: '/map', icon: '🗺️', label: 'Safety Map' },
    { to: '/incidents', icon: '⚠️', label: 'Incidents' },
    { to: '/alerts', icon: '🔔', label: 'Alerts' },
]

export default function Layout() {
    useWebSocket()
    const { riskLevel, riskScore, unreadCount, clearUnread, wsConnected } = useApp()

    const riskColors = {
        safe: 'text-green-400',
        warning: 'text-yellow-400',
        danger: 'text-red-400',
    }

    return (
        <div className="flex h-screen overflow-hidden bg-[#0a0d1a]">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 flex flex-col" style={{
                background: 'rgba(15, 17, 35, 0.95)',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)'
            }}>
                {/* Logo */}
                <div className="p-5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                            🛡️
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white leading-none">PTSI</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">Safety Intelligence</div>
                        </div>
                    </div>
                </div>

                {/* Live Risk Indicator */}
                <div className="mx-3 mt-4 p-3 rounded-xl" style={{
                    background: riskLevel === 'danger' ? 'rgba(239,68,68,0.1)' : riskLevel === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.08)',
                    border: `1px solid ${riskLevel === 'danger' ? 'rgba(239,68,68,0.3)' : riskLevel === 'warning' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.2)'}`
                }}>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">System Risk</div>
                    <div className={`text-xl font-bold ${riskColors[riskLevel]}`}>{riskScore}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${riskLevel === 'danger' ? 'bg-red-500 animate-pulse' : riskLevel === 'warning' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                        <span className={`text-xs capitalize ${riskColors[riskLevel]}`}>{riskLevel}</span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 mt-4 space-y-1">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => item.to === '/alerts' && clearUnread()}
                            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span className="text-sm font-medium">{item.label}</span>
                            {item.to === '/alerts' && unreadCount > 0 && (
                                <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* WS Status */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-gray-600'}`} />
                        {wsConnected ? 'Real-time Connected' : 'Connecting...'}
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    )
}
