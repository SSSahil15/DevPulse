const jwt = require("jsonwebtoken");
const axios = require("axios");
const config = require("../config/env");
const createHttpError = require("../utils/httpError");

/**
 * Exchange the GitHub OAuth code for a GitHub access token.
 */
async function exchangeCodeForGitHubToken(code) {
  const response = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: config.githubClientId,
      client_secret: config.githubClientSecret,
      code,
    },
    { headers: { Accept: "application/json" } }
  );

  const { access_token, error, error_description } = response.data;

  if (error || !access_token) {
    throw createHttpError(401, error_description || "GitHub rejected the authorization code.");
  }

  return access_token;
}

/**
 * Fetch the authenticated GitHub user's profile using their access token.
 */
async function fetchGitHubUser(accessToken) {
  const response = await axios.get("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });
  return response.data;
}

/**
 * Issue a signed DevPulse JWT containing user identity + GitHub token.
 * The GitHub token is embedded so the backend can call the GitHub API directly.
 */
function issueDevPulseJWT(githubUser, githubAccessToken) {
  const payload = {
    sub: String(githubUser.id),
    username: githubUser.login,
    displayName: githubUser.name || githubUser.login,
    avatarUrl: githubUser.avatar_url,
    profileUrl: githubUser.html_url,
    email: githubUser.email || null,
    followers: githubUser.followers || 0,
    following: githubUser.following || 0,
    publicRepos: githubUser.public_repos || 0,
    privateRepos: githubUser.total_private_repos || 0,
    githubToken: githubAccessToken,
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: "7d",
    issuer: "devpulse",
  });
}

/**
 * Verify a DevPulse JWT and return the decoded payload.
 */
function verifyDevPulseJWT(token) {
  try {
    return jwt.verify(token, config.jwtSecret, { issuer: "devpulse" });
  } catch (err) {
    throw createHttpError(401, "Invalid or expired session. Please sign in again.");
  }
}

module.exports = {
  exchangeCodeForGitHubToken,
  fetchGitHubUser,
  issueDevPulseJWT,
  verifyDevPulseJWT,
};
