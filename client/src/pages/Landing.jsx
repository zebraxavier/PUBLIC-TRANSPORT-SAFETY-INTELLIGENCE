import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const features = [
    { icon: '🎥', title: 'AI Computer Vision', desc: 'Real-time YOLO object detection for people, vehicles, and crowd analysis' },
    { icon: '🧠', title: 'Risk Prediction', desc: 'ML-powered safety risk scoring with contextual feature analysis' },
    { icon: '🗺️', title: 'Safety Map', desc: 'Interactive zone visualization with live risk color coding' },
    { icon: '⚡', title: 'Real-time Alerts', desc: 'WebSocket-powered instant incident notifications and severity classification' },
    { icon: '📡', title: 'IoT Camera Streaming', desc: 'Use any mobile device as a smart transport monitoring sensor' },
    { icon: '📊', title: 'Analytics Dashboard', desc: 'Peak hours, hotspots, route safety, and crowd pattern analysis' },
]

const stats = [
    { value: '99.2%', label: 'Detection Accuracy' },
    { value: '<3s', label: 'Alert Latency' },
    { value: '8+', label: 'Transport Zones' },
    { value: '24/7', label: 'Monitoring Active' },
]

export default function Landing() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-[#0a0d1a] overflow-hidden">
            {/* Animated background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full opacity-10 blur-[120px]"
                    style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
                <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full opacity-8 blur-[100px]"
                    style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />
                <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full opacity-6 blur-[80px]"
                    style={{ background: 'radial-gradient(circle, #00d4ff, transparent)' }} />
            </div>

            {/* Nav */}
            <nav className="relative z-10 flex items-center justify-between px-8 py-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>🛡️</div>
                    <div>
                        <div className="font-bold text-white text-lg leading-none">PTSI</div>
                        <div className="text-[11px] text-gray-500">Safety Intelligence</div>
                    </div>
                </div>
                <button onClick={() => navigate('/dashboard')} className="btn-primary text-white text-sm font-semibold px-5 py-2.5">
                    Launch Dashboard →
                </button>
            </nav>

            {/* Hero */}
            <section className="relative z-10 text-center px-6 pt-20 pb-16">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                    <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs text-indigo-300 font-medium">Smart City Safety Platform — Active</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black leading-none mb-6">
                        <span className="text-white">Public Transport</span><br />
                        <span className="neon-text">Safety Intelligence</span>
                    </h1>

                    <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        AI-powered real-time monitoring for urban transport networks. Detect risks, prevent incidents,
                        and protect millions of passengers with computer vision and predictive analytics.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate('/dashboard')}
                            className="btn-primary text-white font-bold px-8 py-4 text-base"
                        >
                            🚀 Open Command Center
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate('/live')}
                            className="glass-card px-8 py-4 text-base font-semibold text-white border-indigo-500/30 hover:border-indigo-500/60 transition-all"
                        >
                            📡 Start Live Monitoring
                        </motion.button>
                    </div>
                </motion.div>
            </section>

            {/* Stats */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="relative z-10 px-6 pb-12"
            >
                <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((s, i) => (
                        <div key={i} className="glass-card p-5 text-center">
                            <div className="neon-text text-3xl font-black">{s.value}</div>
                            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            </motion.section>

            {/* Features */}
            <section className="relative z-10 px-6 pb-20 max-w-6xl mx-auto">
                <h2 className="text-center text-2xl font-bold text-white mb-3">Platform Capabilities</h2>
                <p className="text-center text-gray-500 text-sm mb-10">End-to-end intelligent transport safety ecosystem</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((f, i) => (
                        <motion.div
                            key={f.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * i + 0.6 }}
                            className="glass-card-hover p-6"
                        >
                            <div className="text-3xl mb-4">{f.icon}</div>
                            <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Architecture Banner */}
            <section className="relative z-10 px-6 pb-16">
                <div className="max-w-3xl mx-auto glass-card p-6 text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-medium">System Architecture</div>
                    <div className="flex items-center justify-center gap-2 flex-wrap text-sm text-gray-300">
                        <span className="badge-info px-3 py-1">📱 Mobile Camera</span>
                        <span className="text-gray-600">→</span>
                        <span className="badge-info px-3 py-1">🌐 WebRTC Stream</span>
                        <span className="text-gray-600">→</span>
                        <span className="badge-warning px-3 py-1">🧠 YOLOv8 CV</span>
                        <span className="text-gray-600">→</span>
                        <span className="badge-warning px-3 py-1">⚡ Node.js API</span>
                        <span className="text-gray-600">→</span>
                        <span className="badge-safe px-3 py-1">📊 React Dashboard</span>
                    </div>
                </div>
            </section>

            <footer className="relative z-10 text-center text-gray-600 text-xs pb-8">
                PTSI — Public Transport Safety Intelligence System · Built for Smart Cities
            </footer>
        </div>
    )
}
