import { useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'

const WS_URL = 'ws://localhost:5000/ws'

export function useWebSocket() {
    const wsRef = useRef(null)
    const reconnectRef = useRef(null)
    const { addAlert, setLiveDetection, updateRisk, setWsConnected } = useApp()

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(WS_URL)
            wsRef.current = ws

            ws.onopen = () => {
                console.log('✅ WebSocket connected')
                setWsConnected(true)
                if (reconnectRef.current) clearTimeout(reconnectRef.current)
            }

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data)
                    switch (msg.type) {
                        case 'alert':
                            addAlert(msg.payload)
                            break
                        case 'detection':
                            setLiveDetection(msg.payload)
                            break
                        case 'risk_update':
                            if (msg.payload?.riskScore !== undefined) {
                                updateRisk({ score: msg.payload.riskScore, level: msg.payload.riskLevel })
                            }
                            break
                        default:
                            break
                    }
                } catch (e) {
                    console.warn('WS parse error', e)
                }
            }

            ws.onclose = () => {
                setWsConnected(false)
                console.log('🔴 WebSocket disconnected, reconnecting in 3s...')
                reconnectRef.current = setTimeout(connect, 3000)
            }

            ws.onerror = () => {
                ws.close()
            }
        } catch (e) {
            console.warn('WS connection failed:', e)
            reconnectRef.current = setTimeout(connect, 5000)
        }
    }, [addAlert, setLiveDetection, updateRisk, setWsConnected])

    useEffect(() => {
        connect()
        return () => {
            if (reconnectRef.current) clearTimeout(reconnectRef.current)
            if (wsRef.current) wsRef.current.close()
        }
    }, [connect])

    const send = useCallback((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data))
        }
    }, [])

    return { send }
}
