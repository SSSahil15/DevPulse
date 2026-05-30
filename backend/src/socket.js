const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { pubClient, subClient } = require('./config/redis');
const jwt = require('jsonwebtoken');
const config = require('./config/env');
const logger = require('./utils/logger');
const { getReplayEvents, getEventCount } = require('./services/scanEventCache.service');

let io;

// ── Per-room event rate limiter (token bucket, max 100 events/sec) ─────────────
const roomTokenBuckets = new Map();

function checkRoomRateLimit(room) {
  const now = Date.now();
  const bucket = roomTokenBuckets.get(room) || { tokens: 100, lastRefill: now };
  const elapsed = now - bucket.lastRefill;

  // Refill at 100 tokens/sec
  bucket.tokens = Math.min(100, bucket.tokens + (elapsed / 1000) * 100);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    roomTokenBuckets.set(room, bucket);
    return false; // rate limited
  }

  bucket.tokens -= 1;
  roomTokenBuckets.set(room, bucket);
  return true;
}

// Clean up stale buckets every 5 minutes
setInterval(
  () => {
    const staleThreshold = Date.now() - 5 * 60 * 1000;
    for (const [room, bucket] of roomTokenBuckets.entries()) {
      if (bucket.lastRefill < staleThreshold) roomTokenBuckets.delete(room);
    }
  },
  5 * 60 * 1000,
);

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [
        config.frontendUrl,
        'http://localhost:5173',
        'http://localhost:5174',
        ...config.allowedOrigins,
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Enable per-message compression to reduce bandwidth for large payloads
    perMessageDeflate: {
      threshold: 1024, // only compress messages > 1 KB
      zlibDeflateOptions: { level: 6 },
    },
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  io.adapter(createAdapter(pubClient, subClient));

  // ── JWT Authentication Middleware ──────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  // ── Connection Handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    logger.info(`[Socket] Connected: user=${socket.user.id} socketId=${socket.id}`);

    // ── Heartbeat: server → client ───────────────────────────────────────────
    const heartbeatInterval = setInterval(() => {
      socket.emit('heartbeat', { ts: Date.now() });
    }, 30_000);

    // ── Subscribe to scan room ───────────────────────────────────────────────
    socket.on('subscribe', async (room) => {
      if (typeof room !== 'string' || room.length > 200) {
        socket.emit('error', { message: 'Invalid room name.' });
        return;
      }
      socket.join(room);
      logger.info(`[Socket] User ${socket.user.id} subscribed → ${room}`);
      socket.emit('subscribed', { room });
    });

    // ── Unsubscribe from scan room ───────────────────────────────────────────
    socket.on('unsubscribe', (room) => {
      socket.leave(room);
      logger.info(`[Socket] User ${socket.user.id} unsubscribed ← ${room}`);
    });

    // ── Event replay: catch up missed events after reconnect ─────────────────
    socket.on('replay', async ({ room, sinceIndex = 0 }) => {
      if (typeof room !== 'string' || room.length > 200) return;

      const rooms = socket.rooms;
      if (!rooms.has(room)) {
        socket.emit('error', { message: 'Not subscribed to this room.' });
        return;
      }

      try {
        const totalEvents = await getEventCount(room);
        const events = await getReplayEvents(room, sinceIndex);
        logger.info(`[Socket] Replaying ${events.length} events for ${socket.user.id} in ${room}`);
        socket.emit('replay:events', { room, totalEvents, events });
      } catch (err) {
        logger.error(`[Socket] Replay failed: ${err.message}`);
        socket.emit('error', { message: 'Replay failed.' });
      }
    });

    // ── Pong from client heartbeat ───────────────────────────────────────────
    socket.on('pong_ack', () => {
      // Client acknowledged heartbeat — connection is healthy
    });

    // ── Disconnect cleanup ───────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      clearInterval(heartbeatInterval);
      logger.info(`[Socket] Disconnected: user=${socket.user.id} reason=${reason}`);
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
}

module.exports = { initSocket, getIo };
