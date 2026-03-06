import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler)

const BASE_OPTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { color: '#9ca3af', font: { family: 'Inter', size: 11 } } },
        tooltip: {
            backgroundColor: 'rgba(15,17,35,0.95)',
            borderColor: 'rgba(99,102,241,0.3)',
            borderWidth: 1,
            titleColor: '#e5e7eb',
            bodyColor: '#9ca3af',
            padding: 10,
            cornerRadius: 8,
        },
    },
    scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { size: 11 } } },
    },
}

export function IncidentBarChart({ data = [], height = 220 }) {
    const chartData = {
        labels: data.map(d => d.type?.replace(/_/g, ' ') || d.label || ''),
        datasets: [{
            label: 'Incidents',
            data: data.map(d => d.count || d.incidents || 0),
            backgroundColor: 'rgba(99,102,241,0.6)',
            borderColor: 'rgba(99,102,241,1)',
            borderWidth: 1,
            borderRadius: 6,
        }]
    }
    return (
        <div style={{ height }}>
            <Bar data={chartData} options={{ ...BASE_OPTS, plugins: { ...BASE_OPTS.plugins, legend: { display: false } } }} />
        </div>
    )
}

export function RiskLineChart({ data = [], height = 220 }) {
    const chartData = {
        labels: data.map(d => d.label || d.date || ''),
        datasets: [{
            label: 'Risk Score',
            data: data.map(d => d.avgRisk || d.riskScore || d.incidents || 0),
            borderColor: 'rgba(99,102,241,1)',
            backgroundColor: 'rgba(99,102,241,0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: 'rgba(99,102,241,0.8)',
            pointRadius: 3,
        }, {
            label: 'Incidents',
            data: data.map(d => d.incidents || 0),
            borderColor: 'rgba(239,68,68,0.8)',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            pointBackgroundColor: 'rgba(239,68,68,0.8)',
            pointRadius: 3,
        }]
    }
    return (
        <div style={{ height }}>
            <Line data={chartData} options={BASE_OPTS} />
        </div>
    )
}

export function ZoneRiskDoughnut({ data = [], height = 200 }) {
    const chartData = {
        labels: data.map(d => d.name),
        datasets: [{
            data: data.map(d => d.riskScore || 0),
            backgroundColor: data.map(d =>
                d.riskLevel === 'danger' ? 'rgba(239,68,68,0.7)' :
                    d.riskLevel === 'warning' ? 'rgba(245,158,11,0.7)' :
                        'rgba(34,197,94,0.7)'
            ),
            borderColor: data.map(d =>
                d.riskLevel === 'danger' ? '#ef4444' :
                    d.riskLevel === 'warning' ? '#f59e0b' : '#22c55e'
            ),
            borderWidth: 1,
        }]
    }
    const opts = { ...BASE_OPTS, scales: undefined, maintainAspectRatio: false }
    return (
        <div style={{ height }}>
            <Doughnut data={chartData} options={opts} />
        </div>
    )
}

export function DailyLineChart({ data = [], height = 200 }) {
    const chartData = {
        labels: data.map(d => d.date),
        datasets: [{
            label: 'Daily Incidents',
            data: data.map(d => d.incidents || 0),
            borderColor: 'rgba(168,85,247,1)',
            backgroundColor: 'rgba(168,85,247,0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: 'rgba(168,85,247,0.8)',
            pointRadius: 4,
        }]
    }
    return (
        <div style={{ height }}>
            <Line data={chartData} options={{ ...BASE_OPTS, plugins: { ...BASE_OPTS.plugins, legend: { display: false } } }} />
        </div>
    )
}

export default { IncidentBarChart, RiskLineChart, ZoneRiskDoughnut, DailyLineChart }
