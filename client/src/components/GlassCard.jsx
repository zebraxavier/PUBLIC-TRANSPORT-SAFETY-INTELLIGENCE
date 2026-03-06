import { motion } from 'framer-motion'
import { clsx } from 'clsx'

export default function GlassCard({ children, className, hover = false, glow = false, onClick, initial, animate, transition }) {
    const Tag = onClick ? 'button' : 'div'
    const cls = clsx(
        'glass-card p-5',
        hover && 'glass-card-hover cursor-pointer',
        glow && 'animate-glow',
        className
    )
    return (
        <motion.div
            className={cls}
            onClick={onClick}
            initial={initial || { opacity: 0, y: 16 }}
            animate={animate || { opacity: 1, y: 0 }}
            transition={transition || { duration: 0.4 }}
        >
            {children}
        </motion.div>
    )
}
