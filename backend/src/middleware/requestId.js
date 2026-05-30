const crypto = require('crypto');

/**
 * requestId middleware
 * ====================
 * Generates a short, unique request ID for every incoming HTTP request and:
 *   1. Attaches it to `req.requestId` so route handlers and middleware can include
 *      it in their log calls.
 *   2. Sets the `X-Request-ID` response header so the frontend can correlate its
 *      API calls with backend log entries.
 *
 * Format:  "req-<8 lowercase hex chars>"   e.g. "req-a3f82c1d"
 * Entropy: 2^32 combinations — sufficient for request-level uniqueness at
 *          DevPulse's traffic volumes; not a security-grade UUID.
 *
 * Mount FIRST in app.js — before morgan, before requestTiming, before any route.
 */
function requestId(req, res, next) {
  // Accept a forwarded ID from a trusted upstream proxy (e.g. Vercel → Render),
  // or generate a fresh one if none is present.
  const incomingId = req.headers['x-request-id'];
  const id =
    incomingId && /^[\w-]{4,64}$/.test(incomingId)
      ? incomingId
      : `req-${crypto.randomBytes(4).toString('hex')}`;

  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

module.exports = requestId;
