import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, LineElement, PointElement,
    ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, LineElement, PointElement,
    ArcElement, Title, Tooltip, Legend, Filler
);

const baseOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
        tooltip: {
            backgroundColor: 'rgba(8,13,26,0.95)',
            titleColor: '#00d4ff',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(0,212,255,0.2)',
            borderWidth: 1,
        },
    },
    scales: {
        x: { ticks: { color: '#475569', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#475569', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
    },
};

// ── Hourly Incidents Bar Chart ─────────────────────────────────────────────────
export function HourlyChart({ data = [] }) {
    const labels = data.map(d => d.label || `${d.hour}:00`);
    const incidents = data.map(d => d.incidents);

    const chartData = {
        labels,
        datasets: [{
            label: 'Incidents',
            data: incidents,
            backgroundColor: 'rgba(0,212,255,0.35)',
            borderColor: '#00d4ff',
            borderWidth: 1.5,
            borderRadius: 4,
        }],
    };

    return <Bar data={chartData} options={{ ...baseOpts, plugins: { ...baseOpts.plugins, legend: { display: false } } }} />;
}

// ── Daily Trend Line Chart ────────────────────────────────────────────────────
export function DailyTrendChart({ data = [] }) {
    const chartData = {
        labels: data.map(d => d.date),
        datasets: [{
            label: 'Incidents',
            data: data.map(d => d.incidents),
            fill: true,
            backgroundColor: 'rgba(0,212,255,0.08)',
            borderColor: '#00d4ff',
            borderWidth: 2,
            pointBackgroundColor: '#00d4ff',
            pointRadius: 4,
            tension: 0.4,
        }],
    };

    return <Line data={chartData} options={baseOpts} />;
}

// ── Zone Risk Bar Chart ───────────────────────────────────────────────────────
export function ZoneRiskChart({ data = [] }) {
    const colors = data.map(d => {
        if (d.riskLevel === 'danger') return 'rgba(255,51,102,0.7)';
        if (d.riskLevel === 'warning') return 'rgba(255,179,71,0.7)';
        return 'rgba(0,255,136,0.7)';
    });

    const chartData = {
        labels: data.map(d => d.name),
        datasets: [{
            label: 'Risk Score',
            data: data.map(d => d.riskScore),
            backgroundColor: colors,
            borderColor: colors.map(c => c.replace('0.7', '1')),
            borderWidth: 1.5,
            borderRadius: 4,
        }],
    };

    return (
        <Bar
            data={chartData}
            options={{
                ...baseOpts,
                plugins: { ...baseOpts.plugins, legend: { display: false } },
                scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, min: 0, max: 100 } },
            }}
        />
    );
}

// ── Incident Type Doughnut ────────────────────────────────────────────────────
export function IncidentTypeChart({ data = [] }) {
    const palette = ['#00d4ff', '#7b61ff', '#ff3366', '#ffb347', '#00ff88', '#ff6b35'];
    const chartData = {
        labels: data.map(d => d.type || d._id || 'Unknown'),
        datasets: [{
            data: data.map(d => d.count),
            backgroundColor: palette.map(c => c + '99'),
            borderColor: palette,
            borderWidth: 2,
            hoverOffset: 6,
        }],
    };

    return (
        <Doughnut
            data={chartData}
            options={{
                ...baseOpts,
                cutout: '65%',
                scales: {},
                plugins: { ...baseOpts.plugins, legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, padding: 8 } } },
            }}
        />
    );
}

export default { HourlyChart, DailyTrendChart, ZoneRiskChart, IncidentTypeChart };
