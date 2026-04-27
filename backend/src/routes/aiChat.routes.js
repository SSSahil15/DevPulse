const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const { generateHybridChatResponse } = require("../services/aiChat.service");

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/chat
// Accepts a user query, pipeline context, and chat history. Returns dynamic AI response.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/chat",
  ensureAuthenticated,
  asyncHandler(async (req, res) => {
    const { query, context, history } = req.body;

    if (!query) {
      return res.status(400).json({ message: "Query is required." });
    }

    // Generate response using hybrid engine (Groq LLM -> Fallback)
    const responsePayload = await generateHybridChatResponse(query, context, history);

    // Simulate slight network delay to feel like a real LLM if it fell back instantly
    await new Promise(resolve => setTimeout(resolve, 300));

    return res.status(200).json(responsePayload);
  })
);

module.exports = router;
