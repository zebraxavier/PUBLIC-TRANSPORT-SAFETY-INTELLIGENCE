// WebSocket service for real-time alerts from backend
const WS_URL = 'ws://localhost:5000/ws'

class WSService {
    constructor() {
        this.ws = null
        this.listeners = {}
        this.reconnectTimer = null
        this.connected = false
    }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return

        try {
            this.ws = new WebSocket(WS_URL)

            this.ws.onopen = () => {
                this.connected = true
                console.log('🔌 WebSocket connected')
                this._emit('connection', { status: 'connected' })
                if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
            }

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    this._emit(data.type, data)
                    this._emit('*', data) // wildcard listeners
                } catch (e) {
                    console.warn('WS parse error', e)
                }
            }

            this.ws.onclose = () => {
                this.connected = false
                console.log('🔌 WebSocket disconnected, reconnecting in 3s...')
                this._emit('connection', { status: 'disconnected' })
                this.reconnectTimer = setTimeout(() => this.connect(), 3000)
            }

            this.ws.onerror = (err) => {
                console.warn('WebSocket error (backend may be offline):', err.type)
                this.ws.close()
            }
        } catch (e) {
            console.warn('WebSocket not available:', e.message)
            this.reconnectTimer = setTimeout(() => this.connect(), 5000)
        }
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = []
        this.listeners[event].push(callback)
        return () => this.off(event, callback) // return unsubscribe fn
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback)
        }
    }

    _emit(event, data) {
        ; (this.listeners[event] || []).forEach(cb => cb(data))
    }

    disconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
        if (this.ws) this.ws.close()
        this.connected = false
    }

    isConnected() { return this.connected }
}

const wsService = new WSService()
export default wsService
