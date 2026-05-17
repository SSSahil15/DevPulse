const express = require("express");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const {
  calculateDevPulseScore,
  generatePipelineInsights,
} = require("../services/devpulseScore.service");
const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const ensureGitHubTokenSynced = require("../middleware/ensureGitHubTokenSynced");
const { simulateLimiter } = require("../middleware/rateLimiter");
const { pipelineDB } = require("../db/database");
const { createAndDispatchJob, getJobStatus } = require("../services/scanJob.service");

const router = express.Router();

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const ingestSchema = z.object({
  repository: z.string().min(1),
  commitSha: z.string().min(1),
  runId: z.string().min(1),
  commitMessage: z.string().max(200).optional(),
  branch: z.string().optional(),
  triggeredBy: z.string().optional(),
  runUrl: z.string().url().optional().nullable(),
  event: z.string().optional(),
  timestamp: z.string().optional(),
  overallStatus: z.string().optional(),
  stages: z.object({
    backend: z.object({ tests: z.string() }).optional(),
    frontend: z.object({ build: z.string(), tests: z.string() }).optional(),
    security: z.object({
      critical: z.number().int().min(0),
      high: z.number().int().min(0),
      medium: z.number().int().min(0),
      vulnerabilities: z.array(z.any()).optional(),
    }).optional(),
    docker: z.object({
      build: z.string(),
      imageSize: z.string().optional(),
      imageVulnerabilities: z.number().int().min(0).optional(),
    }).optional(),
  }).optional(),
});

