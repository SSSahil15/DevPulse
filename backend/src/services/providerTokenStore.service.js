const crypto = require('crypto');
const { providerTokenDB } = require('../db/database');
const { decryptText, encryptText } = require('../utils/crypto');
const redis = require('./redis.service');

/**
 * Provider Token Store — PostgreSQL-backed
 * Replaces the old JSON-file approach with a proper DB table.
 * All function signatures are identical to the previous implementation.
 */

async function saveGitHubProviderToken({ githubViewer, providerToken, userId }) {
  console.log('[TokenStore] Saving GitHub token for user:', userId, 'login:', githubViewer.login);
  try {
    const encrypted = encryptText(providerToken);
    console.log('[TokenStore] Token encrypted successfully');
    await providerTokenDB.upsert({
      userId,
      encryptedToken: encrypted,
      githubLogin: githubViewer.login,
      profileUrl: githubViewer.profileUrl,
    });
    console.log('[TokenStore] ✓ GitHub token saved successfully for user:', userId);
  } catch (err) {
    console.error('[TokenStore] ❌ Failed to save GitHub token:', err.stack || err);
    throw err;
  }
}

async function getGitHubProviderToken(userId) {
  console.log('[TokenStore] Retrieving GitHub token for user:', userId);
  const record = await providerTokenDB.getByUserId(userId);

  if (!record) {
    console.warn('[TokenStore] ⚠ No token record found for user:', userId);
    return null;
  }

  // Token was wiped on ban (set to NULL) — treat as no token
  if (!record.encrypted_token) {
    console.warn('[TokenStore] ⚠ Token is null for user (banned?):', userId);
    return null;
  }

  console.log('[TokenStore] Found token record for user:', userId);

  try {
    const decrypted = decryptText(record.encrypted_token);
    console.log('[TokenStore] ✓ Token decrypted successfully');
    return decrypted;
  } catch (err) {
    console.error('[TokenStore] ❌ Failed to decrypt token:', err.message);
    return null;
  }
}


async function getGitHubProviderTokenStatus(userId) {
  const record = await providerTokenDB.getByUserId(userId);
  return Boolean(record?.encrypted_token);
}

async function deleteGitHubProviderToken(userId) {
  try {
    const token = await getGitHubProviderToken(userId);
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await redis.del(`user:repos:${tokenHash}`);
      console.log(`[TokenStore] Cleared cached repos for user: ${userId}`);
    }
  } catch (err) {
    console.error('[TokenStore] Failed to clear cached repos during token deletion:', err.message);
  }
  await providerTokenDB.deleteByUserId(userId);
}

module.exports = {
  deleteGitHubProviderToken,
  getGitHubProviderToken,
  getGitHubProviderTokenStatus,
  saveGitHubProviderToken,
};
