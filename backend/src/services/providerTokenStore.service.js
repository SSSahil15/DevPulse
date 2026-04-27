const fs = require("fs/promises");
const path = require("path");

const config = require("../config/env");
const { decryptText, encryptText } = require("../utils/crypto");

const tokenStoreFilePath = path.resolve(
  __dirname,
  "../../",
  config.githubTokenStoreFilePath
);

let writeQueue = Promise.resolve();

async function ensureTokenStoreFile() {
  await fs.mkdir(path.dirname(tokenStoreFilePath), { recursive: true });

  try {
    await fs.access(tokenStoreFilePath);
  } catch (error) {
    await fs.writeFile(tokenStoreFilePath, JSON.stringify({}, null, 2));
  }
}

async function readStore() {
  await ensureTokenStoreFile();
  const rawStore = await fs.readFile(tokenStoreFilePath, "utf8");

  try {
    return JSON.parse(rawStore);
  } catch (error) {
    return {};
  }
}

function queueWrite(nextStore) {
  writeQueue = writeQueue.then(async () => {
    await ensureTokenStoreFile();
    await fs.writeFile(tokenStoreFilePath, JSON.stringify(nextStore, null, 2));
  });

  return writeQueue;
}

async function saveGitHubProviderToken({ githubViewer, providerToken, userId }) {
  const currentStore = await readStore();

  currentStore[userId] = {
    encryptedProviderToken: encryptText(providerToken),
    githubId: githubViewer.id,
    githubLogin: githubViewer.login,
    profileUrl: githubViewer.profileUrl,
    syncedAt: new Date().toISOString()
  };

  await queueWrite(currentStore);
}

async function getGitHubProviderToken(userId) {
  const currentStore = await readStore();
  const record = currentStore[userId];

  if (!record?.encryptedProviderToken) {
    return null;
  }

  try {
    return decryptText(record.encryptedProviderToken);
  } catch (error) {
    return null;
  }
}

async function getGitHubProviderTokenStatus(userId) {
  const currentStore = await readStore();
  return Boolean(currentStore[userId]?.encryptedProviderToken);
}

async function deleteGitHubProviderToken(userId) {
  const currentStore = await readStore();

  if (!currentStore[userId]) {
    return;
  }

  delete currentStore[userId];
  await queueWrite(currentStore);
}

module.exports = {
  deleteGitHubProviderToken,
  getGitHubProviderToken,
  getGitHubProviderTokenStatus,
  saveGitHubProviderToken
};

