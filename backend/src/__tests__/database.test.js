/**
 * database.test.js
 * ================
 * Unit tests for all database helper namespaces in src/db/database.js.
 *
 * Strategy: mock the pg pool so no real Postgres connection is needed.
 * Each method call is exercised by controlling pool.query return values.
 *
 * NOTE: database.js skips migration + cleanup interval in NODE_ENV=test,
 * so no timers or real connections are created.
 */

// ─── Mock postgres module BEFORE requiring database ───────────────────────────
const mockQuery = jest.fn();
const mockEnd   = jest.fn().mockResolvedValue(undefined);

jest.mock("../db/postgres", () => ({
  pool: {
    query:        mockQuery,
    end:          mockEnd,
    totalCount:   2,
    idleCount:    1,
    waitingCount: 0,
  },
  migrate: jest.fn().mockResolvedValue(undefined),
}));

const { pipelineDB, scanJobDB, reportDB, providerTokenDB, db } =
  require("../db/database");

// ─── Helpers ─────────────────────────────────────────────────────────────────
const makePipelineRow = (overrides = {}) => ({
  id:             "uuid-1",
  repository:     "octocat/hello-world",
  commit_sha:     "a".repeat(40),
  commit_message: "feat: add feature",
  branch:         "main",
  triggered_by:   "push",
  run_id:         "987654321",
  run_url:        null,
  event:          "push",
  timestamp:      new Date().toISOString(),
  received_at:    new Date().toISOString(),
  overall_status: "success",
  stages:         { backend: { tests: "success" } },
  devpulse_score: { score: 90, status: "excellent" },
  insights:       { score: 90, issues: [] },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  // Default: any query returns empty rows
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ─── pipelineDB.insert ────────────────────────────────────────────────────────
describe("pipelineDB.insert()", () => {
  it("calls pool.query with the correct number of params", async () => {
    const record = {
      id: "uuid-1", repository: "octocat/hello-world", commitSha: "a".repeat(40),
      commitMessage: "msg", branch: "main", triggeredBy: "push", runId: "123",
      runUrl: null, event: "push", timestamp: new Date().toISOString(),
      receivedAt: new Date().toISOString(), overallStatus: "success",
      stages: {}, devpulseScore: {}, insights: {},
    };

    await pipelineDB.insert(record);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO pipeline_results/i);
    expect(params).toHaveLength(15);
  });
});

// ─── pipelineDB.findFiltered ──────────────────────────────────────────────────
describe("pipelineDB.findFiltered()", () => {
  it("returns parsed rows when pool returns data", async () => {
    const row = makePipelineRow();
    mockQuery.mockResolvedValue({ rows: [row] });

    const results = await pipelineDB.findFiltered({ repository: "octocat/hello-world" });

    expect(results).toHaveLength(1);
    expect(results[0].commitSha).toBe("a".repeat(40));   // camelCased
    expect(results[0].overallStatus).toBe("success");
  });

  it("returns empty array when no rows match", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const results = await pipelineDB.findFiltered({});
    expect(results).toHaveLength(0);
  });

  it("uses repo+branch filter SQL when both provided", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await pipelineDB.findFiltered({ repository: "owner/repo", branch: "feat" });

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/AND branch/i);
  });

  it("uses repo-only filter SQL when only repository provided", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await pipelineDB.findFiltered({ repository: "owner/repo" });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).not.toMatch(/AND branch/i);
    expect(params[0]).toBe("owner/repo");
  });

  it("caps limit at 100", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await pipelineDB.findFiltered({ limit: 999 });

    const [, params] = mockQuery.mock.calls[0];
    // limit is first or second param depending on filter
    const limitParam = params[params.length - 2];
    expect(limitParam).toBeLessThanOrEqual(100);
  });

  it("floor-caps offset at 0 for negative values", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await pipelineDB.findFiltered({ offset: -50 });

    const [, params] = mockQuery.mock.calls[0];
    const offsetParam = params[params.length - 1];
    expect(offsetParam).toBe(0);
  });
});

// ─── pipelineDB.findFilteredWithCount ────────────────────────────────────────
describe("pipelineDB.findFilteredWithCount()", () => {
  it("returns { rows, total } with correct count", async () => {
    const row = { ...makePipelineRow(), _total_count: "5" };
    mockQuery.mockResolvedValue({ rows: [row] });

    const { rows, total } = await pipelineDB.findFilteredWithCount({ repository: "owner/repo" });

    expect(rows).toHaveLength(1);
    expect(total).toBe(5);
  });

  it("returns total=0 when no rows", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const { rows, total } = await pipelineDB.findFilteredWithCount({});
    expect(rows).toHaveLength(0);
    expect(total).toBe(0);
  });

  it("strips _total_count from individual row objects", async () => {
    const row = { ...makePipelineRow(), _total_count: "10" };
    mockQuery.mockResolvedValue({ rows: [row] });

    const { rows } = await pipelineDB.findFilteredWithCount({});
    expect(rows[0]).not.toHaveProperty("_total_count");
  });

  it("uses COUNT(*) OVER () window function in SQL", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await pipelineDB.findFilteredWithCount({});

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/COUNT\(\*\) OVER/i);
  });

  it("uses repo+branch WHERE clause when both provided", async () => {
    const row = { ...makePipelineRow(), _total_count: "3" };
    mockQuery.mockResolvedValue({ rows: [row] });

    const { total } = await pipelineDB.findFilteredWithCount({
      repository: "owner/repo", branch: "main",
    });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/AND branch/i);
    expect(params[0]).toBe("owner/repo");
    expect(params[1]).toBe("main");
    expect(total).toBe(3);
  });
});

