const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let redisClient = null;
let redisSubscriber = null;

let isReady = false;

// Wrap Redis initialization in try-catch to prevent crashes
try {
    redisClient = new Redis(REDIS_URL, { 
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
            if (times > 3) {
                console.log('⚠️ Redis max retries reached, running in demo mode');
                return null; // Stop retrying
            }
            return Math.min(times * 100, 1000);
        },
        lazyConnect: true
    });
    
    redisSubscriber = new Redis(REDIS_URL, { 
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 100, 1000);
        },
        lazyConnect: true
    });

    // Try to connect but don't crash if it fails
    redisClient.connect().catch(() => {
        console.log('ℹ️ Redis not available, running in demo mode (no streaming)');
    });
    
    redisClient.on('ready', () => { 
        isReady = true; 
        console.log('✅ Redis Stream Producer connected'); 
    });
    redisClient.on('error', (err) => { 
        isReady = false; 
        // Don't log error - just silently handle
    });
    redisClient.on('close', () => {
        isReady = false;
    });
} catch (err) {
    console.log('ℹ️ Redis not available, running in demo mode');
}

const STREAM_KEY = 'frames:queue';
const RESULTS_CHANNEL = 'frames:results';

async function enqueue(jobId, frameBuffer, streamId, zoneId, zoneName) {
    if (!isReady) {
        throw new Error('Redis not connected');
    }

    const frameB64 = frameBuffer ? frameBuffer.toString('base64') : '';

    // Push to Redis Streams via XADD
    // Adding fields: jobId, streamId, zoneId, zoneName, frame_b64
    const entryId = await redisClient.xadd(
        STREAM_KEY,
        '*', // let Redis generate ID
        'jobId', jobId,
        'streamId', streamId || '',
        'zoneId', zoneId || '',
        'zoneName', zoneName || '',
        'frame_b64', frameB64
    );

    return entryId;
}

function subscribeToResults(callback) {
    if (!isReady || !redisSubscriber) return;

    redisSubscriber.subscribe(RESULTS_CHANNEL, (err, count) => {
        if (err) console.error('Failed to subscribe to results channel:', err);
        else console.log(`🎧 Subscribed to ${RESULTS_CHANNEL}`);
    });

    redisSubscriber.on('message', (channel, message) => {
        if (channel === RESULTS_CHANNEL) {
            try {
                const data = JSON.parse(message);
                callback(data);
            } catch (err) {
                console.error('Failed to parse message from Redis:', err);
            }
        }
    });
}

function isConnected() {
    return isReady;
}

module.exports = {
    enqueue,
    subscribeToResults,
    isConnected,
};