const simulateSchema = z.object({
  repositoryFullName: z.string().min(3).regex(/^[\w.-]+\/[\w.-]+$/, "Must be in owner/repo format"),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pipeline/results
// Receives pipeline results from GitHub Actions. Calculates DevPulse Score
// and AI insights on ingestion, stores the enriched record in SQLite.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/results",
  asyncHandler(async (req, res) => {
    const parsed = ingestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request body.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const {
      repository, commitSha, commitMessage, branch, triggeredBy,
      runId, runUrl, event, timestamp, stages: rawStages, overallStatus,
    } = parsed.data;

    const normalizedStages = {
      backend: { tests: rawStages?.backend?.tests || "skipped" },
      frontend: {
        build: rawStages?.frontend?.build || "skipped",
        tests: rawStages?.frontend?.tests || "skipped",
      },
      security: {
        critical: Number(rawStages?.security?.critical) || 0,
        high: Number(rawStages?.security?.high) || 0,
        medium: Number(rawStages?.security?.medium) || 0,
        vulnerabilities: Array.isArray(rawStages?.security?.vulnerabilities)
          ? rawStages.security.vulnerabilities
          : [],
      },
      docker: {
        build: rawStages?.docker?.build || "skipped",
        imageSize: rawStages?.docker?.imageSize || "N/A",
        imageVulnerabilities: Number(rawStages?.docker?.imageVulnerabilities) || 0,
      },
    };

    const repoHistory = pipelineDB.findFiltered({ repository, limit: 50 });
    const devpulseScore = calculateDevPulseScore(normalizedStages, null, repoHistory);
    const insights = generatePipelineInsights(normalizedStages, devpulseScore);

    const record = {
      id: `pr-${runId}-${Date.now()}`,
      repository,
      commitSha: commitSha?.slice(0, 12),
      commitMessage: commitMessage?.slice(0, 200) || "",
      branch: branch || "unknown",
      triggeredBy: triggeredBy || "unknown",
      runId,
      runUrl: runUrl || null,
      event: event || "unknown",
      timestamp: timestamp || new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      overallStatus: overallStatus || "unknown",
      stages: normalizedStages,
      devpulseScore,
      insights,
    };

    pipelineDB.insert(record);

    console.log(JSON.stringify({
      event: "pipeline_result_received",
      repository: record.repository,
      commit: record.commitSha,
      branch: record.branch,
      status: record.overallStatus,
      score: devpulseScore.score,
      timestamp: record.receivedAt,
    }));

    return res.status(201).json({
      message: "Pipeline results stored successfully.",
      id: record.id,
      overallStatus: record.overallStatus,
      devpulseScore: devpulseScore.score,
      scoreStatus: devpulseScore.status,
      insights: insights.explanation,
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pipeline/simulate
// Creates an async scan job and returns a jobId immediately (HTTP 202).
// The heavy Trivy + GitHub work runs in the background.
// Poll GET /simulate/status/:jobId for results.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/simulate",
  simulateLimiter,
  ensureAuthenticated,
  ensureGitHubTokenSynced,
  asyncHandler(async (req, res) => {
    console.log("[Pipeline] POST /simulate received:", req.body);
    const parsed = simulateSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error("[Pipeline] Invalid request body:", parsed.error.flatten().fieldErrors);
      return res.status(400).json({
        message: "Invalid request body.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { repositoryFullName } = parsed.data;
    console.log("[Pipeline] Creating scan job for:", repositoryFullName);
    const jobId = createAndDispatchJob(repositoryFullName, req.githubAccessToken);
    console.log("[Pipeline] Created jobId:", jobId);

    const response = {
      message: "Scan job accepted. Poll the status endpoint for results.",
      jobId,
      statusUrl: `/api/pipeline/simulate/status/${jobId}`,
    };
    console.log("[Pipeline] Sending response:", response);
    return res.status(202).json(response);
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pipeline/simulate/status/:jobId
// Poll for the result of an async simulate job.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/simulate/status/:jobId",
  ensureAuthenticated,
  asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const job = getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({ message: `Scan job not found: ${jobId}` });
    }

    if (job.status === "pending" || job.status === "processing") {
      return res.status(200).json({
        jobId,
        status: job.status,
        repository: job.repository,
        createdAt: job.createdAt,
      });
    }

    if (job.status === "failed") {
      return res.status(200).json({
        jobId,
        status: "failed",
        repository: job.repository,
        error: job.error,
      });
    }

    // Done — return the full record
    return res.status(200).json({
      jobId,
      status: "done",
      repository: job.repository,
      record: job.result?.record || null,
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pipeline/results
// List results with optional ?repository, ?branch, ?limit filters.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/results",
  asyncHandler(async (req, res) => {
    const { repository, branch, limit: rawLimit } = req.query;
    const limit = Math.min(Math.max(Number(rawLimit) || 20, 1), 100);

    const results = pipelineDB.findFiltered({ repository, branch, limit });

    return res.status(200).json({
      total: results.length,
      results,
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pipeline/results/:runId
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/results/:runId",
  asyncHandler(async (req, res) => {
    const { runId } = req.params;
    const result = pipelineDB.findByRunId(runId);

    if (!result) {
      return res.status(404).json({
        message: `No pipeline result found for run ID: ${runId}`,
      });
    }
    return res.status(200).json(result);
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pipeline/score/:repository/history
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/score/:repository(*)/history",
  asyncHandler(async (req, res) => {
    const repository = req.params.repository;
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const results = pipelineDB.findFiltered({ repository, limit });
    const history = results.map((r) => ({
      runId: r.runId,
      commitSha: r.commitSha,
      branch: r.branch,
      score: r.devpulseScore?.score ?? null,
      status: r.devpulseScore?.status ?? null,
      overallStatus: r.overallStatus,
      timestamp: r.timestamp,
      commitMessage: r.commitMessage,
      event: r.event,
    }));

    return res.status(200).json({ repository, count: history.length, history });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pipeline/score/:repository
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/score/:repository(*)",
  asyncHandler(async (req, res) => {
    const repository = req.params.repository;
    const { branch } = req.query;

    const filtered = pipelineDB.findFiltered({ repository, branch, limit: 50 });

    if (filtered.length === 0) {
      return res.status(404).json({
        message: `No pipeline results found for repository: ${repository}`,
        repository,
      });
    }

    const latest = filtered[0];

    return res.status(200).json({
      repository,
      branch: latest.branch,
      commit: latest.commitSha,
      runUrl: latest.runUrl,
      overallStatus: latest.overallStatus,
      devpulseScore: latest.devpulseScore,
      insights: latest.insights,
      stages: latest.stages,
      timestamp: latest.timestamp,
      receivedAt: latest.receivedAt,
      historyCount: filtered.length,
      trend: filtered.length >= 2
        ? latest.devpulseScore.score - filtered[1].devpulseScore.score
        : null,
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pipeline/health
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/health",
  asyncHandler(async (req, res) => {
    const { total, successes, avgScore, latest } = pipelineDB.getHealth();

    return res.status(200).json({
      service: "devpulse-pipeline",
      status: "ok",
      totalRuns: total,
      successRate: total > 0 ? `${Math.round((successes / total) * 100)}%` : "N/A",
      averageScore: avgScore,
      latestRun: latest ? {
        repository: latest.repository,
        commit: latest.commitSha,
        status: latest.overallStatus,
        devpulseScore: latest.devpulseScore?.score ?? null,
        scoreStatus: latest.devpulseScore?.status ?? null,
        timestamp: latest.timestamp,
      } : null,
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/pipeline/results/:id  — delete a single scan record
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  "/results/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = pipelineDB.deleteById(id);
    if (result.changes === 0) {
      return res.status(404).json({ message: `Record ${id} not found` });
    }
    return res.status(200).json({ deleted: 1, id });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/pipeline/results  — bulk delete by list of ids
// Body: { ids: ["id1", "id2", ...] }
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  "/results",
  asyncHandler(async (req, res) => {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Provide a non-empty ids array in the request body" });
    }
    pipelineDB.deleteByIds(ids);
    return res.status(200).json({ deleted: ids.length, ids });
  })
);

module.exports = router;
