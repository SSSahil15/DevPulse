/**
 * requestTiming.js — Express Performance Middleware
 *
 * Tracks per-request timing and maintains an in-memory rolling histogram
 * for p50 / p95 / p99 latency percentiles per route.
 *
 * Features:
 *   • Nanosecond-precision timing via process.hrtime.bigint()
 *   • Rolling 1000-sample histogram per route (bounded memory)
 *   • Slow request logging via winston at the configured threshold
 *   • /metrics endpoint data (consumed by app.js)
 *   • 4xx / 5xx error counters
 */

const logger = require("../utils/logger");
const config = require("../config/env");

// ─── In-memory store ──────────────────────────────────────────────────────────

const MAX_SAMPLES    = 1000; // max samples kept per route
const store = {
  totalRequests: 0,
  slowRequests:  0,
  errors: { "4xx": 0, "5xx": 0 },
  routes: {},   // routeKey → Float64Array of duration_ms samples (ring buffer)
  startTime: Date.now(),
};

// ─── Histogram helpers ────────────────────────────────────────────────────────

function getOrCreate(routeKey) {
  if (!store.routes[routeKey]) {
    store.routes[routeKey] = {
      samples: [],
      count:   0,
    };
  }
  return store.routes[routeKey];
}

function recordSample(routeKey, durationMs) {
  const entry = getOrCreate(routeKey);
  entry.count += 1;

  // Keep rolling window of MAX_SAMPLES
  if (entry.samples.length >= MAX_SAMPLES) {
    entry.samples.shift();
  }
  entry.samples.push(durationMs);
}

function percentile(sortedArr, p) {
  if (!sortedArr.length) return 0;
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return Math.round(sortedArr[Math.max(0, idx)]);
}

function getStats(routeKey) {
  const entry = store.routes[routeKey];
  if (!entry || !entry.samples.length) return null;

  const sorted = [...entry.samples].sort((a, b) => a - b);
  return {
    count: entry.count,
    p50:   percentile(sorted, 50),
    p95:   percentile(sorted, 95),
    p99:   percentile(sorted, 99),
    min:   Math.round(sorted[0]),
    max:   Math.round(sorted[sorted.length - 1]),
  };
}

// ─── Middleware ───────────────────────────────────────────────────────────────

const SLOW_THRESHOLD_MS = config.slowRequestThresholdMs || 1000;

function requestTiming(req, res, next) {
  const startNs = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
    const status     = res.statusCode;

    // Normalise route key — use matched route pattern, fall back to path
    // Express sets req.route after route is matched; strip dynamic segments
    const routePattern = req.route?.path || req.path || "unknown";
    const routeKey     = `${req.method} ${routePattern}`;

    store.totalRequests += 1;
    recordSample(routeKey, durationMs);

    // Count error responses
    if (status >= 500)      store.errors["5xx"] += 1;
    else if (status >= 400) store.errors["4xx"] += 1;

    // Log slow requests
    if (durationMs > SLOW_THRESHOLD_MS) {
      store.slowRequests += 1;
      logger.warn("[Perf] Slow request", {
        method:      req.method,
        route:       routeKey,
        status,
        duration_ms: Math.round(durationMs),
        threshold_ms: SLOW_THRESHOLD_MS,
        url:         req.originalUrl,
      });
    }

    // Attach timing header for debugging (dev only)
    // Guard against headers-already-sent — can happen in tests or when
    // a response is piped/streamed and finish fires after headers close.
    if (process.env.NODE_ENV !== "production" && !res.headersSent) {
      try { res.setHeader("X-Response-Time", `${durationMs.toFixed(2)}ms`); } catch (_) {}
    }
  });

  next();
}

// ─── /metrics snapshot ────────────────────────────────────────────────────────

function getMetrics() {
  const byRoute = {};
  for (const key of Object.keys(store.routes)) {
    const s = getStats(key);
    if (s) byRoute[key] = s;
  }

  return {
    uptime_seconds: Math.round((Date.now() - store.startTime) / 1000),
    requests: {
      total:    store.totalRequests,
      by_route: byRoute,
    },
    slow_requests: store.slowRequests,
    errors:        store.errors,
    thresholds: {
      slow_request_ms: SLOW_THRESHOLD_MS,
    },
    generated_at: new Date().toISOString(),
  };
}

module.exports = { requestTiming, getMetrics };
