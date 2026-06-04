const express = require('express');
const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const ensureAuthenticated = require('../middleware/ensureAuthenticated');
const { aiChatLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { generateHybridChatResponse } = require('../services/aiChat.service');
const { safeStringSchema } = require('../validation/schemas');

const router = express.Router();

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const chatSchema = z.object({
  // safeStringSchema trims, blocks null bytes, HTML tags, and SQL injection
  // patterns — covers XSS and injection in a single place.
  query: safeStringSchema(1000, 'Query'),

  // context is arbitrary structured data passed back from the frontend;
  // we accept it as-is but cap its serialised size to prevent DoS.
  context: z
    .any()
    .optional()
    .refine(
      (val) => {
        if (val === undefined || val === null) return true;
        try {
          return JSON.stringify(val).length <= 64000;
        } catch {
          return false;
        }
      },
      { message: 'context payload is too large (max 64 KB).' },
    ),

  // History window — cap at 20 messages to limit token consumption.
  history: z.array(z.any()).max(20, 'History is limited to 20 messages.').optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/chat
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/chat',
  aiChatLimiter,
  ensureAuthenticated,
  validate(chatSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { query, context, history } = req.body;

    const responsePayload = await generateHybridChatResponse(query, context, history);

    // Slight delay so the fallback engine doesn't feel instant vs LLM
    await new Promise((resolve) => setTimeout(resolve, 300));

    return res.status(200).json(responsePayload);
  }),
);

module.exports = router;
