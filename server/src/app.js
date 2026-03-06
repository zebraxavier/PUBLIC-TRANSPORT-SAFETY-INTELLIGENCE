const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const visionRoutes = require('./routes/visionRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const alertRoutes = require('./routes/alertRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'PTSI API', timestamp: new Date() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/zones', zoneRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;
