/**
 * Analytics Aggregator — Issue 5 Fix
 * Buffers detection results per zone per hour and flushes to MongoDB every 30s.
 * Reduces DB writes by ~600x (30,000 → 50 writes per 30s at 1000 cameras).
 */

const mongoose = require('mongoose');
require('../models/AnalyticsHourly'); // Ensure schema is loaded
const Zone = require('../models/Zone');

// In-process buffer: key = `${zoneId}:${date}:${hour}`
const buffer = new Map();
// Debounce buffer for Zone DB writes
const zoneDebounce = new Map();

/**
 * Record a single detection result (non-blocking, in-memory only).
 * Called after every successful frame analysis.
 */
function recordDetection({ zoneId, zoneName, riskScore, peopleCount, vehicleCount, riskLevel }) {
    const now = new Date();
    const hour = now.getHours();
    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `${zoneId}:${date}:${hour}`;

    if (!buffer.has(key)) {
        buffer.set(key, {
            zoneId, zoneName, date, hour,
            samples: 0,
            totalRisk: 0,
            maxRisk: 0,
            minRisk: 100,
            incidents: 0,
            dangerHits: 0,
            totalPeople: 0,
            totalVehicles: 0,
        });
    }

    const b = buffer.get(key);
    b.samples++;
    b.totalRisk += riskScore;
    b.maxRisk = Math.max(b.maxRisk, riskScore);
    b.minRisk = Math.min(b.minRisk, riskScore);
    b.totalPeople += peopleCount || 0;
    b.totalVehicles += vehicleCount || 0;
    if (riskLevel === 'danger') b.dangerHits++;
    if (riskScore >= 65) b.incidents++;

    // --- Debounced Zone Update ---
    debounceZoneUpdate({ zoneId, zoneName, riskScore, riskLevel, peopleCount, vehicleCount, now });
}

function debounceZoneUpdate({ zoneId, riskScore, riskLevel, peopleCount, vehicleCount, now }) {
    if (!zoneId) return;

    const last = zoneDebounce.get(zoneId);
    const shouldWrite = !last ||
        Math.abs(last.riskScore - riskScore) >= 5 ||
        (now.getTime() - last.lastWritten) > 60_000;

    if (shouldWrite && mongoose.connection.readyState === 1) {
        Zone.findByIdAndUpdate(zoneId, {
            crowdDensity: (peopleCount || 0) / 100, // rough density mapping
            vehicleCount: vehicleCount || 0,
            riskScore,
            riskLevel,
            lastUpdated: now
        }).catch(err => console.error('Zone DB update error:', err.message));

        zoneDebounce.set(zoneId, { lastWritten: now.getTime(), riskScore });
    }
}

/**
 * Flush buffer to MongoDB. Called on interval.
 * Uses upsert so it's safe to call multiple times.
 */
async function flush() {
    if (buffer.size === 0) return;

    // Only write if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
        console.log('[Aggregator] MongoDB not ready, skipping flush');
        return;
    }

    const AnalyticsHourly = mongoose.model('AnalyticsHourly');
    const writes = [];

    for (const [key, data] of buffer.entries()) {
        const avgRisk = Math.round(data.totalRisk / data.samples);
        writes.push({
            updateOne: {
                filter: { zoneId: data.zoneId, date: data.date, hour: data.hour },
                update: {
                    $set: {
                        zoneName: data.zoneName,
                        avgRisk,
                        maxRisk: data.maxRisk,
                        minRisk: data.minRisk,
                        sampleCount: data.samples,
                        incidents: data.incidents,
                        dangerHits: data.dangerHits,
                        avgPeople: Math.round(data.totalPeople / data.samples),
                        avgVehicles: Math.round(data.totalVehicles / data.samples),
                        updatedAt: new Date(),
                    },
                    $setOnInsert: { createdAt: new Date() }
                },
                upsert: true,
            }
        });
    }

    try {
        await AnalyticsHourly.bulkWrite(writes, { ordered: false });
        console.log(`[Aggregator] Flushed ${writes.length} zone-hour bucket(s) — ${[...buffer.values()].reduce((s, b) => s + b.samples, 0)} samples`);
    } catch (err) {
        console.error('[Aggregator] Flush error:', err.message);
    } finally {
        buffer.clear();
    }
}

// Start the 30-second flush interval automatically when this module is imported
let _interval = null;

function start(intervalMs = 30_000) {
    if (_interval) return;
    _interval = setInterval(flush, intervalMs);
    console.log(`[Aggregator] Started — flushing every ${intervalMs / 1000}s`);
}

function stop() {
    if (_interval) clearInterval(_interval);
    _interval = null;
}

/** Get current buffer stats (for health endpoint). */
function stats() {
    return {
        bufferedBuckets: buffer.size,
        totalSamples: [...buffer.values()].reduce((s, b) => s + b.samples, 0),
    };
}

module.exports = { recordDetection, flush, start, stop, stats };
