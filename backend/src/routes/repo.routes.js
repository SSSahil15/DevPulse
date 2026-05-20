const express = require("express");
const { z } = require("zod");

const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const ensureGitHubTokenSynced = require("../middleware/ensureGitHubTokenSynced");
const validate = require("../middleware/validate");
const { fetchUserRepositories } = require("../services/github.service");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

router.get(
  "/",
  ensureAuthenticated,
  ensureGitHubTokenSynced,
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    // Pagination parameters available in req.query.page and req.query.limit
    // Currently fetchUserRepositories fetches all, but we validate inputs anyway for future use
    const repositories = await fetchUserRepositories(req.githubAccessToken);

    res.status(200).json({
      count: repositories.length,
      repositories
    });
  })
);

module.exports = router;
