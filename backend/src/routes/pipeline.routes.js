const express = require('express');
const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const ensureAuthenticated = require('../middleware/ensureAuthenticated');
const ensureGitHubTokenSynced = require('../middleware/ensureGitHubTokenSynced');
const { simulateLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const pipelineController = require('../controllers/pipeline.controller');
const {
  githubFullNameSchema,
  paginationSchema,
  commitShaSchema,
} = require('../validation/schemas');

const router = express.Router();

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

// Extended pagination schema for GET /results — preserves repository + branch
// filter params that paginationSchema would otherwise strip (Zod strips unknown
// keys by default). Offset is coerced from string query params.
const resultsQuerySchema = paginationSchema.extend({
  repository: z.string().trim().max(200).optional(),
  branch: z.string().trim().max(255).optional(),
  offset: z.coerce.number().int().min(0).default(0),
});

const ingestSchema = z.object({
  repository: z.string().trim().min(1).max(200),
  commitSha: commitShaSchema,
  runId: z.string().trim().min(1).max(50),
  commitMessage: z.string().trim().max(500).optional(),
  branch: z.string().trim().max(255).optional(),
  triggeredBy: z.string().trim().max(100).optional(),
  runUrl: z.string().url().optional().nullable(),
  event: z.string().trim().max(50).optional(),
  timestamp: z.string().optional(),
  overallStatus: z.enum(['success', 'failure', 'cancelled', 'skipped']).optional(),
  stages: z
    .object({
      backend: z.object({ tests: z.string().max(20) }).optional(),
      frontend: z
        .object({
          build: z.string().max(20),
          tests: z.string().max(20),
        })
        .optional(),
      security: z
        .object({
          critical: z.number().int().min(0),
          high: z.number().int().min(0),
          medium: z.number().int().min(0),
          low: z.number().int().min(0).optional(),
          vulnerabilities: z.array(z.any()).max(500).optional(),
        })
        .optional(),
      docker: z
        .object({
          build: z.string().max(20),
          imageSize: z.string().max(50).optional(),
          imageVulnerabilities: z.number().int().min(0).optional(),
        })
        .optional(),
    })
    .optional(),
});

const simulateSchema = z.object({
  repositoryFullName: githubFullNameSchema,
});

// ─── Param schemas ────────────────────────────────────────────────────────────

// Scan job IDs: "job_" prefix + 16 lowercase hex chars
const jobIdParamSchema = z.object({
  jobId: z
    .string()
    .trim()
    .regex(/^job_[a-z0-9]{16}$/, 'Invalid job ID format.'),
});

// Pipeline result IDs are generated as "pr-<runId>-<timestamp>" or
// "sim-<runId>-<timestamp>" by pipeline.controller.js.
const resultIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .min(3, 'Result ID is required.')
    .max(255, 'Result ID is too long.')
    .regex(/^[a-zA-Z0-9_.:-]+$/, 'Result ID contains invalid characters.'),
});

// GitHub Actions run IDs are numeric strings
const runIdParamSchema = z.object({
  runId: z
    .string()
    .trim()
    .regex(/^\d{1,20}$/, 'Run ID must be a numeric string.'),
});

// Repo path wildcard param
const repoPathParamSchema = z.object({
  repository: z.string().trim().min(3).max(200),
});

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/results',
  validate(ingestSchema, 'body'),
  asyncHandler(pipelineController.ingestResult),
);

router.post(
  '/simulate',
  simulateLimiter,
  ensureAuthenticated,
  ensureGitHubTokenSynced,
  validate(simulateSchema, 'body'),
  asyncHandler(pipelineController.simulateScan),
);

router.get(
  '/simulate/status/:jobId',
  ensureAuthenticated,
  validate(jobIdParamSchema, 'params'),
  asyncHandler(pipelineController.getSimulationStatus),
);

router.get(
  '/results',
  validate(resultsQuerySchema, 'query'),
  asyncHandler(pipelineController.getResultsList),
);

router.get(
  '/results/:runId',
  validate(runIdParamSchema, 'params'),
  asyncHandler(pipelineController.getResultById),
);

router.get('/score/:repository(*)/history', asyncHandler(pipelineController.getScoreHistory));

router.get('/score/:repository(*)', asyncHandler(pipelineController.getLatestScore));

router.get('/health', asyncHandler(pipelineController.getPipelineHealth));

router.delete(
  '/results/:id',
  validate(resultIdParamSchema, 'params'),
  asyncHandler(pipelineController.deleteResultById),
);

router.delete('/results', asyncHandler(pipelineController.deleteResultsBulk));

module.exports = router;
