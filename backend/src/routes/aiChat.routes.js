const express = require("express");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const { aiChatLimiter } = require("../middleware/rateLimiter");
const { generateHybridChatResponse } = require("../services/aiChat.service");

const router = express.Router();

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const chatSchema = z.object({
  query: z.string().min(1, "Query cannot be empty.").max(500, "Query too long (max 500 chars)."),
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
  asyncHandler(async (req, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { query, context, history } = parsed.data;

    const responsePayload = await generateHybridChatResponse(query, context, history);

    // Slight delay so the fallback engine doesn't feel instant vs LLM
    await new Promise((resolve) => setTimeout(resolve, 300));

    return res.status(200).json(responsePayload);
  })
);

module.exports = router;
