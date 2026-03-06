const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const BROADCAST_CHANNEL = 'ptsi:broadcasts';

let publisher = null;
let subscriber = null;
let isReady = false;

try {
    publisher = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
    subscriber = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

    publisher.on('ready', () => { isReady = true; console.log('✅ Redis Pub/Sub connected'); });
    publisher.on('error', (err) => { isReady = false; console.warn('⚠️ Redis pubsub error:', err.message); });
} catch (err) {
    console.warn('⚠️ Redis Pub/Sub not available:', err.message);
}

const publish = (data) => {
    if (isReady && publisher) {
        publisher.publish(BROADCAST_CHANNEL, JSON.stringify(data));
    }
};

const subscribe = (callback) => {
    if (isReady && subscriber) {
        subscriber.subscribe(BROADCAST_CHANNEL, (err) => {
            if (err) console.error('Failed to subscribe to ptis:broadcasts', err);
        });

        subscriber.on('message', (channel, message) => {
            if (channel === BROADCAST_CHANNEL) {
                try {
                    const data = JSON.parse(message);
                    callback(data);
                } catch (err) {
                    console.error('Failed to parse Pub/Sub message:', err);
                }
            }
        });
    }
};

module.exports = { publish, subscribe, BROADCAST_CHANNEL };
