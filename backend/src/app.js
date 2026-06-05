const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

const config = require('./config/env');

// Sensitive header/body keys that must never appear in Sentry events
const SENTRY_REDACT_HEADERS = new Set([
  'authorization',
  'cookie',
  'x-internal-secret',
  'x-api-key',
]);
const SENTRY_REDACT_BODY_KEYS = [
  'password',
  'token',
  'secret',
  'access_token',
  'code',
  'encrypted_token',
  'refresh_token',
  'client_secret',
];

Sentry.init({
  dsn: process.env.SENTRY_DSN || '', // Empty string = Sentry disabled (no dummy DSN)
  release: process.env.SENTRY_RELEASE || 'devpulse-backend@dev',
  environment: config.isProduction ? 'production' : 'development',

  integrations: [
    // Auto-instruments http/https — captures outbound GitHub API + AI service calls
    // as child spans so they appear in the performance waterfall.
    Sentry.httpIntegration({ tracing: true }),
    nodeProfilingIntegration(),
  ],

  // Trace every request in dev, 10% in prod to control quota.
  tracesSampleRate: config.isProduction ? 0.1 : 1.0,
  // CPU profiling: 10% of sampled transactions in prod, off in dev.
  profilesSampleRate: config.isProduction ? 0.1 : 0.0,

  // Propagate trace headers to downstream services (AI service)
  // so AI spans appear as children of backend transactions.
  tracePropagationTargets: ['localhost', /^\/api/, config.aiServiceUrl].filter(Boolean),

  /**
   * beforeSend — strip PII and credentials before the event leaves the process.
   * Runs synchronously; return null to drop the event entirely.
   */
  beforeSend(event) {
    // ── Strip sensitive request headers ──────────────────────────────────────
    const headers = event.request?.headers;
    if (headers && typeof headers === 'object') {
      for (const key of Object.keys(headers)) {
        if (SENTRY_REDACT_HEADERS.has(key.toLowerCase())) {
          headers[key] = '[REDACTED]';
        }
      }
    }

    // ── Strip sensitive body fields ───────────────────────────────────────────
    const body = event.request?.data;
    if (body && typeof body === 'object') {
      for (const key of SENTRY_REDACT_BODY_KEYS) {
        if (key in body) body[key] = '[REDACTED]';
      }
    }

    return event;
  },
});

