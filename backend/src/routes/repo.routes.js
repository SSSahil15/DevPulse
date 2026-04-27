const express = require("express");

const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const ensureGitHubTokenSynced = require("../middleware/ensureGitHubTokenSynced");
const { fetchUserRepositories } = require("../services/github.service");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  ensureAuthenticated,
  ensureGitHubTokenSynced,
  asyncHandler(async (req, res) => {
    const repositories = await fetchUserRepositories(req.githubAccessToken);

    res.status(200).json({
      count: repositories.length,
      repositories
    });
  })
);

module.exports = router;
