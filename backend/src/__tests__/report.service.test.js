/**
 * report.service.test.js
 * ======================
 * Unit tests for createReport and getReportByToken.
 * The database (reportDB) is mocked so no real PostgreSQL connection needed.
 */

jest.mock("../db/database", () => ({
  reportDB: {
    insert:       jest.fn().mockResolvedValue(undefined),
    getByToken:   jest.fn(),
    cleanupExpired: jest.fn(),
  },
  pipelineDB:      { findFiltered: jest.fn(), findFilteredWithCount: jest.fn(), findByRunId: jest.fn(), getHealth: jest.fn(), insert: jest.fn(), deleteById: jest.fn(), deleteByIds: jest.fn() },
  scanJobDB:       { create: jest.fn(), getById: jest.fn(), markProcessing: jest.fn(), markDone: jest.fn(), markFailed: jest.fn() },
  providerTokenDB: { upsert: jest.fn(), getByUserId: jest.fn(), deleteByUserId: jest.fn() },
}));

const { reportDB } = require("../db/database");
const { createReport, getReportByToken } = require("../services/report.service");

// ─── Fixture ──────────────────────────────────────────────────────────────────
const baseReport = {
  repository:    "octocat/hello-world",
  repoMeta:      { description: "Sample", language: "JS", stargazersCount: 100, forksCount: 10, defaultBranch: "main", htmlUrl: "https://github.com/x" },
  devpulseScore: { score: 85, status: "SAFE" },
  stages:        { backend: { tests: "success" } },
  insights:      { score: 85, status: "SAFE", issues: [] },
  createdBy:     "testuser",
};

// ─── createReport ─────────────────────────────────────────────────────────────
describe("createReport()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls reportDB.insert exactly once", async () => {
    await createReport(baseReport);
    expect(reportDB.insert).toHaveBeenCalledTimes(1);
  });

  it("returns an object with a token, repository, and expiry", async () => {
    const result = await createReport(baseReport);

    expect(result).toHaveProperty("token");
    expect(result).toHaveProperty("repository", "octocat/hello-world");
    expect(result).toHaveProperty("expiresAt");
    expect(result).toHaveProperty("createdAt");
  });

  it("token starts with 'dp_rpt_' (expected prefix)", async () => {
    const result = await createReport(baseReport);
    expect(result.token).toMatch(/^dp_rpt_/);
  });

  it("token is cryptographically random — two calls produce different tokens", async () => {
    const r1 = await createReport(baseReport);
    const r2 = await createReport(baseReport);
    expect(r1.token).not.toBe(r2.token);
  });

  it("expiresAt is approximately 7 days in the future", async () => {
    const before = Date.now();
    const result = await createReport(baseReport);
    const after  = Date.now();

    const expiry  = new Date(result.expiresAt).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    expect(expiry).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(expiry).toBeLessThanOrEqual(after  + sevenDays + 1000);
  });

  it("defaults createdBy to 'anonymous' when not provided", async () => {
    const result = await createReport({ ...baseReport, createdBy: undefined });
    expect(result.createdBy).toBe("anonymous");
  });

  it("passes repoMeta fields through to the insert call", async () => {
    await createReport(baseReport);
    const insertArg = reportDB.insert.mock.calls[0][0];
    expect(insertArg.repoMeta.language).toBe("JS");
    expect(insertArg.repoMeta.stargazersCount).toBe(100);
  });

  it("fills missing repoMeta fields with safe defaults", async () => {
    const result = await createReport({ ...baseReport, repoMeta: null });
    expect(result.repoMeta.stargazersCount).toBe(0);
    expect(result.repoMeta.forksCount).toBe(0);
    expect(result.repoMeta.defaultBranch).toBe("main");
  });
});

// ─── getReportByToken ─────────────────────────────────────────────────────────
describe("getReportByToken()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns null when token not found", async () => {
    reportDB.getByToken.mockResolvedValue(null);

    const result = await getReportByToken("dp_rpt_nonexistent");
    expect(result).toBeNull();
  });

  it("returns the report when found and not expired", async () => {
    const futureExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    reportDB.getByToken.mockResolvedValue({
      token: "dp_rpt_abc",
      repository: "octocat/hello-world",
      expiresAt: futureExpiry,
    });

    const result = await getReportByToken("dp_rpt_abc");

    expect(result).not.toBeNull();
    expect(result.repository).toBe("octocat/hello-world");
    expect(result).not.toHaveProperty("expired");
  });

  it("returns { expired: true } when report TTL has passed", async () => {
    const pastExpiry = new Date(Date.now() - 1000).toISOString(); // 1 second ago
    reportDB.getByToken.mockResolvedValue({
      token: "dp_rpt_old",
      repository: "octocat/hello-world",
      expiresAt: pastExpiry,
    });

    const result = await getReportByToken("dp_rpt_old");

    expect(result.expired).toBe(true);
    expect(result.repository).toBe("octocat/hello-world");
    expect(result.expiresAt).toBe(pastExpiry);
  });

  it("calls reportDB.getByToken with the provided token", async () => {
    reportDB.getByToken.mockResolvedValue(null);
    await getReportByToken("dp_rpt_test123");
    expect(reportDB.getByToken).toHaveBeenCalledWith("dp_rpt_test123");
  });
});
