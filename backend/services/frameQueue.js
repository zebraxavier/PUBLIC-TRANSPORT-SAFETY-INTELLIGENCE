/**
 * Frame Queue — Issue 2 Fix (In-process async decoupling)
 * 
 * Architecture:
 *   POST /api/stream/frame → enqueue (202 Accepted, < 1ms) → worker pool → result callback
 *
 * Production note: Replace the in-process EventEmitter queue with Redis Streams:
 *   client.xadd('frames:queue', '*', 'frame_b64', ..., 'zone_id', ...)
 *   then run ai-service/workers/frame_worker.py as separate consumer group.
 *
 * This file works without Redis/Kafka for the demo setup.
 */

const EventEmitter = require('events');
const axios = require('axios');
const redisProducer = require('./redisStreamProducer');

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

const AI_SERVICE = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const CONCURRENCY = parseInt(process.env.AI_WORKER_CONCURRENCY || '4', 10);

// ── Queue ──────────────────────────────────────────────────────────────────
const queue = [];
let active = 0;
const results = new Map(); // jobId → { resolve, reject, timeout }

async function enqueue(job) {
    if (redisProducer.isConnected()) {
        const jobId = `${job.streamId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await redisProducer.enqueue(jobId, job.frameBuffer, job.streamId, job.zoneId, job.zoneName);
        return { jobId, status: 'enqueued' };
    } else {
        return new Promise((resolve, reject) => {
            const jobId = `${job.streamId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const timeout = setTimeout(() => {
                results.delete(jobId);
                reject(new Error(`AI job ${jobId} timed out after 15s`));
            }, 15_000);

            results.set(jobId, { resolve, reject, timeout });
            queue.push({ ...job, jobId });
            drain();
        });
    }
}

function drain() {
    while (active < CONCURRENCY && queue.length > 0) {
        const job = queue.shift();
        active++;
        processJob(job)
            .then(result => settle(job.jobId, null, result))
            .catch(err => settle(job.jobId, err, null))
            .finally(() => { active--; drain(); });
    }
}

async function processJob({ jobId, frameBuffer, streamId, zoneId, zoneName }) {
    const frameB64 = frameBuffer.toString('base64');
    try {
        // Try real AI service first
        const { data } = await axios.post(`${AI_SERVICE}/detect`,
            { frame_base64: frameB64 }, { timeout: 10_000 });
        return { ...data, source: 'ai_service' };
    } catch {
        // Fallback: local simulation (handles no-AI-service demo mode)
        return localSimulate(zoneId, zoneName);
    }
}

function settle(jobId, err, result) {
    const pending = results.get(jobId);
    if (!pending) return;
    clearTimeout(pending.timeout);
    results.delete(jobId);
    if (err) pending.reject(err);
    else pending.resolve(result);
}

function localSimulate(zoneId, zoneName) {
    const people = Math.floor(Math.random() * 80) + 5;
    const vehicles = Math.floor(Math.random() * 30);
    const density = +Math.min(1, people / 100).toFixed(2);
    const congestion = +Math.min(1, vehicles / 40 + density * 0.3).toFixed(2);
    const riskScore = Math.round((0.4 * density + 0.3 * vehicles / 50 + 0.2 * congestion) * 100);

    return {
        people_count: people, vehicle_count: vehicles,
        crowd_density: density, congestion_level: congestion,
        movement_speed: density > 0.75 ? 'slow' : density > 0.5 ? 'normal' : 'fast',
        anomaly_score: +(Math.random() * 0.3).toFixed(2),
        risk_score: riskScore,
        risk_category: riskScore >= 65 ? 'Danger' : riskScore >= 35 ? 'Warning' : 'Safe',
        zone_id: zoneId,
        zone_name: zoneName,
        timestamp: new Date().toISOString(),
        source: 'local_simulation',
    };
}

/** Queue stats for /health endpoint */
function stats() {
    return {
        queued: queue.length,
        active,
        concurrency: CONCURRENCY,
        pendingResults: results.size,
    };
}

module.exports = { enqueue, stats };
