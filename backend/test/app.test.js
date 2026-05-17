const fs = require("fs/promises");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const databasePath = path.resolve(__dirname, "../.data/test-devpulse.sqlite");

process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.BACKEND_URL = "http://localhost:4000";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.TOKEN_ENCRYPTION_SECRET = "abcdefghijklmnopqrstuvwxyz123456";
process.env.JWT_SECRET = "abcdefghijklmnopqrstuvwxyz1234567890";
process.env.GITHUB_CLIENT_ID = "test-client-id";
process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
process.env.DATABASE_PATH = databasePath;

const { decryptText, encryptText } = require("../src/utils/crypto");
const { getNextPageUrl } = require("../src/services/github.service");
const { issueDevPulseJWT, verifyDevPulseJWT } = require("../src/services/githubAuth.service");
const {
  deleteGitHubProviderToken,
  getGitHubProviderToken,
  getGitHubProviderTokenStatus,
  saveGitHubProviderToken
} = require("../src/services/providerTokenStore.service");
const { db, pipelineDB } = require("../src/db/database");

test.beforeEach(async () => {
  db.prepare("DELETE FROM provider_tokens").run();
  db.prepare("DELETE FROM pipeline_results").run();
});

test.after(async () => {
  db.close();
  await fs.rm(databasePath, { force: true });
  await fs.rm(`${databasePath}-shm`, { force: true });
  await fs.rm(`${databasePath}-wal`, { force: true });
});

test("encryptText and decryptText round-trip GitHub tokens safely", () => {
  const encrypted = encryptText("ghp_example_token");
  const decrypted = decryptText(encrypted);

  assert.notEqual(encrypted, "ghp_example_token");
  assert.equal(decrypted, "ghp_example_token");
});

test("DevPulse JWTs preserve GitHub user identity metadata", () => {
  const token = issueDevPulseJWT({
    id: 1,
    login: "octocat",
    name: "The Octocat",
    avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
    html_url: "https://github.com/octocat",
    email: "octocat@example.com",
    followers: 10,
    following: 3,
    public_repos: 8,
    total_private_repos: 2,
  });

  const payload = verifyDevPulseJWT(token);

  assert.equal(payload.sub, "1");
  assert.equal(payload.username, "octocat");
  assert.equal(payload.displayName, "The Octocat");
  assert.equal(payload.profileUrl, "https://github.com/octocat");
  assert.equal(payload.privateRepos, 2);
});

test("provider token store saves, reads, reports status, and deletes tokens", async () => {
  await saveGitHubProviderToken({
    githubViewer: {
      id: 1,
      login: "octocat",
      profileUrl: "https://github.com/octocat"
    },
    providerToken: "ghp_provider_token",
    userId: "github-user-1"
  });

  assert.equal(await getGitHubProviderTokenStatus("github-user-1"), true);
  assert.equal(await getGitHubProviderToken("github-user-1"), "ghp_provider_token");

  await deleteGitHubProviderToken("github-user-1");

  assert.equal(await getGitHubProviderTokenStatus("github-user-1"), false);
  assert.equal(await getGitHubProviderToken("github-user-1"), null);
});

test("pipeline history keeps previous scans when a new scan is inserted", () => {
  const baseRecord = {
    repository: "octocat/devpulse",
    commitSha: "abc123",
    commitMessage: "Simulated commit",
    branch: "main",
    triggeredBy: "DevPulse Simulator",
    runUrl: null,
    event: "push",
    overallStatus: "success",
    stages: {
      backend: { tests: "success" },
      frontend: { build: "success", tests: "success" },
      docker: { build: "success", imageSize: "450MB", imageVulnerabilities: 0 },
      security: { critical: 0, high: 0, medium: 0, vulnerabilities: [] },
    },
    insights: { explanation: "Healthy run", suggestions: [] },
  };

  pipelineDB.insert({
    ...baseRecord,
    id: "history-1",
    runId: "run-1",
    timestamp: "2026-05-17T10:00:00.000Z",
    receivedAt: "2026-05-17T10:00:00.000Z",
    devpulseScore: { score: 82, status: "SAFE" },
  });

  pipelineDB.insert({
    ...baseRecord,
    id: "history-2",
    runId: "run-2",
    timestamp: "2026-05-17T10:05:00.000Z",
    receivedAt: "2026-05-17T10:05:00.000Z",
    devpulseScore: { score: 85, status: "SAFE" },
  });

  const history = pipelineDB.findFiltered({ repository: "octocat/devpulse", limit: 10 });

  assert.equal(history.length, 2);
  assert.deepEqual(history.map((record) => record.id), ["history-2", "history-1"]);
});

test("getNextPageUrl extracts the next GitHub pagination link", () => {
  const linkHeader =
    '<https://api.github.com/user/repos?page=2>; rel="next", <https://api.github.com/user/repos?page=4>; rel="last"';

  assert.equal(
    getNextPageUrl(linkHeader),
    "https://api.github.com/user/repos?page=2"
  );
});

test("getNextPageUrl returns null when no next page exists", () => {
  const linkHeader =
    '<https://api.github.com/user/repos?page=1>; rel="prev", <https://api.github.com/user/repos?page=4>; rel="last"';

  assert.equal(getNextPageUrl(linkHeader), null);
});
