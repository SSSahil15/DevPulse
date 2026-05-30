const { pubClient } = require('../config/redis');
const logger = require('../utils/logger');

const EVENT_CACHE_PREFIX = 'scan:events:';
const EVENT_CACHE_TTL = 60 * 60; // 1 hour in seconds
const MAX_CACHED_EVENTS = 200; // Rolling window per scan room

/**
 * Appends a scan event envelope to the Redis list for this room.
 * The list is capped at MAX_CACHED_EVENTS and expires after EVENT_CACHE_TTL.
 *
 * @param {string} room      Socket.IO room key (e.g. "scan_owner/repo")
 * @param {object} envelope  Structured event envelope from scanEventEmitter
 */
async function cacheEvent(room, envelope) {
  const key = `${EVENT_CACHE_PREFIX}${room}`;
  try {
    const serialised = JSON.stringify(envelope);
    // RPUSH appends; LTRIM keeps only the last MAX_CACHED_EVENTS entries
    await pubClient.rpush(key, serialised);
    await pubClient.ltrim(key, -MAX_CACHED_EVENTS, -1);
    await pubClient.expire(key, EVENT_CACHE_TTL);
  } catch (err) {
    // Non-fatal — live streaming still works without the cache
    logger.warn(`[ScanEventCache] Failed to cache event for ${room}: ${err.message}`);
  }
}

/**
 * Returns all cached events for a room, oldest first.
 * Used to replay events to a client that reconnects mid-scan.
 *
 * @param {string} room
 * @param {number} [sinceIndex=0]  Start from this list index (for partial replay)
 * @returns {Promise<object[]>}    Parsed event envelopes
 */
async function getReplayEvents(room, sinceIndex = 0) {
  const key = `${EVENT_CACHE_PREFIX}${room}`;
  try {
    const raw = await pubClient.lrange(key, sinceIndex, -1);
    return raw
      .map((r) => {
        try {
          return JSON.parse(r);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (err) {
    logger.warn(`[ScanEventCache] Failed to fetch replay events for ${room}: ${err.message}`);
    return [];
  }
}

/**
 * Returns the current count of cached events for a room.
 * Clients can compare this with their last-known index to request a partial replay.
 *
 * @param {string} room
 * @returns {Promise<number>}
 */
async function getEventCount(room) {
  const key = `${EVENT_CACHE_PREFIX}${room}`;
  try {
    return await pubClient.llen(key);
  } catch {
    return 0;
  }
}

/**
 * Clears the event cache for a room after scan completion.
 * Called when scan.completed or scan.failed is emitted.
 *
 * @param {string} room
 */
async function clearCache(room) {
  const key = `${EVENT_CACHE_PREFIX}${room}`;
  try {
    // Reduce TTL to 5 minutes after scan ends — enough for late reconnects
    await pubClient.expire(key, 5 * 60);
  } catch (err) {
    logger.warn(`[ScanEventCache] Failed to clear cache for ${room}: ${err.message}`);
  }
}

module.exports = { cacheEvent, getReplayEvents, getEventCount, clearCache };
