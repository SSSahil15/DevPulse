const asyncHandler = require('../utils/asyncHandler');
const { verifyDevPulseJWT } = require('../services/githubAuth.service');
const Sentry = require('@sentry/node');

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
  // Sentry isolates scopes per-request automatically with Node AsyncLocalStorage.
  Sentry.setUser({
    id: req.user.id,
    username: req.user.username,
    email: req.user.email, // may be null if user keeps email private on GitHub
  });

  return next();
});

module.exports = ensureAuthenticated;
