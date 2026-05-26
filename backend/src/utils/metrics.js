/**
 * metrics.js — Prometheus Metrics Registry
 *
 * Centralised prom-client setup. Import and use the exported helpers
 * to record metrics from anywhere in the codebase.
 *
 * Exposed at GET /metrics in standard Prometheus text format.
 */

'use strict';

const promClient = require('prom-client');

// ── Default process/Node.js metrics (memory, CPU, event loop lag, etc.) ──────
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register, prefix: 'nodejs_' });

// ─── HTTP Request Metrics ─────────────────────────────────────────────────────

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDurationSeconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

// ─── BullMQ Queue Metrics ─────────────────────────────────────────────────────

const bullmqQueueWaiting = new promClient.Gauge({
  name: 'bullmq_queue_waiting',
  help: 'Number of jobs waiting in a BullMQ queue',
  labelNames: ['queue'],
  registers: [register],
});

const bullmqQueueActive = new promClient.Gauge({
  name: 'bullmq_queue_active',
  help: 'Number of jobs actively processing in a BullMQ queue',
  labelNames: ['queue'],
  registers: [register],
});

const bullmqJobsTotal = new promClient.Counter({
  name: 'bullmq_jobs_total',
  help: 'Total number of BullMQ jobs processed',
  labelNames: ['queue', 'status'],  // status: completed | failed
  registers: [register],
});

const bullmqJobDurationSeconds = new promClient.Histogram({
  name: 'bullmq_job_duration_seconds',
  help: 'Duration of BullMQ job processing in seconds',
  labelNames: ['queue'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

// ─── Database Pool Metrics ────────────────────────────────────────────────────

const dbPoolTotal = new promClient.Gauge({
  name: 'pg_pool_total_connections',
  help: 'Total connections in the PostgreSQL pool',
  registers: [register],
});

const dbPoolIdle = new promClient.Gauge({
  name: 'pg_pool_idle_connections',
  help: 'Idle connections in the PostgreSQL pool',
  registers: [register],
});

const dbPoolWaiting = new promClient.Gauge({
  name: 'pg_pool_waiting_clients',
  help: 'Clients waiting for a connection from the pool',
  registers: [register],
});

// ─── GitHub API Metrics ───────────────────────────────────────────────────────

const githubApiCallsTotal = new promClient.Counter({
  name: 'github_api_calls_total',
  help: 'Total GitHub API calls made by the backend',
  labelNames: ['endpoint', 'status'],
  registers: [register],
});

const githubApiDurationSeconds = new promClient.Histogram({
  name: 'github_api_duration_seconds',
  help: 'Duration of GitHub API calls in seconds',
  labelNames: ['endpoint'],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

// ─── Middleware: HTTP metrics ──────────────────────────────────────────────────

/**
 * Express middleware that records request count and duration for every response.
 * Normalises dynamic route segments (e.g. /repos/:id/scan → /repos/:id/scan)
 * using the matched Express route pattern.
 */
function httpMetricsMiddleware(req, res, next) {
  const startNs = process.hrtime.bigint();

  res.on('finish', () => {
    const durationSec = Number(process.hrtime.bigint() - startNs) / 1e9;
    // Use matched route pattern if available, else fall back to raw path
    const route      = req.route?.path || req.path || 'unknown';
    const routeKey   = `${req.method} ${route}`;
    const statusCode = String(res.statusCode);

    httpRequestsTotal.inc({ method: req.method, route: routeKey, status_code: statusCode });
    httpRequestDurationSeconds.observe({ method: req.method, route: routeKey, status_code: statusCode }, durationSec);
  });

  next();
}

// ─── Prometheus text-format handler ──────────────────────────────────────────

async function metricsHandler(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
}

module.exports = {
  register,
  httpMetricsMiddleware,
  metricsHandler,
  // Exported so other modules can record metrics
  httpRequestsTotal,
  httpRequestDurationSeconds,
  bullmqQueueWaiting,
  bullmqQueueActive,
  bullmqJobsTotal,
  bullmqJobDurationSeconds,
  dbPoolTotal,
  dbPoolIdle,
  dbPoolWaiting,
  githubApiCallsTotal,
  githubApiDurationSeconds,
};
