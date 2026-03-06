import { useState, useCallback } from 'react'
import { api } from '../services/apiService'

export function useSimulation() {
    const [loading, setLoading] = useState(false)
    const [lastResult, setLastResult] = useState(null)
    const [activeScenario, setActiveScenario] = useState(null)

    const SCENARIOS = [
        { id: 'overcrowding', label: 'Overcrowding', icon: '👥', color: 'red', description: 'Simulate extreme crowd density' },
        { id: 'traffic_surge', label: 'Traffic Surge', icon: '🚗', color: 'orange', description: 'Simulate aggressive vehicle congestion' },
        { id: 'suspicious_movement', label: 'Suspicious Activity', icon: '👁️', color: 'yellow', description: 'Simulate unusual movement patterns' },
        { id: 'congestion', label: 'Severe Congestion', icon: '🚦', color: 'red', description: 'Simulate combined crowd and vehicle congestion' },
        { id: 'emergency', label: 'Emergency', icon: '🆘', color: 'red', description: 'Simulate emergency evacuation' },
        { id: 'normal', label: 'Clear Zone', icon: '✅', color: 'green', description: 'Reset zone to safe conditions' },
    ]

    const triggerScenario = useCallback(async (scenarioId, zoneId = null) => {
        setLoading(true)
        setActiveScenario(scenarioId)
        try {
            const res = await api.post('/vision/simulate', { scenario: scenarioId, zoneId })
            setLastResult(res.data)
            return res.data
        } catch (err) {
            console.error('Simulation error:', err)
            return null
        } finally {
            setLoading(false)
        }
    }, [])

    return { triggerScenario, loading, lastResult, activeScenario, SCENARIOS }
}
