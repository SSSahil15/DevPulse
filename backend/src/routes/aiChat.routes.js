const express = require("express");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const { aiChatLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const { generateHybridChatResponse } = require("../services/aiChat.service");

const router = express.Router();

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const chatSchema = z.object({
  query: z.string()
    .trim()
    .min(1, "Query cannot be empty.")
    .max(1000, "Query too long (max 1000 chars).")
    .refine(val => !/<[^>]*>/g.test(val), "HTML tags are not allowed"),
  context: z.any().optional(),
  history: z.array(z.any()).max(20, "History is limited to 20 messages.").optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/chat
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/chat",
  aiChatLimiter,
  ensureAuthenticated,
  validate(chatSchema, "body"),
  asyncHandler(async (req, res) => {
    const { query, context, history } = req.body;

    const responsePayload = await generateHybridChatResponse(query, context, history);

    // Slight delay so the fallback engine doesn't feel instant vs LLM
    await new Promise((resolve) => setTimeout(resolve, 300));

    return res.status(200).json(responsePayload);
  })
);

module.exports = router;
