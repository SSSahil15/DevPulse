const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { processFeedback, getFeedbackHistory } = require("../services/feedback.service");

const router = express.Router();

// POST /api/feedback
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { text, email } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Feedback text is required." });
    }

    const result = await processFeedback(text, email);

    return res.status(201).json({
      message: "Feedback submitted successfully",
      feedback: result
    });
  })
);

// GET /api/feedback - (Admin only or secure route in a real app)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const history = getFeedbackHistory();
    return res.status(200).json(history);
  })
);

module.exports = router;
