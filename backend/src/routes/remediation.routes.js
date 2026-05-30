const express = require('express');
const router = express.Router();
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const ensureAuthenticated = require('../middleware/ensureAuthenticated');
const ensureGitHubTokenSynced = require('../middleware/ensureGitHubTokenSynced');
const { enqueueRemediation } = require('../queues/remediationQueue');
const {
  parseTrivyVulnerabilities,
  resolveUpgradeVersions,
  deduplicatePatches,
  buildPatchSummary,
} = require('../services/remediation.service');
const { verifyWriteScope } = require('../services/githubRemediation.service');
const logger = require('../utils/logger');

// ─── Rate Limiter for Remediation (expensive endpoint) ────────────────────────
const remediationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { message: 'Too many remediation requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Validation Schemas ────────────────────────────────────────────────────────
const GenerateFixSchema = z.object({
  repositoryFullName: z
    .string()
    .regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, 'Invalid repository name'),
  scanData: z.object({}).passthrough(), // Full Trivy JSON output
  targetVulnIds: z.array(z.string()).optional(), // Optional: specific CVEs to fix
  isDryRun: z.boolean().default(true), // Default: dry-run first
});

const DryRunSchema = z.object({
  repositoryFullName: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/),
  scanData: z.object({}).passthrough(),
  targetVulnIds: z.array(z.string()).optional(),
});

// ─── Helper: get stored GitHub token ─────────────────────────────────────────
// ensureGitHubTokenSynced middleware attaches req.githubAccessToken for us.
function getGitHubToken(req) {
  const token = req.githubAccessToken;
  if (!token) {
    const err = new Error('GitHub token not found. Please reconnect your GitHub account.');
    err.statusCode = 401;
    err.code = 'NO_GITHUB_TOKEN';
    throw err;
  }
  return token;
}

// ─── POST /api/remediation/generate ──────────────────────────────────────────
/**
 * Enqueue a remediation job (dry-run by default).
 * Returns { jobId, room } for WebSocket subscription.
 */
