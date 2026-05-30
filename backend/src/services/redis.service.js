const { createClient } = require('redis');
const config = require('../config/env');

let client = null;
let isConnected = false;

if (process.env.NODE_ENV !== 'test' && config.redisUrl) {
  client = createClient({
    url: config.redisUrl,
  });

  client.on('error', (err) => {
    console.error('[Redis] ❌ Client Error:', err.message);
    isConnected = false;
  });

  client.on('connect', () => {
    console.log('[Redis] Connecting to server...');
  });

  client.on('ready', () => {
    console.log('[Redis] ✓ Client is ready and connected.');
    isConnected = true;
  });

  client.connect().catch((err) => {
    console.error('[Redis] ❌ Initial connection failed:', err.message);
    isConnected = false;
  });
}

/**
 * Get value from cache by key.
 * Automatically parses JSON strings back into objects.
 */
async function get(key) {
  if (!client || !isConnected) return null;
  try {
    const rawVal = await client.get(key);
    if (!rawVal) return null;
    return JSON.parse(rawVal);
  } catch (err) {
    console.error(`[Redis] ⚠ Get error for key "${key}":`, err.message);
    return null; // Graceful degradation
  }
}

/**
 * Set value in cache by key with optional TTL (time to live) in seconds.
 * Stringifies objects automatically.
 */
async function set(key, value, ttlSeconds = 3600) {
  if (!client || !isConnected) return false;
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await client.setEx(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
    return true;
  } catch (err) {
    console.error(`[Redis] ⚠ Set error for key "${key}":`, err.message);
    return false; // Graceful degradation
  }
}

/**
 * Delete key from cache.
 */
async function del(key) {
  if (!client || !isConnected) return false;
  try {
    await client.del(key);
    return true;
  } catch (err) {
    console.error(`[Redis] ⚠ Del error for key "${key}":`, err.message);
    return false; // Graceful degradation
  }
}

/**
 * Delete multiple keys matching a pattern.
 */
async function delPattern(pattern) {
  if (!client || !isConnected) return false;
  try {
    const keys = await client.keys(pattern);
    if (keys && keys.length > 0) {
      await client.del(keys);
    }
    return true;
  } catch (err) {
    console.error(`[Redis] ⚠ DelPattern error for pattern "${pattern}":`, err.message);
    return false; // Graceful degradation
  }
}

module.exports = {
  client,
  get,
  set,
  del,
  delPattern,
  isConnected: () => isConnected,
};
