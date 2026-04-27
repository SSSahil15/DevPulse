const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { buildInitialAnalysis } = require("../services/analyze.service");

const router = express.Router();

// Mock store for CI runs (in a real app, this would be in a DB)
const ciRuns = [];

router.post(
  "/github",
  asyncHandler(async (req, res) => {
    const { repository, runId, status, conclusion, results } = req.body;

    console.log(`Received CI result for ${repository}: ${conclusion}`);

    const runRecord = {
      id: runId,
      repository,
      status,
      conclusion,
      results,
      receivedAt: new Date().toISOString()
    };

    ciRuns.unshift(runRecord);
    if (ciRuns.length > 50) ciRuns.pop();

    return res.status(200).json({
      message: "Webhook processed successfully",
      runId
    });
  })
);

router.get(
  "/runs/:repository",
  asyncHandler(async (req, res) => {
    const { repository } = req.params;
    const repoRuns = ciRuns.filter(r => r.repository === repository);
    return res.status(200).json(repoRuns);
  })
);

module.exports = router;
