/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                primary: { DEFAULT: '#6366f1', dark: '#4f46e5', light: '#818cf8' },
                danger: { DEFAULT: '#ef4444', dark: '#dc2626', glow: '#ef444440' },
                warning: { DEFAULT: '#f59e0b', dark: '#d97706', glow: '#f59e0b40' },
                safe: { DEFAULT: '#22c55e', dark: '#16a34a', glow: '#22c55e40' },
                surface: { DEFAULT: '#0f1117', card: '#1a1d2e', border: '#2a2d3e' },
                neon: { blue: '#00d4ff', purple: '#a855f7', green: '#22c55e', orange: '#f97316' },
            },
            fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
            backdropBlur: { xs: '2px' },
            boxShadow: {
                glass: '0 8px 32px rgba(0,0,0,0.4)',
                neon: '0 0 20px rgba(99,102,241,0.5)',
                'neon-danger': '0 0 20px rgba(239,68,68,0.5)',
                'neon-safe': '0 0 20px rgba(34,197,94,0.5)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
                'slide-in': 'slideIn 0.3s ease-out',
                'fade-in': 'fadeIn 0.5s ease-out',
            },
            keyframes: {
                slideIn: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
                fadeIn: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
            },
        },
    },
    plugins: [],
}