const analyzeRoutes = require('./routes/analyze.routes');
const authRoutes = require('./routes/auth.routes');
const repoRoutes = require('./routes/repo.routes');
const webhookRoutes = require('./routes/webhook.routes');
const pipelineRoutes = require('./routes/pipeline.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const aiChatRoutes = require('./routes/aiChat.routes');
const dbStatsRoutes = require('./routes/db-stats.routes');
const remediationRoutes = require('./routes/remediation.routes');
const schedulesRoutes = require('./routes/schedules.routes');
const adminRoutes = require('./routes/admin.routes');
const { generalApiLimiter, authLimiter } = require('./middleware/rateLimiter');

const { httpMetricsMiddleware, metricsHandler, getMetrics } = require('./utils/metrics');
const requestId = require('./middleware/requestId');
const { isHttpError } = require('./utils/httpError');

const app = express();

const logger = require('./utils/logger');

// ─── Request ID ──────────────────────────────────────────────────────────────
// Mount FIRST — before CORS, helmet, morgan, and all routes.
// Stamps req.requestId on every request and sets X-Request-ID response header.
app.use(requestId);

// ─── Swagger Documentation ────────────────────────────────────────────────────
if (!config.isProduction) {
  const swaggerUi = require('swagger-ui-express');
  const YAML = require('yamljs');
  const path = require('path');

  try {
    const swaggerDocument = YAML.load(path.join(__dirname, '../docs/openapi.yaml'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    logger.info('[Swagger] API documentation available at /api-docs');
  } catch (error) {
    logger.warn(`[Swagger] Could not load openapi.yaml: ${error.message}`);
  }
}

// ─── Trust Proxy (required for express-rate-limit behind Render/Vercel) ───────
app.set('trust proxy', 1);

// ─── Security & Middleware ────────────────────────────────────────────────────

/**
 * Builds the CORS origin allowlist at startup.
 * Includes hardcoded dev origins + FRONTEND_URL + any ALLOWED_ORIGINS from env.
 * In production any *.vercel.app subdomain is also allowed (Vercel preview deploys).
 */
const CORS_ALLOWED_ORIGINS = new Set([
  config.frontendUrl,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
  ...config.allowedOrigins, // from ALLOWED_ORIGINS env var (custom domain, staging)
]);

app.use(
  cors({
    /**
     * Dynamic origin check:
     * - No origin (curl, mobile app, server-to-server) → allowed
     * - Exact match in allowlist → allowed
     * - Any *.vercel.app subdomain → allowed (Vercel preview deployments)
     * - Everything else → 403
     */
    origin(origin, callback) {
      if (
        !origin ||
        CORS_ALLOWED_ORIGINS.has(origin) ||
        /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }
      logger.warn('[CORS] Rejected origin', { origin });
      return callback(new Error('Origin is not allowed by CORS.'));
    },

    // Required for cross-origin requests that include Authorization header or cookies
    credentials: true,

    // Explicit method list — OPTIONS handled automatically for preflight
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

    // Headers the browser is allowed to send
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Internal-Secret', 'X-Admin-Secret', 'X-Admin-Actor'],

    // Headers the browser JS is allowed to READ from responses
    // Without this, frontend cannot read X-Request-ID or RateLimit-* headers
    exposedHeaders: [
      'X-Request-ID',
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
      'Retry-After',
    ],

    // Cache preflight response for 24 hours — eliminates OPTIONS round-trips
    maxAge: 86400,
  }),
);

app.use(
  helmet({
    // API server must allow cross-origin fetches — "same-origin" blocks all browser
    // requests from a different port (e.g. localhost:5174 → localhost:4000) before
    // CORS even runs. Use "cross-origin" to let the CORS middleware handle access control.
    crossOriginResourcePolicy: { policy: 'cross-origin' },

    /**
     * Content Security Policy
     * ─────────────────────────────────────────────────────────────────────────
     * This backend serves the Swagger UI in dev only. In production all HTML
     * is served by Vercel (frontend). The CSP here is therefore conservative
     * and mainly protects the Swagger page and any error pages rendered.
     *
     * Removed 'unsafe-inline' from scriptSrc — use a nonce for Swagger UI if
     * inline scripts are needed in future.
     */
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"], // No unsafe-inline
        styleSrc: ["'self'", "'unsafe-inline'"], // Swagger UI needs inline styles
        imgSrc: ["'self'", 'data:', 'https://avatars.githubusercontent.com'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: [
          "'self'",
          config.frontendUrl,
          config.aiServiceUrl,
          // Sentry ingest — backend SDK sends events here
          'https://*.ingest.sentry.io',
          'https://*.ingest.de.sentry.io',
        ],
        frameSrc: ["'none'"], // No iframes
        objectSrc: ["'none'"], // No Flash / plugins
        baseUri: ["'self'"],
        formAction: ["'self'"],
        // null disables upgrade-insecure-requests in dev; [] enables it in production
        upgradeInsecureRequests: config.isProduction ? [] : null,
      },
    },

    // HSTS — production only. Applying HSTS to localhost poisons the browser cache
    // and breaks all subsequent plain-HTTP local API calls (browser upgrades them to HTTPS).
    // HSTS is only meaningful on real HTTPS domains in production.
    hsts: config.isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    // Prevent browsers from MIME-sniffing responses
    noSniff: true,

    // Block page from being embedded in iframes (clickjacking protection)
    frameguard: { action: 'deny' },

    // Referrer policy — send origin only, not full URL path
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    // Hide Express fingerprint
    hidePoweredBy: true,

    // Disable IE-only X-XSS-Protection (modern browsers ignore it; can cause issues)
    xssFilter: false,
  }),
);

// Explicit Referrer-Policy header (belt + suspenders — Helmet sets it too)
app.use((_req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
// ─── HTTP Access Logging (replaces morgan) ────────────────────────────────────
// Unified JSON HTTP access log via winston — same format/transport as all
// other logs so log aggregation tools (ELK, CloudWatch, Datadog) parse it
// with a single JSON parser rather than two different formats.
app.use((req, res, next) => {
  const startNs = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Math.round(Number(process.hrtime.bigint() - startNs) / 1_000_000);
    const status = res.statusCode;
    // Map HTTP status to log level: 5xx=error, 4xx=warn, else info
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    logger[level]('http', {
      type: 'http_access',
      method: req.method,
      url: req.originalUrl,
      status,
      duration_ms: durationMs,
      requestId: req.requestId,
      userId: req.user?.id || 'anonymous',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'] || req.headers['referrer'] || '',
    });
  });
  next();
});
// 50 KB body cap — prevents large-payload DoS before validation runs.
// Webhooks send compact JSON payloads; nothing legitimate needs more than this.
// Support up to 10MB payloads to handle Trivy JSON scan results (50MB is too generous and risks memory exhaustion)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Request Timing (p50/p95/p99 histogram) ─────────────────────────────────────
// Mount early so ALL routes are timed including health checks

// ─── Prometheus Metrics Middleware ───────────────────────────────────────────
// Records http_requests_total and http_request_duration_seconds for every request
app.use(httpMetricsMiddleware);

// ─── Global Rate Limit (catch-all) ────────────────────────────────────────────
app.use('/api', generalApiLimiter);

// ─── Tool Availability (checked at startup) ───────────────────────────────────
const toolStatus = { trivy: false, git: false };

async function checkToolAvailability() {
  const checks = [
    execPromise('trivy --version')
      .then(() => {
        toolStatus.trivy = true;
      })
      .catch(() => {
        logger.warn("[Startup] ⚠️  'trivy' not found — security scans will return empty results.");
      }),
    execPromise('git --version')
      .then(() => {
        toolStatus.git = true;
      })
      .catch(() => {
        logger.warn("[Startup] ⚠️  'git' not found — repository cloning will fail.");
      }),
  ];
  await Promise.all(checks);
}

// We set startupComplete after tools AND db pool are verified healthy
let startupComplete = false;

async function initStartup() {
  await checkToolAvailability();
  // Skip real DB query in test environment (pool is mocked)
  if (process.env.NODE_ENV === 'test') {
    startupComplete = true;
    return;
  }
  try {
    const { pool } = require('./db/database');
    await pool.query('SELECT 1'); // Verify DB connection
    startupComplete = true;
    logger.info('[Startup] ✅ All systems ready.');
  } catch (err) {
    logger.warn('[Startup] ⚠️  DB not reachable at startup — will retry on requests.', {
      error: err.message,
    });
    startupComplete = true;
  }
}

initStartup();
app.get('/health/startup', (req, res) => {
  if (startupComplete) {
    res.status(200).json({ status: 'started' });
  } else {
    res.status(503).json({ status: 'starting' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'devpulse-backend',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/health/ready', (req, res) => {
  try {
    const { db } = require('./db/database');
    const isDbReady = db.open;
    const isGroqConfigured = !!config.groqApiKey;

    if (isDbReady) {
      res.status(200).json({
        status: 'ready',
        checks: {
          database: 'ok',
          groq: isGroqConfigured ? 'ok' : 'not_configured',
          tools: toolStatus,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'unavailable',
        checks: { database: 'down' },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({ status: 'error', error: error.message });
  }
});

// ─── Routes ──────────────────────────────────────────────────────────────
app.use('/auth', authLimiter, authRoutes);
app.use('/repos', repoRoutes);
app.use('/analyze', analyzeRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/ai', aiChatRoutes);
app.use('/api/remediation', remediationRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/aura076/db-stats', dbStatsRoutes); // DB observability — auth-gated
app.use('/api/aura076', adminRoutes);             // User ban management — ADMIN_SECRET protected

// ─── Public Share Report Endpoint (no auth required) ────────────────────────
// GET /api/reports/:token  — retrieve a shared report snapshot by its token
app.get('/api/reports/:token', async (req, res, next) => {
  try {
    const { reportDB } = require('./db/database');
    const token = req.params.token;
    if (!/^dp_rpt_[a-f0-9]{24}$/.test(token)) {
      return res.status(400).json({ message: 'Invalid report token format.' });
    }
    const report = await reportDB.getByToken(token);
    if (!report) return res.status(404).json({ message: 'Report not found or token is invalid.' });
    if (new Date(report.expiresAt) < new Date()) {
      return res
        .status(410)
        .json({ expired: true, repository: report.repository, expiresAt: report.expiresAt });
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// POST /api/reports  — create shareable token from an existing pipeline result (auth required)
const ensureAuthenticated = require('./middleware/ensureAuthenticated');
app.post('/api/reports', ensureAuthenticated, async (req, res, next) => {
  try {
    const { resultId } = req.body;
    if (!resultId) return res.status(400).json({ message: 'resultId is required.' });

    const { pipelineDB } = require('./db/database');
    const { createReport } = require('./services/report.service');

    // Find the result by id (pipeline_results use id column)
    const { rows } = await require('./db/database').pool.query(
      'SELECT * FROM pipeline_results WHERE id = $1 LIMIT 1',
      [resultId],
    );
    const record = rows[0];
    if (!record) return res.status(404).json({ message: 'Pipeline result not found.' });

    const stages = typeof record.stages === 'string' ? JSON.parse(record.stages) : record.stages;
    const score =
      typeof record.devpulse_score === 'string'
        ? JSON.parse(record.devpulse_score)
        : record.devpulse_score;
    const insights =
      typeof record.insights === 'string' ? JSON.parse(record.insights) : record.insights;

    const report = await createReport({
      repository: record.repository,
      repoMeta: {},
      devpulseScore: score,
      stages,
      insights,
      createdBy: req.user.id,
    });

    const shareUrl = `${config.frontendUrl}/report/${report.token}`;
    res.status(201).json({ token: report.token, shareUrl, expiresAt: report.expiresAt });
  } catch (err) {
    next(err);
  }
});

// ─── Prometheus Metrics Endpoint ─────────────────────────────────────────────
// Exposes metrics in standard Prometheus text format for scraping.
// Also exposes the legacy JSON histogram at /metrics/json for backward compat.
app.get('/metrics', metricsHandler);
app.get('/metrics/json', (req, res) => res.json(getMetrics()));

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} was not found.`,
  });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────────────
Sentry.setupExpressErrorHandler(app);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  // ── GitHub API error (axios 4xx/5xx pass-through) ───────────────────────────
  if (error.response?.data?.message) {
    logger.warn('[ErrorHandler] GitHub API error', {
      requestId: req.requestId,
      userId: req.user?.id,
      path: req.path,
      status: error.response.status,
      detail: error.response.data.message,
    });
    return res.status(error.response.status || 502).json({
      message: 'GitHub API request failed.',
      details: error.response.data.message,
    });
  }

  // ── CORS rejection ──────────────────────────────────────────────────────────
  if (error.message === 'Origin is not allowed by CORS.') {
    logger.warn('[ErrorHandler] CORS rejection', {
      requestId: req.requestId,
      origin: req.headers.origin,
    });
    return res.status(403).json({ message: error.message });
  }

  // ── Determine if this is an expected operational error or an unexpected bug ──
  const statusCode = error.statusCode || 500;
  const isOperational = isHttpError(error) || statusCode < 500;

  // Build a structured log payload (no sensitive data — logger masks it)
  const logPayload = {
    requestId: req.requestId,
    userId: req.user?.id || 'anonymous',
    method: req.method,
    path: req.path,
    statusCode,
    message: error.message,
    stack: error.stack,
  };

  if (isOperational) {
    // Expected error (e.g. 401, 404, validation failure) — log at WARN
    logger.warn('[ErrorHandler] Operational error', logPayload);
  } else {
    // Unexpected bug — log at ERROR so it triggers alerts, and Sentry already
    // captured it via setupExpressErrorHandler above
    logger.error('[ErrorHandler] Unexpected server error', logPayload);
  }

  return res.status(statusCode).json({
    message: error.message || 'Internal server error.',
    requestId: req.requestId, // Return ID so users can quote it in bug reports
  });
});

module.exports = app;

// ─── Process-level Safety Net ──────────────────────────────────────────────────────────────
// These handlers ensure crashes and unhandled Promise rejections are always
// logged to structured output (and thus to Sentry/Render logs) before exit.
// Without these, a mis-handled Promise rejection kills the process silently.

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Process] Unhandled Promise rejection — SHUTTING DOWN', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
    extra: { type: 'unhandledRejection' },
  });
  // Give Sentry time to flush before killing the process
  setTimeout(() => process.exit(1), 1000).unref();
});

process.on('uncaughtException', (err) => {
  logger.error('[Process] Uncaught exception — SHUTTING DOWN', {
    message: err.message,
    stack: err.stack,
  });
  Sentry.captureException(err, { extra: { type: 'uncaughtException' } });
  setTimeout(() => process.exit(1), 1000).unref();
});
