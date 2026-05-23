/**
 * scanJob.service.test.js
 * =======================
 * Tests for createAndDispatchJob and getJobStatus.
 * All heavy dependencies mocked: DB, security scan, GitHub service, redis.
 */

jest.mock("../db/database", () => ({
  scanJobDB: {
    create:         jest.fn().mockResolvedValue(undefined),
    getById:        jest.fn(),
    markProcessing: jest.fn().mockResolvedValue(undefined),
    markDone:       jest.fn().mockResolvedValue(undefined),
    markFailed:     jest.fn().mockResolvedValue(undefined),
  },
  pipelineDB: {
    insert:                jest.fn().mockResolvedValue(undefined),
    findFiltered:          jest.fn().mockResolvedValue([]),
    findFilteredWithCount: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    findByRunId:           jest.fn(),
    getHealth:             jest.fn(),
    deleteById:            jest.fn(),
    deleteByIds:           jest.fn(),
  },
  reportDB:        { insert: jest.fn(), getByToken: jest.fn(), cleanupExpired: jest.fn() },
  providerTokenDB: { upsert: jest.fn(), getByUserId: jest.fn(), deleteByUserId: jest.fn() },
}));

jest.mock("../services/security.service", () => ({
  runTrivyScan: jest.fn().mockResolvedValue({
    status:        "completed",
    severityScore: 0,
    summary:       { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
    vulnerabilities: [],
  }),
}));

jest.mock("../services/github.service", () => ({
  fetchRepoHealth: jest.fn().mockResolvedValue({
    commitActivity: { totalCommits: 5, commitsPerWeek: 1.2, codeChurn: 200, totalAdditions: 150, totalDeletions: 50, periodDays: 30 },
    contributors:   { count: 2, contributors: [] },
  }),
}));

jest.mock("../services/redis.service", () => ({
  get:        jest.fn().mockResolvedValue(null),
  set:        jest.fn().mockResolvedValue(true),
  del:        jest.fn().mockResolvedValue(true),
  delPattern: jest.fn().mockResolvedValue(true),
  isConnected: () => false,
}));

// devpulseScore.service uses real logic — no mock needed
// It calculates scores from stages + repoHealth

const { scanJobDB, pipelineDB } = require("../db/database");
const { createAndDispatchJob, getJobStatus } = require("../services/scanJob.service");

// ─── createAndDispatchJob ─────────────────────────────────────────────────────
describe("createAndDispatchJob()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns a jobId string immediately (does not await the scan)", async () => {
    const jobId = await createAndDispatchJob("owner/repo", "ghp_token");
    expect(typeof jobId).toBe("string");
  });

  it("jobId matches the expected format: job_<16 hex chars>", async () => {
    const jobId = await createAndDispatchJob("owner/repo", "ghp_token");
    expect(jobId).toMatch(/^job_[0-9a-f]{16}$/);
  });

  it("calls scanJobDB.create with the generated jobId and repository", async () => {
    const jobId = await createAndDispatchJob("owner/repo", "ghp_token");
    expect(scanJobDB.create).toHaveBeenCalledWith(jobId, "owner/repo");
  });

  it("produces a unique jobId on each call", async () => {
    const id1 = await createAndDispatchJob("owner/repo", "ghp_token");
    const id2 = await createAndDispatchJob("owner/repo", "ghp_token");
    expect(id1).not.toBe(id2);
  });

  it("background job eventually calls pipelineDB.insert and markDone", async () => {
    // Allow the background _processJob to complete
    await createAndDispatchJob("owner/repo", "ghp_token");

    // Wait for the fire-and-forget background work to settle
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(pipelineDB.insert).toHaveBeenCalled();
    expect(scanJobDB.markDone).toHaveBeenCalled();
  });

  it("calls markFailed when background scan throws", async () => {
    const { runTrivyScan } = require("../services/security.service");
    runTrivyScan.mockRejectedValueOnce(new Error("trivy crashed"));

    await createAndDispatchJob("owner/repo", "ghp_token");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(scanJobDB.markFailed).toHaveBeenCalled();
  });
});

// ─── getJobStatus ─────────────────────────────────────────────────────────────
describe("getJobStatus()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns null when job is not found", async () => {
    scanJobDB.getById.mockResolvedValue(null);
    const result = await getJobStatus("job_nonexistent");
    expect(result).toBeNull();
  });

  it("returns the job record when found", async () => {
    scanJobDB.getById.mockResolvedValue({
      id: "job_abc1234567890123", repository: "owner/repo",
      status: "done", createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), result: { score: 85 },
    });

    const result = await getJobStatus("job_abc1234567890123");
    expect(result.status).toBe("done");
    expect(result.result.score).toBe(85);
  });

  it("passes lite=false by default (full result included)", async () => {
    scanJobDB.getById.mockResolvedValue(null);
    await getJobStatus("job_abc");
    expect(scanJobDB.getById).toHaveBeenCalledWith("job_abc", { lite: false });
  });

  it("passes lite=true when option is set", async () => {
    scanJobDB.getById.mockResolvedValue(null);
    await getJobStatus("job_abc", { lite: true });
    expect(scanJobDB.getById).toHaveBeenCalledWith("job_abc", { lite: true });
  });

  it("reflects 'pending' status before processing starts", async () => {
    scanJobDB.getById.mockResolvedValue({
      id: "job_pending", repository: "owner/repo", status: "pending",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      result: null,
    });

    const result = await getJobStatus("job_pending");
    expect(result.status).toBe("pending");
  });

  it("reflects 'processing' status while scan runs", async () => {
    scanJobDB.getById.mockResolvedValue({
      id: "job_running", repository: "owner/repo", status: "processing",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      result: null,
    });

    const result = await getJobStatus("job_running");
    expect(result.status).toBe("processing");
  });

  it("reflects 'failed' status with error message", async () => {
    scanJobDB.getById.mockResolvedValue({
      id: "job_fail", repository: "owner/repo", status: "failed",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      result: null, error: "trivy not found",
    });

    const result = await getJobStatus("job_fail");
    expect(result.status).toBe("failed");
    expect(result.error).toBe("trivy not found");
  });
});
