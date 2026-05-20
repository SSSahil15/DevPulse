const winston = require("winston");

const { combine, timestamp, json, errors } = winston.format;

// ─── Sensitive Key Masking ────────────────────────────────────────────────────
// Keys matching this set (case-insensitive) are replaced with "[REDACTED]"
// in ALL log metadata. Add keys here if new sensitive fields are introduced.
const SENSITIVE_KEYS = new Set([
  "token", "access_token", "accesstoken",
  "secret", "client_secret", "clientsecret",
  "password", "passwd", "pwd",
  "code",                          // OAuth authorization codes
  "authorization",                 // HTTP Authorization header value
  "key", "api_key", "apikey",
  "jwt", "refresh_token",
  "encrypted_token", "encryptedtoken",
  "cookie", "session",
]);

/**
 * Recursively redacts sensitive keys from an object.
 * Works on nested objects and arrays. Does NOT mutate the original.
 *
 * @param {unknown} value - Any value (object, array, primitive)
 * @returns {unknown} - Deep copy with sensitive strings replaced by "[REDACTED]"
 */
function maskSensitive(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(maskSensitive);
  if (typeof value !== "object") return value;

  const masked = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      // Show type hint so logs still indicate something was there
      masked[k] = typeof v === "string" ? "[REDACTED]" : `[REDACTED:${typeof v}]`;
    } else {
      masked[k] = maskSensitive(v);
    }
  }
  return masked;
}

// ─── Custom format: apply masking to every log entry's metadata ───────────────
const maskingFormat = winston.format((info) => {
  const { level, message, timestamp: ts, service, ...meta } = info;
  const maskedMeta = maskSensitive(meta);
  return { level, message, timestamp: ts, service, ...maskedMeta };
})();

// ─── Logger instance ──────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(
    errors({ stack: true }),  // Automatically includes stack traces on Error objects
    timestamp(),
    maskingFormat,            // Redact sensitive fields before serialising
    json()
  ),
  defaultMeta: { service: "devpulse-backend" },
  transports: [
    new winston.transports.Console(),
  ],
});

// ─── Context helper ───────────────────────────────────────────────────────────
/**
 * Returns a child logger pre-seeded with request/user context so every
 * log call from within a request handler automatically includes:
 *   - requestId  (from req.requestId, set by requestId middleware)
 *   - userId     (from req.user?.id, set by ensureAuthenticated)
 *   - method     (HTTP method)
 *   - path       (URL path, without query string)
 *
 * Usage:
 *   const log = logger.withContext(req);
 *   log.info("Doing something", { extra: "data" });
 *
 * @param {import("express").Request} req - Express request object
 * @returns {winston.Logger} - Child logger with context pre-attached
 */
logger.withContext = function withContext(req) {
  return logger.child({
    requestId: req.requestId || "no-id",
    userId:    req.user?.id  || "anonymous",
    method:    req.method,
    path:      req.path,
  });
};

module.exports = logger;
module.exports.maskSensitive = maskSensitive;
