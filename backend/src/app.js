const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

const config = require("./config/env");
const analyzeRoutes = require("./routes/analyze.routes");
const authRoutes = require("./routes/auth.routes");
const repoRoutes = require("./routes/repo.routes");
const webhookRoutes = require("./routes/webhook.routes");
const pipelineRoutes = require("./routes/pipeline.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const reportRoutes = require("./routes/report.routes");
const aiChatRoutes = require("./routes/aiChat.routes");
const { generalApiLimiter, authLimiter } = require("./middleware/rateLimiter");

const app = express();

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

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan(config.isProduction ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Global Rate Limit (catch-all) ────────────────────────────────────────────
app.use("/api", generalApiLimiter);

// ─── Tool Availability (checked at startup) ───────────────────────────────────
const toolStatus = { trivy: false, git: false };

async function checkToolAvailability() {
  const checks = [
    execPromise("trivy --version")
      .then(() => { toolStatus.trivy = true; })
      .catch(() => {
        console.warn("[Startup] ⚠️  'trivy' not found — security scans will return empty results.");
      }),
    execPromise("git --version")
      .then(() => { toolStatus.git = true; })
      .catch(() => {
        console.warn("[Startup] ⚠️  'git' not found — repository cloning will fail.");
      }),
  ];
  await Promise.all(checks);
}

checkToolAvailability();

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "devpulse-backend",
    status: "ok",
    timestamp: new Date().toISOString(),
    tools: {
      trivy: toolStatus.trivy ? "available" : "missing",
      git: toolStatus.git ? "available" : "missing",
    },
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/auth", authLimiter, authRoutes);
app.use("/repos", repoRoutes);
app.use("/analyze", analyzeRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/api/pipeline", pipelineRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/ai", aiChatRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} was not found.`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error.response?.data?.message) {
    return res.status(error.response.status || 502).json({
      message: "GitHub API request failed.",
      details: error.response.data.message,
    });
  }

  if (error.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({ message: error.message });
  }

  console.error(error);

  return res.status(error.statusCode || 500).json({
    message: error.message || "Internal server error.",
  });
});

module.exports = app;
