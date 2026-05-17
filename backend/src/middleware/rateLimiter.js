const rateLimit = require("express-rate-limit");

/**
 * Rate limiter factory — creates a configured limiter with a shared message format.
 */
function createLimiter({ windowMs, max, name }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,  // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,
    handler(req, res) {
      res.status(429).json({
        message: `Too many requests to ${name}. Please wait and try again.`,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
}

// ─── Named Limiters ───────────────────────────────────────────────────────────

/** Auth endpoints — 5 requests per 10 minutes per IP */
const authLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  name: "GitHub auth",
});

/** AI chat — 20 requests per minute per IP */
const aiChatLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  name: "AI Copilot",
});

/** Pipeline simulate — 10 requests per minute per IP */
const simulateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  name: "pipeline simulation",
});

/** Generic API — 100 requests per minute per IP (broad protection) */
const generalApiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  name: "API",
});

module.exports = {
  authLimiter,
  aiChatLimiter,
  simulateLimiter,
  generalApiLimiter,
};
