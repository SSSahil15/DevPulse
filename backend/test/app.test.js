const fs = require("fs/promises");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.BACKEND_URL = "http://localhost:4000";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.SUPABASE_URL = "https://example-project.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dummy_key";
process.env.TOKEN_ENCRYPTION_SECRET = "abcdefghijklmnopqrstuvwxyz123456";
process.env.GITHUB_TOKEN_STORE_FILE_PATH = "./.data/test-github-provider-tokens.json";

const { decryptText, encryptText } = require("../src/utils/crypto");
const { getNextPageUrl } = require("../src/services/github.service");
const {
  extractBearerToken,
  sanitizeSupabaseUser
} = require("../src/services/supabaseAuth.service");
const {
  deleteGitHubProviderToken,
  getGitHubProviderToken,
  getGitHubProviderTokenStatus,
  saveGitHubProviderToken
} = require("../src/services/providerTokenStore.service");

const tokenStorePath = path.resolve(
  __dirname,
  "../.data/test-github-provider-tokens.json"
);

test.beforeEach(async () => {
  await fs.mkdir(path.dirname(tokenStorePath), { recursive: true });
  await fs.writeFile(tokenStorePath, JSON.stringify({}, null, 2));
});

test.after(async () => {
  try {
    await fs.unlink(tokenStorePath);
  } catch (error) {
    // Ignore cleanup failures when the file does not exist.
  }
});

test("extractBearerToken parses a standard Authorization header", () => {
  assert.equal(extractBearerToken("Bearer abc123"), "abc123");
});

test("extractBearerToken rejects malformed headers", () => {
  assert.equal(extractBearerToken("Token abc123"), null);
  assert.equal(extractBearerToken("Bearer"), null);
  assert.equal(extractBearerToken(""), null);
});

test("sanitizeSupabaseUser returns dashboard-friendly user data", () => {
  const user = sanitizeSupabaseUser({
    app_metadata: {
      provider: "github"
    },
    email: "octocat@example.com",
    id: "user-123",
    user_metadata: {
      avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
      full_name: "The Octocat",
      user_name: "octocat"
    }
  });

  assert.equal(user.id, "user-123");
  assert.equal(user.provider, "github");
  assert.equal(user.username, "octocat");
  assert.equal(user.displayName, "The Octocat");
});

test("encryptText and decryptText round-trip GitHub tokens safely", () => {
  const encrypted = encryptText("ghp_example_token");
  const decrypted = decryptText(encrypted);

  assert.notEqual(encrypted, "ghp_example_token");
  assert.equal(decrypted, "ghp_example_token");
});

test("provider token store saves, reads, reports status, and deletes tokens", async () => {
  await saveGitHubProviderToken({
    githubViewer: {
      id: 1,
      login: "octocat",
      profileUrl: "https://github.com/octocat"
    },
    providerToken: "ghp_provider_token",
    userId: "supabase-user-1"
  });

  assert.equal(await getGitHubProviderTokenStatus("supabase-user-1"), true);
  assert.equal(await getGitHubProviderToken("supabase-user-1"), "ghp_provider_token");

  await deleteGitHubProviderToken("supabase-user-1");

  assert.equal(await getGitHubProviderTokenStatus("supabase-user-1"), false);
  assert.equal(await getGitHubProviderToken("supabase-user-1"), null);
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
