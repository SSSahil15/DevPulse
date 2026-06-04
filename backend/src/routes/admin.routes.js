/**
 * Admin Routes — User Ban Management
 *
 * ALL endpoints require the ADMIN_SECRET header:
 *   X-Admin-Secret: <your ADMIN_SECRET env var value>
 *
 * Set ADMIN_SECRET in your Vercel / backend environment variables.
 * Never expose this value publicly.
 *
 * Endpoints:
 *   GET    /admin/banned              → list all banned users
 *   POST   /admin/ban                 → ban a user
 *   DELETE /admin/unban/:userId       → unban a user
 */

const express = require('express');
const { z } = require('zod');
const { bannedUserDB, providerTokenDB } = require('../db/database');
const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// ─── Admin auth middleware ────────────────────────────────────────────────────
function requireAdminSecret(req, res, next) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    // If ADMIN_SECRET is not set, admin routes are disabled entirely
    return res.status(503).json({ message: 'Admin API is not configured on this server.' });
  }
  const provided = req.headers['x-admin-secret'];
  if (!provided || provided !== secret) {
    logger.warn('[Admin] Unauthorized admin access attempt', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(401).json({ message: 'Invalid or missing admin secret.' });
  }
  return next();
}

// Apply admin auth to all routes in this router
router.use(requireAdminSecret);

// ─── GET /admin/banned — list all banned users ────────────────────────────────
router.get(
  '/banned',
  asyncHandler(async (req, res) => {
    const banned = await bannedUserDB.list();
    return res.status(200).json({ banned });
  }),
);

// ─── POST /admin/ban — ban a user ────────────────────────────────────────────
const banSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required'),
  githubLogin: z.string().trim().optional(),
  reason: z.string().trim().min(3, 'reason must be at least 3 characters'),
});

router.post(
  '/ban',
  asyncHandler(async (req, res) => {
    const parsed = banSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }

    const { userId, githubLogin, reason } = parsed.data;
    const bannedBy = req.headers['x-admin-actor'] || 'admin';

    await bannedUserDB.ban({ userId, githubLogin, reason, bannedBy });

    // Also delete their stored provider token so they can't use cached credentials
    await providerTokenDB.deleteByUserId(userId);

    logger.info('[Admin] User banned', { userId, githubLogin, reason, bannedBy });

    return res.status(200).json({
      message: `User ${githubLogin || userId} has been banned.`,
      userId,
      reason,
    });
  }),
);

// ─── DELETE /admin/unban/:userId — unban a user ───────────────────────────────
router.delete(
  '/unban/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'userId param is required' });
    }

    const removed = await bannedUserDB.unban(userId);
    const bannedBy = req.headers['x-admin-actor'] || 'admin';

    if (!removed) {
      return res.status(404).json({ message: `User ${userId} was not in the ban list.` });
    }

    logger.info('[Admin] User unbanned', { userId, unbannedBy: bannedBy });

    return res.status(200).json({ message: `User ${userId} has been unbanned.`, userId });
  }),
);

module.exports = router;
