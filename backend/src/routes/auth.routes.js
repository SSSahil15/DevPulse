const express = require("express");
const config = require("../config/env");
const {
  exchangeCodeForGitHubToken,
  fetchGitHubUser,
  issueDevPulseJWT,
} = require("../services/githubAuth.service");
const {
  deleteGitHubProviderToken,
  getGitHubProviderTokenStatus,
  saveGitHubProviderToken,
} = require("../services/providerTokenStore.service");
const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

/**
 * Step 1: Redirect user to GitHub OAuth authorization page.
 */
router.get("/github", (req, res) => {
  const params = new URLSearchParams({
    client_id: config.githubClientId,
    redirect_uri: `${config.backendUrl}/auth/github/callback`,
    scope: "repo read:user user:email",
    prompt: "consent", // Force GitHub to ask for permission every time
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

/**
 * Step 2: GitHub redirects here with a code. Exchange it for a token,
 * issue a DevPulse JWT, and redirect back to the frontend with it.
 */
router.get(
  "/github/callback",
  asyncHandler(async (req, res) => {
    const { code, error } = req.query;

    if (error || !code) {
      return res.redirect(`${config.frontendUrl}/login?error=github_denied`);
    }

    try {
      const githubToken = await exchangeCodeForGitHubToken(code);
      const githubUser = await fetchGitHubUser(githubToken);

      // Save the GitHub token using the GitHub user ID as the key
      await saveGitHubProviderToken({
        githubViewer: {
          id: String(githubUser.id),
          login: githubUser.login,
          avatarUrl: githubUser.avatar_url,
          profileUrl: githubUser.html_url,
        },
        providerToken: githubToken,
        userId: String(githubUser.id),
      });

      const devpulseToken = issueDevPulseJWT(githubUser, githubToken);

      // Redirect to frontend with the token in the URL
      return res.redirect(
        `${config.frontendUrl}/auth/callback?token=${devpulseToken}`
      );
    } catch (err) {
      console.error("GitHub OAuth callback error:", err.message);
      return res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
    }
  })
);

/**
 * GET /auth/me — Returns current user info (used by frontend to verify session).
 */
router.get(
  "/me",
  ensureAuthenticated,
  asyncHandler(async (req, res) => {
    const githubTokenSynced = await getGitHubProviderTokenStatus(req.user.id);
    return res.status(200).json({
      authenticated: true,
      githubTokenSynced,
      user: req.user,
    });
  })
);

/**
 * DELETE /auth/provider-token — Clears stored GitHub token on logout.
 */
router.delete(
  "/provider-token",
  ensureAuthenticated,
  asyncHandler(async (req, res) => {
    await deleteGitHubProviderToken(req.user.id);
    return res.status(200).json({ message: "GitHub token removed." });
  })
);

module.exports = router;
