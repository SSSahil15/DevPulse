const express = require("express");

const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const ensureGitHubTokenSynced = require("../middleware/ensureGitHubTokenSynced");
const { buildInitialAnalysis } = require("../services/analyze.service");
const { fetchRepository, mapRepository } = require("../services/github.service");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.post(
  "/",
  ensureAuthenticated,
  ensureGitHubTokenSynced,
  asyncHandler(async (req, res) => {
    const { repositoryFullName } = req.body;

    if (!repositoryFullName || !repositoryFullName.includes("/")) {
      return res.status(400).json({
        message:
          "repositoryFullName is required and must look like 'owner/repository'."
      });
    }

    const repository = await fetchRepository(req.githubAccessToken, repositoryFullName);
    const mappedRepository = mapRepository(repository);
    const analysis = await buildInitialAnalysis(mappedRepository, req.githubAccessToken);

    return res.status(200).json({
      analysis,
      repository: mappedRepository
    });
  })
);

module.exports = router;
