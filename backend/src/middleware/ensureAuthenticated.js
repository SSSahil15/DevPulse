const asyncHandler = require("../utils/asyncHandler");
const { verifyDevPulseJWT } = require("../services/githubAuth.service");

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

const ensureAuthenticated = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      message: "Authentication required. Sign in with GitHub first.",
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


  return next();
});

module.exports = ensureAuthenticated;
