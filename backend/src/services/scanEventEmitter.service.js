const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

/**
 * All supported scan event types with their expected payload shapes.
 * Version field enables future schema evolution without breaking old clients.
 */
const SCAN_EVENT_TYPES = new Set([
  'repository.synced',
  'scan.started',
  'scan.progress',
  'dependency.analyzed',
  'vulnerability.detected',
  'ai.analysis.started',
  'ai.analysis.completed',
  'remediation.generated',
  'pull_request.created',
  'scan.completed',
  'scan.failed',
]);

/**
 * Emits a structured, versioned scan event to a Socket.IO room via the Redis emitter.
 *
 * Envelope shape:
 * {
 *   eventId: string,         // UUID v4 — unique per emission
 *   event: string,           // One of SCAN_EVENT_TYPES
 *   version: 1,              // Schema version for future evolution
 *   timestamp: string,       // ISO 8601
 *   room: string,            // The subscription room (e.g. "scan_owner/repo")
 *   payload: object          // Event-specific data
 * }
 *
 * @param {import("@socket.io/redis-emitter").Emitter} io  Redis-backed Socket.IO emitter
 * @param {string} room   Room identifier (e.g. "scan_owner/repo-name")
 * @param {string} eventType  One of the 11 supported scan event types
 * @param {object} payload    Event-specific payload (will be validated/sanitised)
 */
function emitScanEvent(io, room, eventType, payload = {}) {
  if (!SCAN_EVENT_TYPES.has(eventType)) {
    logger.warn(`[ScanEventEmitter] Unknown event type: ${eventType}`);
    return;
  }

  const envelope = {
    eventId: randomUUID(),
    event: eventType,
    version: 1,
    timestamp: new Date().toISOString(),
    room,
    payload: sanitisePayload(payload),
  };

  try {
    io.to(room).emit('scan:event', envelope);
    logger.debug(`[ScanEventEmitter] ${eventType} → ${room}`);
  } catch (err) {
    logger.error(`[ScanEventEmitter] Failed to emit ${eventType}: ${err.message}`);
  }
}

/**
 * Strips any HTML from string values to prevent XSS in streamed logs.
 * Handles nested objects one level deep.
 */
function sanitisePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === 'string') {
      out[k] = v.replace(/<[^>]*>/g, '');
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = sanitisePayload(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

module.exports = { emitScanEvent, SCAN_EVENT_TYPES };
