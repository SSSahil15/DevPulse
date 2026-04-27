const asyncHandler = require("../utils/asyncHandler");
const { getGitHubProviderToken } = require("../services/providerTokenStore.service");
const ensureGitHubTokenSynced = asyncHandler(async (req, res, next) => {
  const githubAccessToken = await getGitHubProviderToken(req.user.id);
  if (!githubAccessToken) {
    return res.status(409).json({
      message:
        "Your GitHub provider token has not been synced to the backend yet. Sign in again to refresh it."
    });
  }

  req.githubAccessToken = githubAccessToken;
  return next();
});

module.exports = ensureGitHubTokenSynced;

