const { providerTokenDB } = require("../db/database");
const { decryptText, encryptText } = require("../utils/crypto");

/**
 * Provider Token Store — SQLite-backed
 * Replaces the old JSON-file approach with a proper DB table.
 * All function signatures are identical to the previous implementation.
 */

async function saveGitHubProviderToken({ githubViewer, providerToken, userId }) {
  providerTokenDB.upsert({
    userId,
    encryptedToken: encryptText(providerToken),
    githubLogin: githubViewer.login,
    profileUrl: githubViewer.profileUrl,
  });
}

async function getGitHubProviderToken(userId) {
  const record = providerTokenDB.getByUserId(userId);
  if (!record?.encrypted_token) return null;

  try {
    return decryptText(record.encrypted_token);
  } catch {
    return null;
  }
}

async function getGitHubProviderTokenStatus(userId) {
  const record = providerTokenDB.getByUserId(userId);
  return Boolean(record?.encrypted_token);
}

async function deleteGitHubProviderToken(userId) {
  providerTokenDB.deleteByUserId(userId);
}

module.exports = {
  deleteGitHubProviderToken,
  getGitHubProviderToken,
  getGitHubProviderTokenStatus,
  saveGitHubProviderToken,
};