// ─── pipelineDB.findFiltered — no-filter path ─────────────────────────────────
describe("pipelineDB.findFiltered() — no filter (admin view)", () => {
  it("uses no WHERE clause when neither repo nor branch provided", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await pipelineDB.findFiltered({ limit: 10, offset: 0 });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).not.toMatch(/WHERE/i);
    expect(params[params.length - 2]).toBe(10);  // limit
    expect(params[params.length - 1]).toBe(0);   // offset
  });
});

// ─── pipelineDB.findByRunId ───────────────────────────────────────────────────
describe("pipelineDB.findByRunId()", () => {
  it("returns parsed row when found", async () => {
    const row = makePipelineRow({ run_id: "987654321" });
    mockQuery.mockResolvedValue({ rows: [row] });

    const result = await pipelineDB.findByRunId("987654321");
    expect(result).not.toBeNull();
    expect(result.runId).toBe("987654321");
  });

  it("returns null when not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await pipelineDB.findByRunId("nonexistent");
    expect(result).toBeNull();
  });
});

// ─── pipelineDB.deleteById ────────────────────────────────────────────────────
describe("pipelineDB.deleteById()", () => {
  it("returns { changes: rowCount } from DELETE", async () => {
    mockQuery.mockResolvedValue({ rowCount: 1 });
    const result = await pipelineDB.deleteById("uuid-1");
    expect(result).toEqual({ changes: 1 });
  });

  it("returns { changes: 0 } when record not found", async () => {
    mockQuery.mockResolvedValue({ rowCount: 0 });
    const result = await pipelineDB.deleteById("ghost");
    expect(result).toEqual({ changes: 0 });
  });
});

// ─── pipelineDB.deleteByIds ───────────────────────────────────────────────────
describe("pipelineDB.deleteByIds()", () => {
  it("calls pool.query with ids array", async () => {
    await pipelineDB.deleteByIds(["id1", "id2"]);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/DELETE/i);
    expect(params[0]).toEqual(["id1", "id2"]);
  });
});

// ─── pipelineDB.getHealth ─────────────────────────────────────────────────────
describe("pipelineDB.getHealth()", () => {
  it("returns zero-state when rows is empty", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await pipelineDB.getHealth();
    expect(result.total).toBe(0);
    expect(result.successes).toBe(0);
    expect(result.avgScore).toBeNull();
    expect(result.latest).toBeNull();
  });

  it("returns parsed health stats when rows present", async () => {
    const row = {
      total: "10", successes: "8", avg_score: "85.5",
      ...makePipelineRow(),
    };
    mockQuery.mockResolvedValue({ rows: [row] });

    const result = await pipelineDB.getHealth();

    expect(result.total).toBe(10);
    expect(result.successes).toBe(8);
    expect(result.avgScore).toBe(86);          // rounded
    expect(result.latest).not.toBeNull();
    expect(result.latest.repository).toBe("octocat/hello-world");
  });

  it("returns avgScore=null when total is 0 (avoid meaningless average)", async () => {
    const row = { total: "0", successes: "0", avg_score: null };
    mockQuery.mockResolvedValue({ rows: [row] });

    const result = await pipelineDB.getHealth();
    expect(result.avgScore).toBeNull();
  });

  it("returns latest=null when CTE row has no pipeline id (empty table)", async () => {
    // getHealth CTE can return a row where count=0 but LEFT JOIN gives null id
    const row = { total: "5", successes: "3", avg_score: "70", id: null };
    mockQuery.mockResolvedValue({ rows: [row] });

    const result = await pipelineDB.getHealth();
    expect(result.latest).toBeNull();
    expect(result.total).toBe(5);
  });
});

// ─── scanJobDB ────────────────────────────────────────────────────────────────
describe("scanJobDB.create()", () => {
  it("inserts a scan job with pending status", async () => {
    await scanJobDB.create("job_abc123", "owner/repo");

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO scan_jobs/i);
    expect(params[0]).toBe("job_abc123");
    expect(params[1]).toBe("owner/repo");
  });
});

