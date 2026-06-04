const asyncHandler = require('../utils/asyncHandler');
const { verifyDevPulseJWT } = require('../services/githubAuth.service');
const { bannedUserDB } = require('../db/database');
const Sentry = require('@sentry/node');
const logger = require('../utils/logger');

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

const ensureAuthenticated = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      message: 'Authentication required. Sign in with GitHub first.',
    });
  }

  const payload = verifyDevPulseJWT(token);

  // ── Ban check ────────────────────────────────────────────────────────────────
  // Fast PRIMARY KEY lookup — negligible overhead per request.
  const banReason = await bannedUserDB.isBanned(payload.sub);
  if (banReason) {
    logger.warn('[Auth] Banned user attempted access', {
      userId: payload.sub,
      username: payload.username,
      reason: banReason,
      path: req.path,
    });
    return res.status(403).json({
      message: 'Your account has been suspended. Contact support if you believe this is an error.',
      reason: banReason,
    });
  }

  // Attach standardised user to every authenticated request
  req.user = {
    id: payload.sub,
    username: payload.username,
    displayName: payload.displayName,
    avatarUrl: payload.avatarUrl,
    profileUrl: payload.profileUrl,
    email: payload.email,
    followers: payload.followers,
    following: payload.following,
    publicRepos: payload.publicRepos,
    privateRepos: payload.privateRepos,
  };

  // Bind user identity to the current Sentry scope so every error or
  // performance transaction captured downstream includes who triggered it.
  Sentry.setUser({
    id: req.user.id,
    username: req.user.username,
    email: req.user.email,
  });

  return next();
});

module.exports = ensureAuthenticated;
