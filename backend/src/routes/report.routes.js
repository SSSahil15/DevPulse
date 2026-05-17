const express = require("express");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const ensureGitHubTokenSynced = require("../middleware/ensureGitHubTokenSynced");
const { createReport, getReportByToken } = require("../services/report.service");
const { pipelineDB } = require("../db/database");
const config = require("../config/env");

const router = express.Router();

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const createReportSchema = z.object({
  repository: z.string().min(1, "repository (fullName) is required."),
  repoMeta: z.object({
    description: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    stargazersCount: z.number().int().min(0).optional(),
    forksCount: z.number().int().min(0).optional(),
    defaultBranch: z.string().optional(),
    htmlUrl: z.string().url().nullable().optional(),
  }).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reports
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  ensureAuthenticated,
  ensureGitHubTokenSynced,
  asyncHandler(async (req, res) => {
    const parsed = createReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request body.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { repository, repoMeta } = parsed.data;

    // Find latest pipeline data for this repo from DB
    const results = pipelineDB.findFiltered({ repository, limit: 1 });
    const latest = results[0];

    if (!latest) {
      return res.status(404).json({
        message: "No pipeline data found for this repository. Run a simulation first.",
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
// GET /api/reports/:token — Public endpoint
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/:token",
  asyncHandler(async (req, res) => {
    const { token } = req.params;

    if (!/^dp_rpt_[a-f0-9]{24}$/.test(token)) {
      return res.status(400).json({ message: "Invalid report token format." });
    }

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
