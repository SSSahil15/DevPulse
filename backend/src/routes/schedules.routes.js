/**
 * Schedules Routes — CRUD for recurring scan schedules.
 *
 * POST   /api/schedules          Create a new schedule
 * GET    /api/schedules          List authenticated user's schedules
 * PATCH  /api/schedules/:id      Update a schedule (cron, enabled)
 * DELETE /api/schedules/:id      Delete a schedule
 */

const express = require('express');
const { z } = require('zod');
const crypto = require('crypto');
const router = express.Router();

const ensureAuthenticated = require('../middleware/ensureAuthenticated');
const ensureGitHubTokenSynced = require('../middleware/ensureGitHubTokenSynced');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { scheduleDB } = require('../db/database');
const { scheduleScan, removeScheduledScan } = require('../services/schedulerEngine.service');

// ── Validation schemas ────────────────────────────────────────────────────────

// Preset frequencies mapped to cron expressions
const PRESET_CRONS = {
  daily: '0 9 * * *', // Every day at 9am UTC
  weekly: '0 9 * * 1', // Every Monday at 9am UTC
  monthly: '0 9 1 * *', // First of every month at 9am UTC
};

const CreateScheduleSchema = z
  .object({
    repository: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, 'Invalid repository name'),
    preset: z.enum(['daily', 'weekly', 'monthly']).optional(),
    cronExpr: z.string().max(100).optional(),
    label: z.string().max(100).optional(),
  })
  .refine((d) => d.preset || d.cronExpr, {
    message: 'Either preset or cronExpr is required',
  });

const UpdateScheduleSchema = z.object({
  enabled: z.boolean().optional(),
  preset: z.enum(['daily', 'weekly', 'monthly']).optional(),
  cronExpr: z.string().max(100).optional(),
  label: z.string().max(100).optional(),
});

// ── Middleware: all routes require auth ───────────────────────────────────────
router.use(ensureAuthenticated);

// ── POST /api/schedules ───────────────────────────────────────────────────────
router.post(
  '/',
  ensureGitHubTokenSynced,
  asyncHandler(async (req, res) => {
    const parsed = CreateScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Invalid request',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { repository, preset, cronExpr, label } = parsed.data;
    const cron = preset ? PRESET_CRONS[preset] : cronExpr;

    // Check for existing schedule for same user+repo
    const existing = await scheduleDB.findByUserAndRepo(req.user.id, repository);
    if (existing) {
      return res.status(409).json({
        message: `A schedule already exists for ${repository}. Delete it first or update it.`,
      });
    }

    const id = `sch_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();
    const nextRunAt = computeNextRun(cron);

    await scheduleDB.create({
      id,
      userId: req.user.id,
      repository,
      cronExpr: cron,
      label: label || preset || 'custom',
      enabled: true,
      lastRunAt: null,
      nextRunAt,
      createdAt: now,
    });

    // Register repeatable BullMQ job
    await scheduleScan({
      scheduleId: id,
      userId: req.user.id,
      repository,
      cronExpr: cron,
    });

    logger.info(
      `[Schedules] Created schedule ${id} for ${repository} by user ${req.user.id} (${cron})`,
    );

    res.status(201).json({
      id,
      repository,
      cronExpr: cron,
      label,
      enabled: true,
      nextRunAt,
      message: `Scan scheduled for ${repository}`,
    });
  }),
);

// ── GET /api/schedules ────────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const schedules = await scheduleDB.findByUser(req.user.id);
    res.json({ schedules, total: schedules.length });
  }),
);

// ── PATCH /api/schedules/:id ──────────────────────────────────────────────────
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const schedule = await scheduleDB.findById(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Schedule not found.' });
    if (schedule.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });

    const parsed = UpdateScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors });
    }

    const { enabled, preset, cronExpr, label } = parsed.data;
    const newCron = preset ? PRESET_CRONS[preset] : cronExpr || schedule.cron_expr;
    const nextRunAt = enabled !== false ? computeNextRun(newCron) : null;

    await scheduleDB.update(req.params.id, {
      cronExpr: newCron,
      label: label || schedule.label,
      enabled: enabled !== undefined ? enabled : schedule.enabled,
      nextRunAt,
    });

    // Re-register if cron changed or toggled on
    if (enabled !== false) {
      await removeScheduledScan(req.params.id);
      await scheduleScan({
        scheduleId: req.params.id,
        userId: req.user.id,
        repository: schedule.repository,
        cronExpr: newCron,
      });
    } else {
      await removeScheduledScan(req.params.id);
    }

    res.json({
      message: 'Schedule updated.',
      id: req.params.id,
      cronExpr: newCron,
      enabled: enabled !== undefined ? enabled : schedule.enabled,
    });
  }),
);

// ── DELETE /api/schedules/:id ─────────────────────────────────────────────────
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const schedule = await scheduleDB.findById(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Schedule not found.' });
    if (schedule.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });

    await removeScheduledScan(req.params.id);
    await scheduleDB.delete(req.params.id);

    logger.info(`[Schedules] Deleted schedule ${req.params.id} for ${schedule.repository}`);
    res.json({ message: 'Schedule deleted.', id: req.params.id });
  }),
);

// ── Helper ────────────────────────────────────────────────────────────────────

function computeNextRun(cronExpr) {
  try {
    // Rough next-run estimate (within an hour for display purposes)
    // For production, use a cron parser library like `cron-parser`
    return new Date(Date.now() + 60 * 60 * 1000).toISOString();
  } catch {
    return null;
  }
}

module.exports = router;
