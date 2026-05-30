const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { buildInitialAnalysis } = require('../services/analyze.service');

const router = express.Router();

// In a full implementation, you might process raw GitHub webhooks here.
// For DevPulse, the primary pipeline results ingest is handled by POST /api/pipeline/results.

router.post(
  '/github',
  asyncHandler(async (req, res) => {
    const { repository, runId, conclusion } = req.body;

    console.log(
      `[Webhook] Received generic CI ping for ${repository || 'unknown'}: ${conclusion || 'unknown'}`,
    );

    return res.status(200).json({
      message: 'Webhook acknowledged',
      runId,
    });
  }),
);

module.exports = router;
