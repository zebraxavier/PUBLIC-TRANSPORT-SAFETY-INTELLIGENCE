import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Eye, Brain, MapPin, Bell, Activity, ArrowRight, Zap } from 'lucide-react';

const features = [
    { icon: Eye, title: 'Computer Vision', desc: 'YOLO-powered real-time object and crowd detection from live camera streams', color: '#00d4ff' },
    { icon: Brain, title: 'AI Risk Prediction', desc: 'ML model scores safety risk 0-100 from crowd density, vehicle counts & context', color: '#7b61ff' },
    { icon: MapPin, title: 'Safety Zone Map', desc: 'Interactive map showing safe, warning, and danger zones across the transport network', color: '#00ff88' },
    { icon: Bell, title: 'Real-time Alerts', desc: 'WebSocket-driven alerts broadcast instantly when high risk is detected', color: '#ff3366' },
    { icon: Activity, title: 'Transport Analytics', desc: 'Hourly trends, incident heatmaps, peak hours & most dangerous routes', color: '#ffb347' },
    { icon: Zap, title: 'IoT Simulation', desc: 'Use your phone as a smart sensor — stream live video directly to the system', color: '#ff6b35' },
];

const stats = [
    { value: '99.2%', label: 'Uptime SLA' },
    { value: '<500ms', label: 'Alert Latency' },
    { value: '6+', label: 'Simulation Modes' },
    { value: '24/7', label: 'Monitoring' },
];

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#050811] overflow-x-hidden">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[120px]" />
                <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-[100px]" />
                <div className="absolute -bottom-40 right-1/3 w-[500px] h-[500px] rounded-full bg-green-500/4 blur-[120px]" />
                <div className="absolute inset-0 bg-grid opacity-60" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-8 pt-6">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                        <Shield size={18} className="text-white" />
                    </div>
                    <span className="text-gradient-blue font-bold text-lg">PTSI</span>
                </div>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="btn-neon flex items-center gap-2"
                >
                    Open Dashboard <ArrowRight size={14} />
                </button>
            </header>

            {/* Hero */}
            <section className="relative z-10 text-center px-6 pt-24 pb-20">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                >
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5 text-cyan-400 text-xs font-semibold mb-8 tracking-widest">
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                        SMART CITY SAFETY PLATFORM
                    </span>

                    <h1 className="text-5xl md:text-7xl font-black mb-6 leading-none">
                        <span className="text-white">Public Transport</span>
                        <br />
                        <span className="text-gradient-blue">Safety Intelligence</span>
                    </h1>

                    <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
                        AI-powered transport monitoring platform combining computer vision, IoT sensors,
                        and real-time analytics to protect passengers across smart city networks.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate('/dashboard')}
                            className="px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-violet-600 shadow-lg shadow-cyan-500/30 flex items-center gap-2 justify-center"
                        >
                            Launch Command Center <ArrowRight size={16} />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate('/live')}
                            className="btn-neon flex items-center gap-2 justify-center"
                        >
                            <Eye size={16} /> Live Monitoring
                        </motion.button>
                    </div>
                </motion.div>
            </section>

            {/* Stats */}
            <section className="relative z-10 max-w-4xl mx-auto px-6 pb-20">
                <div className="glass-card p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {stats.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * i + 0.4 }}
                                className="text-center"
                            >
                                <div className="text-3xl font-black text-gradient-blue">{stat.value}</div>
                                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
                <motion.h2
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="text-center text-3xl font-black text-white mb-12"
                >
                    Platform <span className="text-gradient-blue">Capabilities</span>
                </motion.h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((f, i) => (
                        <motion.div
                            key={f.title}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="glass-card glass-card-hover p-6"
                        >
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                                style={{ background: f.color + '18', boxShadow: `0 0 20px ${f.color}18` }}
                            >
                                <f.icon size={20} style={{ color: f.color }} />
                            </div>
                            <h3 className="font-bold text-slate-100 mb-2">{f.title}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="relative z-10 text-center px-6 pb-20">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    className="max-w-2xl mx-auto glass-card p-10"
                    style={{ boxShadow: '0 0 60px rgba(0,212,255,0.08)' }}
                >
                    <Shield size={40} className="text-cyan-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-white mb-3">Ready to Monitor?</h2>
                    <p className="text-slate-400 text-sm mb-6">Launch the transport safety command center and start protecting passengers in real time.</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-violet-600 shadow-lg shadow-cyan-500/30 flex items-center gap-2 mx-auto"
                    >
                        Enter Dashboard <ArrowRight size={16} />
                    </button>
                </motion.div>
            </section>
        </div>
    );
}
