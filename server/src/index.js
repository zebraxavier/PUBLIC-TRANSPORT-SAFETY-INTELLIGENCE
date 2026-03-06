require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initWebSocket } = require('./utils/wsManager');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = http.createServer(app);
  initWebSocket(server);

  server.listen(PORT, () => {
    console.log(`🚀 PTSI Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket server active`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  });
});
