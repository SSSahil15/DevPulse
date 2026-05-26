const Redis = require("ioredis");
const logger = require("../utils/logger");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Main connection for BullMQ (requires maxRetriesPerRequest: null)
const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

redisConnection.on("error", (err) => {
  logger.error("[Redis] BullMQ Connection error:", err.message);
});

// Connections for Socket.IO Redis adapter
const pubClient = new Redis(redisUrl);
const subClient = pubClient.duplicate();

module.exports = {
  redisConnection,
  pubClient,
  subClient,
};
