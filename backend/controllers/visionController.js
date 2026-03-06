const SensorStream = require('../models/SensorStream');
const { v4: uuidv4 } = require('uuid');
const { enqueue } = require('../services/frameQueue');

const AI_SERVICE = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// POST /api/vision/detection
exports.processDetection = async (req, res) => {
    try {
        const { frame_base64, stream_id, zone_id, zone_name } = req.body;

        const frameBuffer = frame_base64 ? Buffer.from(frame_base64, 'base64') : null;

        const result = await enqueue({
            streamId: stream_id,
            zoneId: zone_id,
            zoneName: zone_name,
            frameBuffer,
            source: 'stream'
        });

        // Update sensor stream record status only (metadata will be updated by subscriber)
        await SensorStream.findOneAndUpdate(
            { stream_id: stream_id || 'default' },
            {
                status: 'active',
                last_frame_at: new Date(),
                zone_id, zone_name
            },
            { upsert: true, new: true }
        );

        res.status(202).json({ success: true, message: 'Frame accepted', ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/stream/start
exports.startStream = async (req, res) => {
    try {
        const { zone_id, zone_name, device_id, source_type } = req.body;
        const stream_id = uuidv4();
        const stream = new SensorStream({ stream_id, zone_id, zone_name, device_id, source_type: source_type || 'mobile_camera', status: 'active' });
        await stream.save();
        if (global.broadcast) global.broadcast({ type: 'stream_started', data: { stream_id, zone_name } });
        res.json({ success: true, stream_id, message: 'Stream session started' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/stream/active
exports.getActiveStreams = async (req, res) => {
    try {
        const streams = await SensorStream.find({ status: 'active' }).sort({ started_at: -1 });
        res.json({ success: true, count: streams.length, data: streams });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

function simulateDetection() {
    const people = Math.floor(Math.random() * 80) + 5;
    const vehicles = Math.floor(Math.random() * 30);
    const density = Math.min(1, people / 100);
    const congestion = Math.min(1, vehicles / 40);
    const risk_score = Math.round((0.4 * density + 0.3 * (vehicles / 50) + 0.2 * congestion + 0.1 * 0.2) * 100);
    return {
        people_count: people,
        vehicle_count: vehicles,
        crowd_density: parseFloat(density.toFixed(2)),
        congestion_level: parseFloat(congestion.toFixed(2)),
        movement_speed: parseFloat((Math.random() * 3 + 0.5).toFixed(1)),
        risk_score,
        risk_category: risk_score >= 70 ? 'Danger' : risk_score >= 40 ? 'Warning' : 'Safe',
        objects_detected: ['person', 'car', 'motorcycle'].filter(() => Math.random() > 0.4),
        timestamp: new Date()
    };
}

// POST /api/stream/frame (multipart binary upload)
exports.receiveFrame = async (req, res) => {
    try {
        const { zone_id, zone_name, stream_id } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No frame data provided' });
        }

        const frameData = req.file.buffer;
        const frameBase64 = frameData.toString('base64');

        const result = await enqueue({
            streamId: stream_id || 'binary_' + Date.now(),
            zoneId: zone_id,
            zoneName: zone_name || 'Stream Zone',
            frameBuffer: frameData,
            source: 'binary_stream'
        });

        // Update sensor stream
        await SensorStream.findOneAndUpdate(
            { stream_id: stream_id || 'binary_stream' },
            {
                status: 'active',
                last_frame_at: new Date(),
                zone_id,
                zone_name
            },
            { upsert: true, new: true }
        );

        res.status(202).json({ success: true, message: 'Frame accepted', ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Simulate detection for demo purposes (fallback if AI service is unavailable)
exports.simulateDetection = (req, res) => {
    try {
        res.json({ success: true, data: simulateDetection() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
