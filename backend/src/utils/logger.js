const path   = require("path");
const winston = require("winston");
require("winston-daily-rotate-file");

const { combine, timestamp, json, errors, colorize, simple } = winston.format;

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
  "groq_api_key", "groqapikey",
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
  if (Array.isArray(value))                 return value.map(maskSensitive);
  if (typeof value !== "object")            return value;

  const masked = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      masked[k] = typeof v === "string" ? "[REDACTED]" : `[REDACTED:${typeof v}]`;
    } else {
      masked[k] = maskSensitive(v);
    }
  }
  return masked;
}

// ─── OpenTelemetry trace context injection ────────────────────────────────────
// If the OTel SDK is active, we pull the current trace_id and span_id and
// inject them into every log entry so Loki can correlate logs → Tempo traces.
let otelApi;
try {
  otelApi = require("@opentelemetry/api");
} catch (_) {
  otelApi = null; // OTel not installed — no-op
}

function getTraceContext() {
  if (!otelApi) return {};
  const span = otelApi.trace.getActiveSpan();
  if (!span) return {};
  const ctx = span.spanContext();
  if (!otelApi.isSpanContextValid(ctx)) return {};
  return { trace_id: ctx.traceId, span_id: ctx.spanId };
}

// ─── Custom format: apply masking + OTel trace injection to every log entry ──
const maskingFormat = winston.format((info) => {
  const { level, message, timestamp: ts, service, stack, ...meta } = info;
  const maskedMeta = maskSensitive(meta);
  return { level, message, timestamp: ts, service, stack, ...maskedMeta, ...getTraceContext() };
})();

// ─── Log directory (project root /logs) ──────────────────────────────────────
// In Docker the working directory is /app, so logs go to /app/logs.
// Locally they go to <repo>/backend/logs (gitignored).
const LOG_DIR = path.join(process.cwd(), "logs");

// ─── Shared JSON format (file transports) ────────────────────────────────────
const jsonFormat = combine(
  errors({ stack: true }),   // Automatically includes stack traces on Error objects
  timestamp(),
  maskingFormat,             // Redact sensitive fields before serialising
  json()
);

// ─── Transports ───────────────────────────────────────────────────────────────

const transports = [];

// 1. Console transport
//    - Dev: human-readable coloured output
//    - Prod: JSON (same as file) so log collectors can parse stdout
if (process.env.NODE_ENV === "production") {
  transports.push(
    new winston.transports.Console({ format: jsonFormat })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: combine(
        errors({ stack: true }),
        timestamp({ format: "HH:mm:ss" }),
        colorize({ all: true }),
        simple()
      ),
    })
  );
}

// 2. Daily rotating combined log (non-production only to keep container images lean)
//    Keeps 14 days, max 20 MB per file, gzip on rotation.
if (process.env.NODE_ENV !== "production") {
  transports.push(
    new winston.transports.DailyRotateFile({
      dirname:         LOG_DIR,
      filename:        "devpulse-%DATE%.log",
      datePattern:     "YYYY-MM-DD",
      zippedArchive:   true,
      maxSize:         "20m",
      maxFiles:        "14d",
      format:          jsonFormat,
      auditFile:       path.join(LOG_DIR, ".audit-combined.json"),
    })
  );

  // 3. Errors-only log (kept 30 days — useful for post-mortem debugging)
  transports.push(
    new winston.transports.DailyRotateFile({
      dirname:         LOG_DIR,
      filename:        "devpulse-error-%DATE%.log",
      datePattern:     "YYYY-MM-DD",
      level:           "error",
      zippedArchive:   true,
      maxSize:         "20m",
      maxFiles:        "30d",
      format:          jsonFormat,
      auditFile:       path.join(LOG_DIR, ".audit-error.json"),
    })
  );
}

// ─── Logger instance ──────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level:       process.env.NODE_ENV === "production" ? "info" : "debug",
  format:      jsonFormat,
  defaultMeta: { service: "devpulse-backend" },
  transports,
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

// ─── Startup notice ───────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  logger.debug("[Logger] File rotation active", {
    dir:      LOG_DIR,
    combined: "devpulse-YYYY-MM-DD.log (14d, 20MB)",
    errors:   "devpulse-error-YYYY-MM-DD.log (30d, 20MB)",
  });
}

module.exports = logger;
module.exports.maskSensitive = maskSensitive;
