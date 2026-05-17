const { providerTokenDB } = require("../db/database");
const { decryptText, encryptText } = require("../utils/crypto");

/**
 * Provider Token Store — SQLite-backed
 * Replaces the old JSON-file approach with a proper DB table.
 * All function signatures are identical to the previous implementation.
 */

async function saveGitHubProviderToken({ githubViewer, providerToken, userId }) {
  console.log("[TokenStore] Saving GitHub token for user:", userId, "login:", githubViewer.login);
  try {
    const encrypted = encryptText(providerToken);
    console.log("[TokenStore] Token encrypted successfully");
    providerTokenDB.upsert({
      userId,
      encryptedToken: encrypted,
      githubLogin: githubViewer.login,
      profileUrl: githubViewer.profileUrl,
    });
    console.log("[TokenStore] ✓ GitHub token saved successfully for user:", userId);
  } catch (err) {
    console.error("[TokenStore] ❌ Failed to save GitHub token:", err.message);
    throw err;
  }
}

async function getGitHubProviderToken(userId) {
  console.log("[TokenStore] Retrieving GitHub token for user:", userId);
  const record = providerTokenDB.getByUserId(userId);
  
  if (!record) {
    console.warn("[TokenStore] ⚠ No token record found for user:", userId);
    return null;
  }

  console.log("[TokenStore] Found token record for user:", userId);

  try {
    const decrypted = decryptText(record.encrypted_token);
    console.log("[TokenStore] ✓ Token decrypted successfully");
    return decrypted;
  } catch (err) {
    console.error("[TokenStore] ❌ Failed to decrypt token:", err.message);
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