router.post(
  '/generate',
  ensureAuthenticated,
  ensureGitHubTokenSynced,
  remediationLimiter,
  async (req, res, next) => {
    try {
      const parsed = GenerateFixSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: 'Invalid request body',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { repositoryFullName, scanData, targetVulnIds, isDryRun } = parsed.data;

      // Retrieve and verify the GitHub token
      const githubAccessToken = getGitHubToken(req);

      // Verify token has write scope before queuing (fail fast)
      if (!isDryRun) {
        await verifyWriteScope(githubAccessToken);
      }

      // Generate a room ID for WebSocket subscription
      const jobSuffix = crypto.randomBytes(4).toString('hex');
      const room = `remediation:${req.user.id}:${repositoryFullName.replace('/', ':')}:${jobSuffix}`;

      // Enqueue the job
      const job = await enqueueRemediation({
        repositoryFullName,
        githubAccessToken,
        scanData,
        targetVulnIds: targetVulnIds || [],
        room,
        userId: req.user.id,
        isDryRun,
      });

      logger.info(
        `[Remediation] Job ${job.id} enqueued for ${repositoryFullName} by user ${req.user.id} (dryRun=${isDryRun})`,
      );

      res.status(202).json({
        jobId: job.id,
        room,
        isDryRun,
        message: isDryRun
          ? 'Dry-run analysis started. Subscribe to the WebSocket room for progress updates.'
          : 'Remediation job enqueued. Subscribe to the WebSocket room for progress updates.',
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/remediation/confirm ───────────────────────────────────────────
/**
 * After reviewing the dry-run diff, confirm and enqueue the actual PR creation.
 */
router.post(
  '/confirm',
  ensureAuthenticated,
  ensureGitHubTokenSynced,
  remediationLimiter,
  async (req, res, next) => {
    try {
      const parsed = GenerateFixSchema.safeParse({ ...req.body, isDryRun: false });
      if (!parsed.success) {
        return res.status(400).json({
          message: 'Invalid request body',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { repositoryFullName, scanData, targetVulnIds } = parsed.data;
      const githubAccessToken = getGitHubToken(req);

      // Strict scope check for live PR creation
      await verifyWriteScope(githubAccessToken);

      const jobSuffix = crypto.randomBytes(4).toString('hex');
      const room = `remediation:${req.user.id}:${repositoryFullName.replace('/', ':')}:${jobSuffix}`;

      const job = await enqueueRemediation({
        repositoryFullName,
        githubAccessToken,
        scanData,
        targetVulnIds: targetVulnIds || [],
        room,
        userId: req.user.id,
        isDryRun: false,
      });

      logger.info(`[Remediation] Live PR job ${job.id} confirmed by user ${req.user.id}`);

      res.status(202).json({
        jobId: job.id,
        room,
        isDryRun: false,
        message: 'PR creation job started. Subscribe to the WebSocket room for live progress.',
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/remediation/status/:jobId ───────────────────────────────────────
/**
 * Poll job status (fallback for clients that can't use WebSocket).
 */
router.get('/status/:jobId', ensureAuthenticated, async (req, res, next) => {
  try {
    const { remediationQueue } = require('../queues/remediationQueue');
    const job = await remediationQueue.getJob(req.params.jobId);

    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    const state = await job.getState();

    res.json({
      jobId: job.id,
      state,
      progress: job.progress,
      data: state === 'completed' ? job.returnvalue : undefined,
      failedReason: state === 'failed' ? job.failedReason : undefined,
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/remediation/analyse ───────────────────────────────────────────
/**
 * Lightweight analysis endpoint (no queue, no GitHub writes).
 * Parses scan data and returns: fixable vulns, version resolutions, confidence scores.
 * Used to populate the RemediationDrawer before the user clicks "Generate Fix PR".
 */
router.post('/analyse', ensureAuthenticated, async (req, res, next) => {
  try {
    const { scanData, targetVulnIds } = req.body;

    if (!scanData) {
      return res.status(400).json({ message: 'scanData is required.' });
    }

    const scanResult = parseTrivyVulnerabilities(scanData);
    let { vulnerabilities } = scanResult;

    if (targetVulnIds && targetVulnIds.length > 0) {
      vulnerabilities = vulnerabilities.filter((v) => targetVulnIds.includes(v.id));
    }

    const fixable = vulnerabilities.filter((v) => v.hasFixedVersion);
    const enriched = await resolveUpgradeVersions(fixable.slice(0, 25));
    const patches = deduplicatePatches(enriched);
    const patchSummary = buildPatchSummary(patches);

    res.json({
      totalVulns: vulnerabilities.length,
      fixableCount: fixable.length,
      patchCount: patches.length,
      ecosystems: scanResult.ecosystems,
      patches: patchSummary,
      nonFixable: vulnerabilities
        .filter((v) => !v.hasFixedVersion)
        .map((v) => ({
          id: v.id,
          pkgName: v.pkgName,
          severity: v.severity,
          reason: 'No fixed version available in Trivy database.',
        })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/remediation/explain ──────────────────────────────────────────
/**
 * On-demand AI explanation for a single vulnerability.
 * Lightweight — no queue, no GitHub writes. Returns explanation JSON directly.
 */
router.post(
  '/explain',
  ensureAuthenticated,
  rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }),
  async (req, res, next) => {
    try {
      const { vuln } = req.body;

      if (!vuln || !vuln.id) {
        return res.status(400).json({ message: 'vuln with id is required.' });
      }

      const { explainVulnerability } = require('../services/aiRemediation.service');

      const explanation = await explainVulnerability({
        id: vuln.id,
        title: vuln.title || vuln.id,
        severity: vuln.severity || 'UNKNOWN',
        pkgName: vuln.pkgName || 'unknown',
        installedVersion: vuln.installedVersion || 'unknown',
        fixedVersion: vuln.fixedVersion || null,
        cvssScore: vuln.cvssScore || null,
        description: vuln.description || '',
      });

      res.json({ explanation });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
