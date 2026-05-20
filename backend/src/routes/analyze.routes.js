const express = require("express");
const { z } = require("zod");

const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const ensureGitHubTokenSynced = require("../middleware/ensureGitHubTokenSynced");
const validate = require("../middleware/validate");
const { buildInitialAnalysis } = require("../services/analyze.service");
const { fetchRepository, mapRepository } = require("../services/github.service");
const asyncHandler = require("../utils/asyncHandler");
const { githubFullNameSchema, githubUrlSchema } = require("../validation/schemas");

const router = express.Router();

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const analyzeSchema = z
  .object({
    // "owner/repo" short form
    repositoryFullName: githubFullNameSchema.optional(),
    // Full GitHub URL — enforces github.com hostname (SSRF protection)
    repoUrl: githubUrlSchema.optional(),
  })
  .refine((data) => data.repositoryFullName || data.repoUrl, {
    message: "Either repositoryFullName or repoUrl must be provided.",
    path: ["repositoryFullName"],
  });


// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/",
  ensureAuthenticated,
  ensureGitHubTokenSynced,
  validate(analyzeSchema, "body"),
  asyncHandler(async (req, res) => {
    let { repositoryFullName, repoUrl } = req.body;

    if (repoUrl && !repositoryFullName) {
      try {
        const urlObj = new URL(repoUrl);
        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        if (pathParts.length >= 2) {
          repositoryFullName = `${pathParts[0]}/${pathParts[1]}`.replace(/\.git$/, "");
        } else {
          return res.status(400).json({ message: "Invalid GitHub URL format." });
        }
      } catch (err) {
        return res.status(400).json({ message: "Invalid GitHub URL format." });
      }
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
