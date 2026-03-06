import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const RISK_COLOR = (score) => {
    if (score < 35) return { primary: '#00ff88', secondary: '#00d4ff', label: 'SAFE', badge: 'badge-safe' };
    if (score < 65) return { primary: '#ffb347', secondary: '#ff6b35', label: 'WARNING', badge: 'badge-warning' };
    return { primary: '#ff3366', secondary: '#ff0040', label: 'DANGER', badge: 'badge-danger' };
};

export default function RiskGauge({ score = 0, label = 'Risk Score', size = 160 }) {
    const canvasRef = useRef(null);
    const colors = RISK_COLOR(score);
    const radius = size / 2 - 14;
    const circumference = Math.PI * radius; // half circle

    // Draw on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h - 14;

        ctx.clearRect(0, 0, w, h);

        // Background arc
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, 0);
        ctx.lineWidth = 12;
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Progress arc
        const pct = Math.min(score, 100) / 100;
        const gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
        gradient.addColorStop(0, '#00ff88');
        gradient.addColorStop(0.5, '#ffb347');
        gradient.addColorStop(1, '#ff3366');

        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, Math.PI + Math.PI * pct);
        ctx.lineWidth = 12;
        ctx.strokeStyle = gradient;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Needle tip glow
        const angle = Math.PI + Math.PI * pct;
        const nx = cx + radius * Math.cos(angle);
        const ny = cy + radius * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(nx, ny, 6, 0, Math.PI * 2);
        ctx.fillStyle = colors.primary;
        ctx.shadowColor = colors.primary;
        ctx.shadowBlur = 12;
        ctx.fill();
    }, [score, radius, colors.primary]);

    return (
        <motion.div
            className="flex flex-col items-center"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
        >
            <canvas
                ref={canvasRef}
                width={size}
                height={size / 2 + 14}
                className="block"
            />
            <div className="text-center -mt-2">
                <div className="text-3xl font-black" style={{ color: colors.primary }}>
                    {score}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                <span className={`mt-1.5 inline-block ${colors.badge}`}>{colors.label}</span>
            </div>
        </motion.div>
    );
}
