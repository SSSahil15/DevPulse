/**
 * providerTokenStore.service.test.js
 * ===================================
 * Tests for the GitHub provider token store service.
 * Mocks: providerTokenDB, crypto utils, redis.
 */

jest.mock("../db/database", () => ({
  providerTokenDB: {
    upsert:         jest.fn().mockResolvedValue(undefined),
    getByUserId:    jest.fn(),
    deleteByUserId: jest.fn().mockResolvedValue(undefined),
  },
  pipelineDB:      { findFiltered: jest.fn(), findFilteredWithCount: jest.fn(), findByRunId: jest.fn(), getHealth: jest.fn(), insert: jest.fn(), deleteById: jest.fn(), deleteByIds: jest.fn() },
  scanJobDB:       { create: jest.fn(), getById: jest.fn(), markProcessing: jest.fn(), markDone: jest.fn(), markFailed: jest.fn() },
  reportDB:        { insert: jest.fn(), getByToken: jest.fn(), cleanupExpired: jest.fn() },
}));

jest.mock("../utils/crypto", () => ({
  encryptText: jest.fn((text) => `enc::${text}`),
  decryptText: jest.fn((enc) => enc.replace("enc::", "")),
}));

jest.mock("../services/redis.service", () => ({
  get:        jest.fn().mockResolvedValue(null),
  set:        jest.fn().mockResolvedValue(true),
  del:        jest.fn().mockResolvedValue(true),
  delPattern: jest.fn().mockResolvedValue(true),
  isConnected: () => false,
}));

const { providerTokenDB } = require("../db/database");
const { encryptText, decryptText } = require("../utils/crypto");
const redis = require("../services/redis.service");

const {
  saveGitHubProviderToken,
  getGitHubProviderToken,
  getGitHubProviderTokenStatus,
  deleteGitHubProviderToken,
} = require("../services/providerTokenStore.service");

// ─── saveGitHubProviderToken ──────────────────────────────────────────────────
describe("saveGitHubProviderToken()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("encrypts the token before storing", async () => {
    await saveGitHubProviderToken({
      githubViewer: { login: "octocat", profileUrl: "https://github.com/octocat" },
      providerToken: "ghp_secret",
      userId: "123",
    });

    expect(encryptText).toHaveBeenCalledWith("ghp_secret");
    expect(providerTokenDB.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ encryptedToken: "enc::ghp_secret" })
    );
  });

  it("calls upsert with userId, login, and profileUrl", async () => {
    await saveGitHubProviderToken({
      githubViewer: { login: "octocat", profileUrl: "https://p.url" },
      providerToken: "token",
      userId: "user-1",
    });

    expect(providerTokenDB.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        githubLogin: "octocat",
        profileUrl: "https://p.url",
      })
    );
  });

  it("rethrows if upsert fails", async () => {
    providerTokenDB.upsert.mockRejectedValueOnce(new Error("DB error"));

    await expect(
      saveGitHubProviderToken({
        githubViewer: { login: "x" }, providerToken: "t", userId: "1",
      })
    ).rejects.toThrow("DB error");
  });
});

// ─── getGitHubProviderToken ───────────────────────────────────────────────────
describe("getGitHubProviderToken()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns null when no record found for userId", async () => {
    providerTokenDB.getByUserId.mockResolvedValue(null);

    const result = await getGitHubProviderToken("unknown-user");
    expect(result).toBeNull();
  });

  it("decrypts and returns the token when found", async () => {
    providerTokenDB.getByUserId.mockResolvedValue({
      user_id: "123",
      encrypted_token: "enc::ghp_real_token",
    });

    const result = await getGitHubProviderToken("123");

    expect(decryptText).toHaveBeenCalledWith("enc::ghp_real_token");
    expect(result).toBe("ghp_real_token");
  });

  it("returns null if decryption fails (graceful degradation)", async () => {
    providerTokenDB.getByUserId.mockResolvedValue({
      user_id: "123",
      encrypted_token: "corrupted-ciphertext",
    });
    decryptText.mockImplementationOnce(() => { throw new Error("decryption failed"); });

    const result = await getGitHubProviderToken("123");
    expect(result).toBeNull();
  });
});

// ─── getGitHubProviderTokenStatus ────────────────────────────────────────────
describe("getGitHubProviderTokenStatus()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns false when no record exists", async () => {
    providerTokenDB.getByUserId.mockResolvedValue(null);
    const result = await getGitHubProviderTokenStatus("999");
    expect(result).toBe(false);
  });

  it("returns true when encrypted_token is present", async () => {
    providerTokenDB.getByUserId.mockResolvedValue({ encrypted_token: "enc::tok" });
    const result = await getGitHubProviderTokenStatus("123");
    expect(result).toBe(true);
  });

  it("returns false when encrypted_token is null/undefined", async () => {
    providerTokenDB.getByUserId.mockResolvedValue({ encrypted_token: null });
    const result = await getGitHubProviderTokenStatus("123");
    expect(result).toBe(false);
  });
});

// ─── deleteGitHubProviderToken ────────────────────────────────────────────────
describe("deleteGitHubProviderToken()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls providerTokenDB.deleteByUserId", async () => {
    providerTokenDB.getByUserId.mockResolvedValue({ encrypted_token: "enc::tok" });
    await deleteGitHubProviderToken("123");
    expect(providerTokenDB.deleteByUserId).toHaveBeenCalledWith("123");
  });

  it("invalidates the redis cache key for the user's repos", async () => {
    providerTokenDB.getByUserId.mockResolvedValue({ encrypted_token: "enc::tok" });
    await deleteGitHubProviderToken("123");
    // redis.del should be called with the repo cache key
    expect(redis.del).toHaveBeenCalledWith(expect.stringMatching(/^user:repos:/));
  });

  it("still calls deleteByUserId even when token lookup returns null", async () => {
    providerTokenDB.getByUserId.mockResolvedValue(null);
    await deleteGitHubProviderToken("no-token-user");
    expect(providerTokenDB.deleteByUserId).toHaveBeenCalledWith("no-token-user");
  });

  it("still calls deleteByUserId even when decryption throws", async () => {
    providerTokenDB.getByUserId.mockResolvedValue({ encrypted_token: "bad" });
    decryptText.mockImplementationOnce(() => { throw new Error("decrypt error"); });

    await deleteGitHubProviderToken("123");
    // deleteByUserId must still be called despite the decryption error
    expect(providerTokenDB.deleteByUserId).toHaveBeenCalledWith("123");
  });
});
