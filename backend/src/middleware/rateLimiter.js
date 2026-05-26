const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis").default;
const Sentry = require("@sentry/node");
const config = require("../config/env");
const redisService = require("../services/redis.service");
const logger = require("../utils/logger");

/**
 * Custom skip mechanism:
 * 1. Bypass if testing (unless explicitly testing rate limits)
 * 2. Bypass if internal service secret is provided
 * 3. Bypass in development mode (effectively disabled) unless testing limits
 */
const skipHandler = (req) => {
  if (config.nodeEnv === "test" && !process.env.TEST_RATE_LIMIT) return true;
  if (config.nodeEnv === "development" && !process.env.TEST_RATE_LIMIT) return true;
  if (config.internalServiceSecret && req.headers["x-internal-secret"] === config.internalServiceSecret) {
    return true;
  }
  return false;
};

/**
 * Normalizes an IP address for use as a rate-limit key.
 * express-rate-limit v8 throws ERR_ERL_KEY_GEN_IPV6 if a raw IPv6
 * address is used without explicit handling.
 */
const normalizeIp = (ip = '') => {
  // Strip IPv6-mapped IPv4 prefix (::ffff:x.x.x.x → x.x.x.x)
  return ip.replace(/^::ffff:/, '');
};

/**
 * Generates keys based on JWT user ID if available, otherwise falls back to IP.
 */
const userKeyGenerator = (req) => {
  return req.user ? `user_${req.user.id}` : normalizeIp(req.ip);
};

/**
 * Generates keys strictly based on IP address (for public endpoints).
 */
const ipKeyGenerator = (req) => normalizeIp(req.ip);

/**
 * Factory to create standardized limiters
 */
function createLimiter({ windowMs, max, name, useUserId = false }) {
  /**
   * Lazily resolve the Redis store on each rateLimit instantiation attempt.
   * Using a getter avoids calling redisService.isConnected() at module-load
   * time, which would crash in test environments where the module isn't yet
   * mocked. In production this also means a Redis reconnect is picked up
   * without restarting the process.
   */
  const getStore = () => {
    const connected =
      typeof redisService.isConnected === 'function'
        ? redisService.isConnected()
        : Boolean(redisService.isConnected);

    return (connected && redisService.client)
      ? new RedisStore({
          sendCommand: (...args) => redisService.client.sendCommand(args),
          prefix: `rl_${name.replace(/\s+/g, '_')}:`,
        })
      : undefined; // Falls back to built-in MemoryStore
  };

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders:   false,
    validate:        { keyGeneratorIpFallback: false },
    store:           getStore(),
    skip:            skipHandler,
    keyGenerator:    useUserId ? userKeyGenerator : ipKeyGenerator,
    handler(req, res) {
      logger.warn(`[RateLimit] Limit hit for ${name} by ${useUserId && req.user ? 'User ' + req.user.id : 'IP ' + req.ip}`);

      // If it's the auth endpoint, log heavily and report to Sentry (potential abuse)
      if (name === "GitHub auth") {
        Sentry.captureMessage(`[RateLimit] Potential abuse on auth endpoint by IP ${req.ip}`, "warning");
      }

      res.status(429).json({
        message:           `Rate limit exceeded for ${name}. Please try again later.`,
        resetTime:         new Date(Date.now() + windowMs).toISOString(),
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      });
    },
  });
}

// ─── Named Limiters ───────────────────────────────────────────────────────────

/** Generic API — 100 requests per minute per IP (broad protection) */
const generalApiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  name: "API",
  useUserId: false,
});

/** GitHub OAuth Callback — 10 requests per minute per IP (prevent brute force) */
const authLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  name: "GitHub auth",
  useUserId: false,
});

/** Public Reports — 100 requests per minute per IP */
const publicReportLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  name: "Public Reports",
  useUserId: false,
});

/** Analyze Repo — 100 requests per 24 hours per user (Increased for testing) */
const analyzeLimiter = createLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100,
  name: "Repository Analysis",
  useUserId: true,
});

/** AI Copilot — 30 requests per minute per user */
const aiChatLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  name: "AI Copilot",
  useUserId: true,
});

/** Repositories List — 100 requests per minute per user */
const repoLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  name: "Repository Listing",
  useUserId: true,
});

/** Pipeline simulate — 5 requests per hour per user */
const simulateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  name: "Pipeline Simulation",
  useUserId: true,
});

module.exports = {
  generalApiLimiter,
  authLimiter,
  publicReportLimiter,
  analyzeLimiter,
  aiChatLimiter,
  repoLimiter,
  simulateLimiter,
};
