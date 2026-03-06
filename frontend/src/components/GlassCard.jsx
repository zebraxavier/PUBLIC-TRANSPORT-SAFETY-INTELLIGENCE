import { motion } from 'framer-motion';

export default function GlassCard({
    children,
    className = '',
    hover = false,
    glow = '',        // 'blue' | 'green' | 'red' | 'gold'
    delay = 0,
    onClick,
}) {
    const glowMap = {
        blue: 'border-neon-blue',
        green: 'border-neon-green',
        red: 'border-neon-red',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            onClick={onClick}
            className={`glass-card ${hover ? 'glass-card-hover' : ''} ${glow ? glowMap[glow] || '' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
        >
            {children}
        </motion.div>
    );
}
