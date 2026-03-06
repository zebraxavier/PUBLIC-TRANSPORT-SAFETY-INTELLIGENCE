import { useEffect, useRef } from 'react'

const RISK_COLORS = {
    safe: { arc: '#22c55e', glow: 'rgba(34,197,94,0.4)', text: '#22c55e', label: 'SAFE' },
    warning: { arc: '#f59e0b', glow: 'rgba(245,158,11,0.4)', text: '#f59e0b', label: 'WARNING' },
    danger: { arc: '#ef4444', glow: 'rgba(239,68,68,0.5)', text: '#ef4444', label: 'DANGER' },
}

export default function RiskGauge({ score = 0, level = 'safe', size = 180 }) {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const dpr = window.devicePixelRatio || 1
        canvas.width = size * dpr
        canvas.height = size * dpr
        ctx.scale(dpr, dpr)

        const cx = size / 2
        const cy = size / 2 + 20
        const r = size * 0.38
        const startAngle = Math.PI * 0.75
        const endAngle = Math.PI * 2.25
        const progress = Math.min(Math.max(score, 0), 100) / 100
        const scoreAngle = startAngle + (endAngle - startAngle) * progress

        ctx.clearRect(0, 0, size, size)

        // Track background
        ctx.beginPath()
        ctx.arc(cx, cy, r, startAngle, endAngle)
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'
        ctx.lineWidth = 14
        ctx.lineCap = 'round'
        ctx.stroke()

        // Colored arc
        const col = RISK_COLORS[level] || RISK_COLORS.safe
        const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy)
        grad.addColorStop(0, level === 'safe' ? '#22c55e' : level === 'warning' ? '#22c55e' : '#f59e0b')
        grad.addColorStop(1, level === 'safe' ? '#00d4ff' : level === 'warning' ? '#f59e0b' : '#ef4444')

        ctx.shadowColor = col.glow
        ctx.shadowBlur = 16

        ctx.beginPath()
        ctx.arc(cx, cy, r, startAngle, scoreAngle)
        ctx.strokeStyle = grad
        ctx.lineWidth = 14
        ctx.lineCap = 'round'
        ctx.stroke()
        ctx.shadowBlur = 0

        // Score text
        ctx.fillStyle = col.text
        ctx.font = `bold ${size * 0.22}px Inter, system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(score, cx, cy - 8)

        // Level label
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.font = `600 ${size * 0.08}px Inter, system-ui, sans-serif`
        ctx.fillText(col.label, cx, cy + size * 0.15)

        // Tick marks
        for (let i = 0; i <= 10; i++) {
            const angle = startAngle + (endAngle - startAngle) * (i / 10)
            const tickLen = i % 5 === 0 ? 8 : 4
            const x1 = cx + (r - 22) * Math.cos(angle)
            const y1 = cy + (r - 22) * Math.sin(angle)
            const x2 = cx + (r - 22 + tickLen) * Math.cos(angle)
            const y2 = cy + (r - 22 + tickLen) * Math.sin(angle)
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.strokeStyle = 'rgba(255,255,255,0.15)'
            ctx.lineWidth = i % 5 === 0 ? 2 : 1
            ctx.stroke()
        }
    }, [score, level, size])

    return (
        <div className="flex flex-col items-center">
            <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size }} />
            <div className="text-xs text-gray-500 mt-1">Risk Score / 100</div>
        </div>
    )
}
