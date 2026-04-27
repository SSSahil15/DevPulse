const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const {
  calculateDevPulseScore,
  generatePipelineInsights,
} = require("../services/devpulseScore.service");
const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const ensureGitHubTokenSynced = require("../middleware/ensureGitHubTokenSynced");
const { runTrivyScan } = require("../services/security.service");
const { fetchRepoHealth } = require("../services/github.service");

const router = express.Router();

/**
 * In-memory pipeline results store.
 * In production, replace this with a database (Postgres, Supabase, etc.)
 */
const pipelineResults = [];
const MAX_RESULTS = 200;

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pipeline/results
// Receives pipeline results from GitHub Actions. Calculates DevPulse Score
// and AI insights on ingestion, stores the enriched record.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/results",
  asyncHandler(async (req, res) => {
    const {
      repository,
      commitSha,
      commitMessage,
      branch,
      triggeredBy,
      runId,
      runUrl,
      event,
      timestamp,
      stages,
      overallStatus,
    } = req.body;

    if (!repository || !commitSha || !runId) {
      return res.status(400).json({
        message:
          "Missing required fields: repository, commitSha, and runId are required.",
      });
    }

    const normalizedStages = {
      backend: {
        tests: stages?.backend?.tests || "skipped",
      },
      frontend: {
        build: stages?.frontend?.build || "skipped",
        tests: stages?.frontend?.tests || "skipped",
      },
      security: {
        critical: Number(stages?.security?.critical) || 0,
        high: Number(stages?.security?.high) || 0,
        medium: Number(stages?.security?.medium) || 0,
        vulnerabilities: Array.isArray(stages?.security?.vulnerabilities) ? stages.security.vulnerabilities : [],
      },
      docker: {
        build: stages?.docker?.build || "skipped",
        imageSize: stages?.docker?.imageSize || "N/A",
        imageVulnerabilities: Number(stages?.docker?.imageVulnerabilities) || 0,
      },
    };

    // ── DevPulse Score + AI Insights ─────────────────────────
    // Get pipeline history for this repo (for historical failure rate)
    const repoHistory = pipelineResults.filter(r => r.repository === repository);
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

    console.log(
      JSON.stringify({
        event: "pipeline_result_received",
        repository: record.repository,
        commit: record.commitSha,
        branch: record.branch,
        status: record.overallStatus,
        score: devpulseScore.score,
        scoreStatus: devpulseScore.status,
        security: normalizedStages.security,
        timestamp: record.receivedAt,
      })
    );

    pipelineResults.unshift(record);
    if (pipelineResults.length > MAX_RESULTS) {
      pipelineResults.length = MAX_RESULTS;
    }

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
// Simulates a pipeline run for demo purposes
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/simulate",
  ensureAuthenticated,
  ensureGitHubTokenSynced,
  asyncHandler(async (req, res) => {
    const { repositoryFullName } = req.body;
    
    if (!repositoryFullName) {
      return res.status(400).json({ message: "repositoryFullName is required." });
    }

    // Run real Trivy scan + GitHub health metrics in parallel for speed
    const [securityScan, repoHealth] = await Promise.all([
      runTrivyScan(repositoryFullName, req.githubAccessToken),
      fetchRepoHealth(req.githubAccessToken, repositoryFullName),
    ]);

    const runId = Math.floor(Math.random() * 10000000).toString();

    const stages = {
      backend: { tests: "success" },
      frontend: { build: "success", tests: "success" },
      docker: { build: "success", imageSize: "450MB", imageVulnerabilities: securityScan.summary?.unknown || 0 },
      security: {
        critical: securityScan.summary?.critical || 0,
        high: securityScan.summary?.high || 0,
        medium: securityScan.summary?.medium || 0,
        vulnerabilities: securityScan.vulnerabilities || []
      }
    };

    const overallStatus = stages.security.critical > 0 ? "failure" : "success";

    // Get pipeline history for this repo (for historical failure rate factor)
    const repoHistory = pipelineResults.filter(r => r.repository === repositoryFullName);
    const devpulseScore = calculateDevPulseScore(stages, repoHealth, repoHistory);
    const insights = generatePipelineInsights(stages, devpulseScore, repoHealth);

    const record = {
      id: `sim-${runId}-${Date.now()}`,
      repository: repositoryFullName,
      commitSha: Math.random().toString(16).slice(2, 14),
      commitMessage: `Simulated commit ${Math.random().toString(36).substring(7)}`,
      branch: "main",
      triggeredBy: "DevPulse Simulator",
      runId,
      runUrl: null, // intentionally null for simulation
      event: "push",
      timestamp: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      overallStatus,
      stages,
      devpulseScore,
      insights,
    };

    pipelineResults.unshift(record);
    if (pipelineResults.length > MAX_RESULTS) pipelineResults.length = MAX_RESULTS;

    return res.status(201).json({
      message: "Pipeline simulated successfully",
      record
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

    let filtered = pipelineResults;
    if (repository) filtered = filtered.filter((r) => r.repository === repository);
    if (branch) filtered = filtered.filter((r) => r.branch === branch);

    return res.status(200).json({
      total: filtered.length,
      results: filtered.slice(0, limit),
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
    const result = pipelineResults.find((r) => r.runId === runId);
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
// Returns score history (up to 20 runs) for trending.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/score/:repository(*)/history",
  asyncHandler(async (req, res) => {
    const repository = req.params.repository;
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const filtered = pipelineResults
      .filter((r) => r.repository === repository)
      .slice(0, limit)
      .map((r) => ({
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

    return res.status(200).json({
      repository,
      count: filtered.length,
      history: filtered,
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pipeline/score/:repository
// Returns the latest DevPulse Score for a given repository.
// Supports ?branch= filter.
// Used by the dashboard for real-time score display.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/score/:repository(*)",
  asyncHandler(async (req, res) => {
    const repository = req.params.repository;
    const { branch } = req.query;

    let filtered = pipelineResults.filter((r) => r.repository === repository);
    if (branch) filtered = filtered.filter((r) => r.branch === branch);

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
      // Trend: compare latest vs previous run score
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
    const latest = pipelineResults[0] || null;
    const successCount = pipelineResults.filter(
      (r) => r.overallStatus === "success"
    ).length;

    const avgScore =
      pipelineResults.length > 0
        ? Math.round(
            pipelineResults
              .map((r) => r.devpulseScore?.score ?? 100)
              .reduce((a, b) => a + b, 0) / pipelineResults.length
          )
        : null;

    return res.status(200).json({
      service: "devpulse-pipeline",
      status: "ok",
      totalRuns: pipelineResults.length,
      successRate:
        pipelineResults.length > 0
          ? `${Math.round((successCount / pipelineResults.length) * 100)}%`
          : "N/A",
      averageScore: avgScore,
      latestRun: latest
        ? {
            repository: latest.repository,
            commit: latest.commitSha,
            status: latest.overallStatus,
            devpulseScore: latest.devpulseScore?.score ?? null,
            scoreStatus: latest.devpulseScore?.status ?? null,
            timestamp: latest.timestamp,
          }
        : null,
    });
  })
);

// Expose pipeline results for cross-module access (e.g. report generation)
router._pipelineResults = pipelineResults;

module.exports = router;
