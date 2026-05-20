const express = require("express");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const ensureGitHubTokenSynced = require("../middleware/ensureGitHubTokenSynced");
const { createReport, getReportByToken } = require("../services/report.service");
const { pipelineDB } = require("../db/database");
const config = require("../config/env");
const redis = require("../services/redis.service");

const router = express.Router();
const validate = require("../middleware/validate");

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

const reportParamSchema = z.object({
  token: z.string().trim().regex(/^dp_rpt_[a-f0-9]{24}$/, "Invalid report token format.")
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
    const results = await pipelineDB.findFiltered({ repository, limit: 1 });
    const latest = results[0];

    if (!latest) {
      return res.status(404).json({
        message: "No pipeline data found for this repository. Run a simulation first.",
      });
    }

    const report = await createReport({
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
  validate(reportParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const { token } = req.params;

    const cacheKey = `report:${token}`;
    let report = await redis.get(cacheKey);
    
    if (report) {
      console.log(`[Reports] Cache HIT for shared report token: ${token}`);
    } else {
      report = await getReportByToken(token);
      if (report && !report.expired) {
        await redis.set(cacheKey, report, 30 * 24 * 60 * 60); // 30 days
      }
    }

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
