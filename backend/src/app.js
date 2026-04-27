const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const config = require("./config/env");
const analyzeRoutes = require("./routes/analyze.routes");
const authRoutes = require("./routes/auth.routes");
const repoRoutes = require("./routes/repo.routes");
const webhookRoutes = require("./routes/webhook.routes");
const pipelineRoutes = require("./routes/pipeline.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const reportRoutes = require("./routes/report.routes");
const aiChatRoutes = require("./routes/aiChat.routes");

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (curl, CI pipelines, server-to-server)
      if (!origin || origin === config.frontendUrl) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS."));
    }
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);
app.use(morgan(config.isProduction ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({
    service: "devpulse-backend",
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.use("/auth", authRoutes);
app.use("/repos", repoRoutes);
app.use("/analyze", analyzeRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/api/pipeline", pipelineRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/ai", aiChatRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} was not found.`
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.response?.data?.message) {
    return res.status(error.response.status || 502).json({
      message: "GitHub API request failed.",
      details: error.response.data.message
    });
  }

  if (error.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({
      message: error.message
    });
  }

  console.error(error);

  return res.status(error.statusCode || 500).json({
    message: error.message || "Internal server error."
  });
});

module.exports = app;
