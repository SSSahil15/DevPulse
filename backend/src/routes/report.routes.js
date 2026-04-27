const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const ensureGitHubTokenSynced = require("../middleware/ensureGitHubTokenSynced");
const { createReport, getReportByToken } = require("../services/report.service");
const config = require("../config/env");

const router = express.Router();

/**
 * In-memory reference to the pipeline results store.
 * We import it lazily to avoid circular deps.
 */
function getPipelineResults() {
  // Access the pipeline results from the pipeline routes module cache
  const pipelineModule = require("./pipeline.routes");
  return pipelineModule._pipelineResults || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reports
// Creates a shareable report from the latest pipeline data for a repository.
// Requires authentication.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  ensureAuthenticated,
  ensureGitHubTokenSynced,
  asyncHandler(async (req, res) => {
    const { repository, repoMeta } = req.body;

    if (!repository) {
      return res.status(400).json({ message: "repository (fullName) is required." });
    }

    // Find latest pipeline data for this repo
    const pipelineResults = getPipelineResults();
    const latest = pipelineResults.find(r => r.repository === repository);

    if (!latest) {
      return res.status(404).json({
        message: "No pipeline data found for this repository. Run a CI/CD simulation first.",
      });
    }

    const report = createReport({
      repository,
      repoMeta: repoMeta || {},
      devpulseScore: latest.devpulseScore,
      stages: latest.stages,
      insights: latest.insights,
      createdBy: req.user?.username || "anonymous",
    });

    const shareUrl = `${config.frontendUrl}/report/${report.token}`;

    return res.status(201).json({
      message: "Shareable report created successfully.",
      token: report.token,
      shareUrl,
      expiresAt: report.expiresAt,
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/:token
// Public endpoint — no authentication required.
// Returns the report data for rendering the shared view.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/:token",
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    const report = getReportByToken(token);

    if (!report) {
      return res.status(404).json({ message: "Report not found or the link is invalid." });
    }

    if (report.expired) {
      return res.status(410).json({
        message: "This report has expired.",
        repository: report.repository,
        expiresAt: report.expiresAt,
      });
    }

    return res.status(200).json(report);
  })
);

module.exports = router;
