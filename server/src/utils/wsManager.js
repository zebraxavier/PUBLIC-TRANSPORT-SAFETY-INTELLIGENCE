const WebSocket = require('ws');
const redisPubSub = require('./redisPubSub');

let wss = null;
const clients = new Set();

const initWebSocket = (server) => {
    wss = new WebSocket.Server({ server, path: '/ws' });

    wss.on('connection', (ws, req) => {
        clients.add(ws);
        console.log(`📡 WS client connected. Total: ${clients.size}`);

        ws.send(JSON.stringify({ type: 'connected', message: 'PTSI WebSocket Active', timestamp: new Date() }));

        ws.on('close', () => {
            clients.delete(ws);
            console.log(`📡 WS client disconnected. Total: ${clients.size}`);
        });

        ws.on('error', (err) => {
            console.error('WS error:', err.message);
            clients.delete(ws);
        });
    });

    redisPubSub.subscribe((data) => {
        const message = JSON.stringify(data);
        clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
};

const broadcast = (data) => {
    redisPubSub.publish(data);
    return 1;
};

const broadcastAlert = (alert) => {
    return broadcast({ type: 'alert', payload: alert, timestamp: new Date() });
};

const broadcastDetection = (detection) => {
    return broadcast({ type: 'detection', payload: detection, timestamp: new Date() });
};

const broadcastRiskUpdate = (zone, riskData) => {
    return broadcast({ type: 'risk_update', zone, payload: riskData, timestamp: new Date() });
};

module.exports = { initWebSocket, broadcast, broadcastAlert, broadcastDetection, broadcastRiskUpdate };
