const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const Sentry = require("@sentry/node");

const config = require("./config/env");

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://dummy@o0.ingest.sentry.io/0",
  // 10% sampling in production to avoid quota exhaustion; 100% in development
  tracesSampleRate: config.isProduction ? 0.1 : 1.0,
  environment: config.isProduction ? "production" : "development"
});


const analyzeRoutes  = require("./routes/analyze.routes");
const authRoutes     = require("./routes/auth.routes");
const repoRoutes     = require("./routes/repo.routes");
const webhookRoutes  = require("./routes/webhook.routes");
const pipelineRoutes = require("./routes/pipeline.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const reportRoutes   = require("./routes/report.routes");
const aiChatRoutes   = require("./routes/aiChat.routes");
const { generalApiLimiter, authLimiter }    = require("./middleware/rateLimiter");
const { requestTiming, getMetrics }          = require("./middleware/requestTiming");
const requestId                              = require("./middleware/requestId");
const { isHttpError }                        = require("./utils/httpError");


const app = express();

const logger = require("./utils/logger");

// ─── Request ID ──────────────────────────────────────────────────────────────
// Mount FIRST — before CORS, helmet, morgan, and all routes.
// Stamps req.requestId on every request and sets X-Request-ID response header.
app.use(requestId);

// ─── Swagger Documentation ────────────────────────────────────────────────────
if (!config.isProduction) {
  const swaggerUi = require("swagger-ui-express");
  const YAML = require("yamljs");
  const path = require("path");
  
  try {
    const swaggerDocument = YAML.load(path.join(__dirname, "../docs/openapi.yaml"));
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    logger.info("[Swagger] API documentation available at /api-docs");
  } catch (error) {
    logger.warn(`[Swagger] Could not load openapi.yaml: ${error.message}`);
  }
}

// ─── Trust Proxy (required for express-rate-limit behind Render/Vercel) ───────
app.set("trust proxy", 1);

// ─── Security & Middleware ────────────────────────────────────────────────────

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = [
        config.frontendUrl,
        "http://localhost:5173",
        "http://localhost:3000",
      ];
      // Allow requests with no origin (like mobile apps, curl)
      // or if origin is in allowed list or is a vercel preview deployment
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS."));
    },
  })
);

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://avatars.githubusercontent.com"],
      connectSrc: ["'self'", config.frontendUrl, config.aiServiceUrl],
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  }
}));
app.use(morgan(config.isProduction ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Request Timing (p50/p95/p99 histogram) ─────────────────────────────────────
// Mount early so ALL routes are timed including health checks
app.use(requestTiming);

// ─── Global Rate Limit (catch-all) ────────────────────────────────────────────
app.use("/api", generalApiLimiter);

// ─── Tool Availability (checked at startup) ───────────────────────────────────
const toolStatus = { trivy: false, git: false };

async function checkToolAvailability() {
  const checks = [
    execPromise("trivy --version")
      .then(() => { toolStatus.trivy = true; })
      .catch(() => {
        logger.warn("[Startup] ⚠️  'trivy' not found — security scans will return empty results.");
      }),
    execPromise("git --version")
      .then(() => { toolStatus.git = true; })
      .catch(() => {
        logger.warn("[Startup] ⚠️  'git' not found — repository cloning will fail.");
      }),
  ];
  await Promise.all(checks);
}

checkToolAvailability();

// ─── Health Checks ──────────────────────────────────────────────────────────────
let startupComplete = false;
app.get("/health/startup", (req, res) => {
  if (startupComplete) {
    res.status(200).json({ status: "started" });
  } else {
    res.status(503).json({ status: "starting" });
  }
});

// We'll simulate setting startup to true once app loads
setTimeout(() => { startupComplete = true; }, 1000);

app.get("/health/live", (req, res) => {
  res.status(200).json({ status: "alive", timestamp: new Date().toISOString() });
});

app.get("/health/ready", (req, res) => {
  try {
    const isDbReady = require("./db/database").db.open;
    const isGroqConfigured = !!config.groqApiKey;

    if (isDbReady && isGroqConfigured) {
      res.status(200).json({
        status: "ready",
        checks: { database: "ok", groq: "ok", tools: toolStatus },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: "unavailable",
        checks: {
          database: isDbReady ? "ok" : "down",
          groq: isGroqConfigured ? "ok" : "down"
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({ status: "error", error: error.message });
  }
});

// ─── Routes ──────────────────────────────────────────────────────────────
app.use("/auth",         authLimiter, authRoutes);
app.use("/repos",        repoRoutes);
app.use("/analyze",      analyzeRoutes);
app.use("/webhooks",     webhookRoutes);
app.use("/api/pipeline", pipelineRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/reports",  reportRoutes);
app.use("/api/ai",       aiChatRoutes);

// ─── Metrics Endpoint ────────────────────────────────────────────────────────────
// Returns per-route p50/p95/p99 latency histogram as JSON.
// In production: only accessible from localhost / internal network.
// Expose to external monitoring by pointing your APM scraper at /metrics.
app.get("/metrics", (req, res) => {
  const isLocal = req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1";
  if (config.isProduction && !isLocal) {
    return res.status(403).json({ message: "Metrics not publicly accessible." });
  }
  res.json(getMetrics());
});

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
    logger.warn("[ErrorHandler] GitHub API error", {
      requestId:  req.requestId,
      userId:     req.user?.id,
      path:       req.path,
      status:     error.response.status,
      detail:     error.response.data.message,
    });
    return res.status(error.response.status || 502).json({
      message: "GitHub API request failed.",
      details: error.response.data.message,
    });
  }

  // ── CORS rejection ──────────────────────────────────────────────────────────
  if (error.message === "Origin is not allowed by CORS.") {
    logger.warn("[ErrorHandler] CORS rejection", {
      requestId: req.requestId,
      origin:    req.headers.origin,
    });
    return res.status(403).json({ message: error.message });
  }

  // ── Determine if this is an expected operational error or an unexpected bug ──
  const statusCode    = error.statusCode || 500;
  const isOperational = isHttpError(error) || statusCode < 500;

  // Build a structured log payload (no sensitive data — logger masks it)
  const logPayload = {
    requestId:  req.requestId,
    userId:     req.user?.id || "anonymous",
    method:     req.method,
    path:       req.path,
    statusCode,
    message:    error.message,
    stack:      error.stack,
  };

  if (isOperational) {
    // Expected error (e.g. 401, 404, validation failure) — log at WARN
    logger.warn("[ErrorHandler] Operational error", logPayload);
  } else {
    // Unexpected bug — log at ERROR so it triggers alerts, and Sentry already
    // captured it via setupExpressErrorHandler above
    logger.error("[ErrorHandler] Unexpected server error", logPayload);
  }

  return res.status(statusCode).json({
    message:   error.message || "Internal server error.",
    requestId: req.requestId, // Return ID so users can quote it in bug reports
  });
});

module.exports = app;

// ─── Process-level Safety Net ──────────────────────────────────────────────────────────────
// These handlers ensure crashes and unhandled Promise rejections are always
// logged to structured output (and thus to Sentry/Render logs) before exit.
// Without these, a mis-handled Promise rejection kills the process silently.

process.on("unhandledRejection", (reason, promise) => {
  logger.error("[Process] Unhandled Promise rejection — SHUTTING DOWN", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack:  reason instanceof Error ? reason.stack : undefined,
  });
  Sentry.captureException(
    reason instanceof Error ? reason : new Error(String(reason)),
    { extra: { type: "unhandledRejection" } }
  );
  // Give Sentry time to flush before killing the process
  setTimeout(() => process.exit(1), 1000).unref();
});

process.on("uncaughtException", (err) => {
  logger.error("[Process] Uncaught exception — SHUTTING DOWN", {
    message: err.message,
    stack:   err.stack,
  });
  Sentry.captureException(err, { extra: { type: "uncaughtException" } });
  setTimeout(() => process.exit(1), 1000).unref();
});