describe("scanJobDB.getById()", () => {
  const jobRow = {
    id: "job_abc", repository: "owner/repo", status: "done",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    result: { score: 90 }, error: null,
  };

  it("returns mapped row when found (full mode)", async () => {
    mockQuery.mockResolvedValue({ rows: [jobRow] });
    const result = await scanJobDB.getById("job_abc");

    expect(result.status).toBe("done");
    expect(result.createdAt).toBeDefined();
    expect(result.result).toEqual({ score: 90 });
  });

  it("returns null when job not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await scanJobDB.getById("ghost");
    expect(result).toBeNull();
  });

  it("uses lite column set when lite=true", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await scanJobDB.getById("job_abc", { lite: true });

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).not.toMatch(/result/);   // heavy column omitted in lite mode
  });
});

describe("scanJobDB.markProcessing()", () => {
  it("issues UPDATE to set status=processing", async () => {
    await scanJobDB.markProcessing("job_abc");
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/processing/);
  });
});

describe("scanJobDB.markDone()", () => {
  it("issues UPDATE to set status=done with result", async () => {
    await scanJobDB.markDone("job_abc", { score: 90 });
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/done/);
    expect(params[0]).toEqual({ score: 90 });
  });
});

describe("scanJobDB.markFailed()", () => {
  it("issues UPDATE to set status=failed with error message", async () => {
    await scanJobDB.markFailed("job_abc", "trivy not found");
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/failed/);
    expect(params[0]).toBe("trivy not found");
  });
});

describe("scanJobDB.cleanupOld()", () => {
  it("returns rowCount of deleted records", async () => {
    mockQuery.mockResolvedValue({ rowCount: 3 });
    const result = await scanJobDB.cleanupOld(7);
    expect(result).toBe(3);
  });

  it("uses default retention of 7 days when no arg given", async () => {
    mockQuery.mockResolvedValue({ rowCount: 0 });
    await scanJobDB.cleanupOld();
    const [, params] = mockQuery.mock.calls[0];
    expect(params[0]).toBe(7);
  });
});

// ─── reportDB ─────────────────────────────────────────────────────────────────
describe("reportDB.insert()", () => {
  it("inserts with all 9 params", async () => {
    await reportDB.insert({
      token: "dp_rpt_abc", repository: "owner/repo", repoMeta: {},
      devpulseScore: null, stages: null, insights: null,
      createdBy: "user", createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO reports/i);
    expect(params).toHaveLength(9);
  });
});

describe("reportDB.getByToken()", () => {
  it("returns null when not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await reportDB.getByToken("dp_rpt_ghost");
    expect(result).toBeNull();
  });

  it("returns camelCased report when found", async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        token: "dp_rpt_abc", repository: "owner/repo",
        repo_meta: { language: "JS" }, devpulse_score: { score: 80 },
        stages: null, insights: null, created_by: "user",
        created_at: new Date().toISOString(), expires_at: new Date().toISOString(),
      }],
    });

    const result = await reportDB.getByToken("dp_rpt_abc");
    expect(result.token).toBe("dp_rpt_abc");
    expect(result.repoMeta).toEqual({ language: "JS" });
    expect(result.devpulseScore).toEqual({ score: 80 });
  });
});

describe("reportDB.cleanupExpired()", () => {
  it("calls DELETE WHERE expires_at < now", async () => {
    mockQuery.mockResolvedValue({ rowCount: 2 });
    await reportDB.cleanupExpired();
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/DELETE FROM reports WHERE expires_at/i);
  });
});

// ─── providerTokenDB ──────────────────────────────────────────────────────────
describe("providerTokenDB.upsert()", () => {
  it("performs INSERT ... ON CONFLICT DO UPDATE", async () => {
    await providerTokenDB.upsert({
      userId: "123", encryptedToken: "enc", githubLogin: "octocat", profileUrl: "https://...",
    });
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/ON CONFLICT/i);
    expect(sql).toMatch(/DO UPDATE/i);
  });
});

describe("providerTokenDB.getByUserId()", () => {
  it("returns null when user not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await providerTokenDB.getByUserId("999");
    expect(result).toBeNull();
  });

  it("returns the token row when found", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ user_id: "123", encrypted_token: "enc", github_login: "octocat", profile_url: null, synced_at: null }],
    });
    const result = await providerTokenDB.getByUserId("123");
    expect(result.user_id).toBe("123");
    expect(result.encrypted_token).toBe("enc");
  });
});

describe("providerTokenDB.deleteByUserId()", () => {
  it("issues DELETE for the given userId", async () => {
    await providerTokenDB.deleteByUserId("123");
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/DELETE FROM provider_tokens/i);
    expect(params[0]).toBe("123");
  });
});

// ─── db shim ──────────────────────────────────────────────────────────────────
describe("db compatibility shim", () => {
  it("db.open returns true when pool has connections", () => {
    expect(db.open).toBe(true);
  });

  it("db.close() calls pool.end()", async () => {
    await db.close();
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });
});
