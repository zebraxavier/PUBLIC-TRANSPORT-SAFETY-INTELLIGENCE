import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
    const [alerts, setAlerts] = useState([])
    const [riskLevel, setRiskLevel] = useState('safe')
    const [riskScore, setRiskScore] = useState(22)
    const [activeZone, setActiveZone] = useState(null)
    const [simulationMode, setSimulationMode] = useState(false)
    const [liveDetection, setLiveDetection] = useState(null)
    const [unreadCount, setUnreadCount] = useState(0)
    const [wsConnected, setWsConnected] = useState(false)

    const addAlert = useCallback((alert) => {
        setAlerts(prev => [alert, ...prev].slice(0, 100))
        setUnreadCount(prev => prev + 1)
    }, [])

    const clearUnread = useCallback(() => setUnreadCount(0), [])

    const updateRisk = useCallback(({ score, level }) => {
        setRiskScore(score)
        setRiskLevel(level)
    }, [])

    const value = {
        alerts, addAlert, riskLevel, riskScore, updateRisk,
        activeZone, setActiveZone,
        simulationMode, setSimulationMode,
        liveDetection, setLiveDetection,
        unreadCount, clearUnread,
        wsConnected, setWsConnected,
    }

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
    const ctx = useContext(AppContext)
    if (!ctx) throw new Error('useApp must be used within AppProvider')
    return ctx
}
