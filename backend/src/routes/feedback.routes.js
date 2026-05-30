const express = require('express');
const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { processFeedback, getFeedbackHistory } = require('../services/feedback.service');
const { safeStringSchema, emailSchema } = require('../validation/schemas');

const router = express.Router();

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const feedbackSchema = z.object({
  // Free-form feedback text — safe string blocks XSS / SQLi patterns
  text: safeStringSchema(2000, 'Feedback text'),

  // Optional category for routing/triage
  type: z.enum(['bug', 'feature', 'general', 'security']).optional().default('general'),

  // Optional contact email — validated format + length cap
  email: emailSchema.optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/feedback
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/',
  validate(feedbackSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { text, email } = req.body;

    const result = await processFeedback(text, email);

    return res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: result,
    });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/feedback — (Admin only or secure route in a real app)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const history = getFeedbackHistory();
    return res.status(200).json(history);
  }),
);

module.exports = router;
