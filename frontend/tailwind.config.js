/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                'neon-blue': '#00d4ff',
                'neon-green': '#00ff88',
                'neon-red': '#ff3366',
                'neon-amber': '#ffb347',
                'glass-bg': 'rgba(255,255,255,0.05)',
                'glass-border': 'rgba(255,255,255,0.12)',
                'dark-900': '#050811',
                'dark-800': '#0a0f1e',
                'dark-700': '#0f1629',
                'dark-600': '#151d35',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'cyber-grid': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='rgba(0,212,255,0.05)' stroke-width='1'/%3E%3C/svg%3E\")",
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'slide-up': 'slideUp 0.5s ease-out',
                'fade-in': 'fadeIn 0.4s ease-out',
                'spin-slow': 'spin 8s linear infinite',
            },
            keyframes: {
                glow: { '0%': { opacity: '0.6' }, '100%': { opacity: '1' } },
                slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
                fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
            },
            fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
            boxShadow: {
                'glass': '0 8px 32px rgba(0, 0, 0, 0.37)',
                'neon-blue': '0 0 20px rgba(0, 212, 255, 0.4)',
                'neon-green': '0 0 20px rgba(0, 255, 136, 0.4)',
                'neon-red': '0 0 20px rgba(255, 51, 102, 0.4)',
            }
        }
    },
    plugins: []
}
