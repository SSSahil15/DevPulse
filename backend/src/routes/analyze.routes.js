const express = require('express');
const { z } = require('zod');

const ensureAuthenticated = require('../middleware/ensureAuthenticated');
const ensureGitHubTokenSynced = require('../middleware/ensureGitHubTokenSynced');
const validate = require('../middleware/validate');
const { analyzeLimiter } = require('../middleware/rateLimiter');
const { buildInitialAnalysis } = require('../services/analyze.service');
const { fetchRepository, mapRepository } = require('../services/github.service');
const asyncHandler = require('../utils/asyncHandler');
const { githubFullNameSchema, githubUrlSchema } = require('../validation/schemas');

const router = express.Router();

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const analyzeSchema = z
  .object({
    // "owner/repo" short form
    repositoryFullName: githubFullNameSchema.optional(),
    // Full GitHub URL — enforces github.com hostname (SSRF protection)
    repoUrl: githubUrlSchema.optional(),
  })
  .refine((data) => data.repositoryFullName || data.repoUrl, {
    message: 'Either repositoryFullName or repoUrl must be provided.',
    path: ['repositoryFullName'],
  });

// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/',
  ensureAuthenticated, // auth first (sets req.user for key generator)
  analyzeLimiter, // 5 req / 24 h per user — most expensive endpoint
  ensureGitHubTokenSynced,
  validate(analyzeSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { scanQueue } = require('../queues');

    let { repositoryFullName, repoUrl } = req.body;

    if (repoUrl && !repositoryFullName) {
      try {
        const urlObj = new URL(repoUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2) {
          repositoryFullName = `${pathParts[0]}/${pathParts[1]}`.replace(/\.git$/, '');
        } else {
          return res.status(400).json({ message: 'Invalid GitHub URL format.' });
        }
      } catch (err) {
        return res.status(400).json({ message: 'Invalid GitHub URL format.' });
      }
    }

    const room = `scan_${repositoryFullName}`;

    const job = await scanQueue.add('analyzeRepo', {
      repositoryFullName,
      githubAccessToken: req.githubAccessToken,
      room,
    });

    return res.status(202).json({
      message: 'Analysis started in background.',
      jobId: job.id,
      room,
    });
  }),
);

module.exports = router;
