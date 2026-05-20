/**
 * Frontend structured logger
 * ==========================
 * Thin wrapper over console.* that:
 *   - Applies sensitive-key masking before any output
 *   - Sends warn/error to Sentry as breadcrumbs (info in dev as well)
 *   - Registers a global `unhandledrejection` handler once on import
 *
 * Usage:
 *   import log from './utils/logger';
 *   log.info('User clicked scan', { repo: 'owner/repo' });
 *   log.warn('API slow', { duration_ms: 3200 });
 *   log.error('Request failed', { status: 500, path: '/api/pipeline' });
 */
import * as Sentry from "@sentry/react";

// ─── Sensitive key masking ────────────────────────────────────────────────────
const SENSITIVE_KEYS = new Set([
  "token", "access_token", "accesstoken",
  "secret", "password", "passwd",
  "code", "authorization",
  "key", "api_key", "apikey",
  "jwt", "refresh_token", "cookie",
]);

function maskSensitive(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(maskSensitive);
  if (typeof value !== "object") return value;
  const masked = {};
  for (const [k, v] of Object.entries(value)) {
    masked[k] = SENSITIVE_KEYS.has(k.toLowerCase())
      ? "[REDACTED]"
      : maskSensitive(v);
  }
  return masked;
}

// ─── Sentry breadcrumb helper ─────────────────────────────────────────────────
function addBreadcrumb(level, message, data) {
  Sentry.addBreadcrumb({
    category: "app",
    message,
    level,   // 'info' | 'warning' | 'error'
    data: maskSensitive(data),
  });
}

// ─── Logger object ────────────────────────────────────────────────────────────
const log = {
  debug(message, context = {}) {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, maskSensitive(context));
    }
  },

  info(message, context = {}) {
    if (import.meta.env.DEV) {
      console.info(`[INFO] ${message}`, maskSensitive(context));
    }
    addBreadcrumb("info", message, context);
  },

  warn(message, context = {}) {
    console.warn(`[WARN] ${message}`, maskSensitive(context));
    addBreadcrumb("warning", message, context);
  },

  error(message, errorOrContext = {}) {
    const isError = errorOrContext instanceof Error;
    const context = isError ? { message: errorOrContext.message } : errorOrContext;
    console.error(`[ERROR] ${message}`, maskSensitive(context));
    addBreadcrumb("error", message, context);

    // Capture actual Error objects to Sentry
    if (isError) {
      Sentry.captureException(errorOrContext, {
        extra: { logMessage: message },
      });
    }
  },
};

// ─── Global unhandled rejection handler ──────────────────────────────────────
// Catches Promise rejections that were not caught with .catch() or try/catch.
// Registered once on module import.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason instanceof Error
      ? reason.message
      : String(reason ?? "Unknown rejection");

    console.error("[UNHANDLED REJECTION]", reason);

    Sentry.captureException(reason instanceof Error ? reason : new Error(message), {
      extra: { type: "unhandledRejection", raw: String(reason) },
    });
  });
}

export default log;
export { maskSensitive };
