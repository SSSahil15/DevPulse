/**
 * Frontend structured logger
 * ==========================
 * Thin wrapper over console.* that:
 *   - Applies sensitive-key masking before any output
 *   - Sends warn/error/fatal to Sentry automatically
 *   - Adds Sentry breadcrumbs on every log call (for replay context)
 *   - Supports setContext() for attaching userId/page to every log
 *   - Registers a global `unhandledrejection` handler once on import
 *   - Suppresses DEBUG in production to keep prod console clean
 *
 * Usage:
 *   import log from './utils/logger';
 *   log.info('User clicked scan', { repo: 'owner/repo' });
 *   log.warn('API slow', { duration_ms: 3200 });
 *   log.error('Request failed', { error, status: 500 });
 *   log.setContext({ userId: '123', page: '/dashboard' });
 */
import * as Sentry from '@sentry/react';

// ─── Sensitive key masking ────────────────────────────────────────────────────
const SENSITIVE_KEYS = new Set([
  'token',
  'access_token',
  'accesstoken',
  'secret',
  'password',
  'passwd',
  'code',
  'authorization',
  'key',
  'api_key',
  'apikey',
  'jwt',
  'refresh_token',
  'cookie',
  'session',
  'client_secret',
  'groq_api_key',
]);

function maskSensitive(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(maskSensitive);
  if (value instanceof Error) return value; // preserve Error objects intact
  if (typeof value !== 'object') return value;
  const masked = {};
  for (const [k, v] of Object.entries(value)) {
    masked[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : maskSensitive(v);
  }
  return masked;
}

// ─── Persistent context (userId, page) ───────────────────────────────────────
let _ctx = { service: 'devpulse-frontend' };

function setContext(ctx = {}) {
  _ctx = { ..._ctx, ...maskSensitive(ctx) };
  if (ctx.userId) Sentry.setUser({ id: ctx.userId });
}

// ─── Sentry breadcrumb helper ─────────────────────────────────────────────────
function addBreadcrumb(level, message, data) {
  Sentry.addBreadcrumb({
    category: 'log',
    message,
    level, // 'debug' | 'info' | 'warning' | 'error' | 'fatal'
    data: maskSensitive(data),
    timestamp: Date.now() / 1000,
  });
}

// ─── Logger object ────────────────────────────────────────────────────────────
const log = {
  debug(message, context = {}) {
    // Suppressed in production — no dev noise in prod console
    if (import.meta.env.PROD) return;
    console.debug(`[DEBUG] ${message}`, maskSensitive(context));
    addBreadcrumb('debug', message, context);
  },

  info(message, context = {}) {
    if (import.meta.env.DEV) {
      console.info(`[INFO] ${message}`, maskSensitive(context));
    }
    addBreadcrumb('info', message, context);
  },

  warn(message, context = {}) {
    console.warn(`[WARN] ${message}`, maskSensitive(context));
    addBreadcrumb('warning', message, context);
    Sentry.captureMessage(`[WARN] ${message}`, {
      level: 'warning',
      extra: { ..._ctx, ...maskSensitive(context) },
    });
  },

  error(message, context = {}) {
    const isError = context instanceof Error;
    const meta = isError ? { error: context } : context;
    console.error(`[ERROR] ${message}`, maskSensitive(meta));
    addBreadcrumb('error', message, meta);

    if (isError || meta.error instanceof Error) {
      Sentry.captureException(isError ? context : meta.error, {
        extra: { logMessage: message, ..._ctx, ...maskSensitive(meta) },
      });
    } else {
      Sentry.captureMessage(`[ERROR] ${message}`, {
        level: 'error',
        extra: { ..._ctx, ...maskSensitive(meta) },
      });
    }
  },

  fatal(message, context = {}) {
    console.error(`[FATAL] ${message}`, maskSensitive(context));
    addBreadcrumb('fatal', message, context);
    Sentry.captureMessage(`[FATAL] ${message}`, {
      level: 'fatal',
      extra: { ..._ctx, ...maskSensitive(context) },
    });
  },

  setContext,
};

// ─── Global unhandled rejection handler ──────────────────────────────────────
// Catches Promise rejections that were not caught with .catch() or try/catch.
// Registered once on module import.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error ? reason.message : String(reason ?? 'Unknown rejection');

    console.error('[UNHANDLED REJECTION]', reason);

    Sentry.captureException(reason instanceof Error ? reason : new Error(message), {
      extra: { type: 'unhandledRejection', raw: String(reason) },
    });
  });
}

export default log;
export { maskSensitive, setContext };
