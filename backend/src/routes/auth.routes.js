const express = require("express");
const config  = require("../config/env");
const logger  = require("../utils/logger");
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
const asyncHandler        = require("../utils/asyncHandler");

const router = express.Router();

/**
 * Step 1: Redirect user to GitHub OAuth authorization page.
 */
router.get("/github", (req, res) => {
  const callbackUrl = `${config.backendUrl}/auth/github/callback`;

  // NOTE: clientId is logged for debugging OAuth misconfiguration — it is public.
  // The clientSecret is never logged anywhere.
  logger.info("[Auth] Starting GitHub OAuth flow", {
    requestId:   req.requestId,
    clientId:    config.githubClientId,
    redirectUri: callbackUrl,
  });

  const params = new URLSearchParams({
    client_id:    config.githubClientId,
    redirect_uri: callbackUrl,
    scope:        "repo read:user user:email",
    prompt:       "consent", // Force GitHub to ask for permission every time
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

/**
 * Step 2: GitHub redirects here with a code. Exchange it for a token,
 * issue a DevPulse JWT, and redirect back to the frontend with it.
 *
 * IMPORTANT: The `code` query param is an OAuth authorization code — a secret.
 * It is intentionally never logged. Only a "received" boolean is logged.
 */
router.get(
  "/github/callback",
  asyncHandler(async (req, res) => {
    const { error: oauthError, code } = req.query;
    const log = logger.withContext(req);

    log.info("[Auth] GitHub OAuth callback received", {
      codeReceived: !!code,   // Never log the code value itself
      oauthError:   oauthError || null,
    });

    if (oauthError || !code) {
      log.warn("[Auth] OAuth denied or code missing", {
        reason: oauthError || "no_code",
      });
      return res.redirect(`${config.frontendUrl}/login?error=github_denied`);
    }

    try {
      log.info("[Auth] Exchanging OAuth code for GitHub access token");
      const githubToken = await exchangeCodeForGitHubToken(code);
      // Token value is never logged — maskSensitive covers it as a precaution
      log.info("[Auth] GitHub access token obtained successfully");

      log.info("[Auth] Fetching GitHub user profile");
      const githubUser = await fetchGitHubUser(githubToken);
      log.info("[Auth] GitHub user profile fetched", {
        userId:   String(githubUser.id),
        username: githubUser.login,
      });

      // Store the encrypted GitHub provider token server-side
      await saveGitHubProviderToken({
        githubViewer: {
          id:        String(githubUser.id),
          login:     githubUser.login,
          avatarUrl: githubUser.avatar_url,
          profileUrl: githubUser.html_url,
        },
        providerToken: githubToken,
        userId:        String(githubUser.id),
      });

      const devpulseToken = issueDevPulseJWT(githubUser);

      log.info("[Auth] DevPulse JWT issued — redirecting to frontend", {
        userId:   String(githubUser.id),
        username: githubUser.login,
      });

      // Token is embedded in redirect URL — only the path prefix is logged
      return res.redirect(`${config.frontendUrl}/auth/callback?token=${devpulseToken}`);
    } catch (err) {
      log.error("[Auth] OAuth callback failed", {
        error:     err.message,
        requestId: req.requestId,
      });
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

    logger.withContext(req).debug("[Auth] /me called", {
      githubTokenSynced,
    });

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

    logger.withContext(req).info("[Auth] GitHub provider token deleted (logout)", {
      userId: req.user.id,
    });

    return res.status(200).json({ message: "GitHub token removed." });
  })
);

module.exports = router;
