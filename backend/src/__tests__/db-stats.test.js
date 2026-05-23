/**
 * db-stats.test.js
 * ================
 * Integration tests for GET /api/admin/db-stats.
 *
 * Mocks: pg pool (database), redis service, githubAuth JWT verification.
 * Tests: auth gate (401 without token), authenticated response shape,
 *        pool stats present, graceful handling of pg query errors.
 *
 * NOTE: mockPoolQuery must be declared inside the jest.mock factory using
 * jest.fn() — variables declared outside the factory cannot be referenced
 * inside it due to Jest hoisting. Use require('../db/database') AFTER
 * jest.mock to get a reference to the mocked pool.query.
 */

const request = require("supertest");
const app     = require("../app");
const jwt     = require("jsonwebtoken");
const config  = require("../config/env");

// ─── Mock the database pool ───────────────────────────────────────────────────
jest.mock("../db/database", () => ({
  pool: {
    // Use jest.fn() inline — cannot reference outer variables (hoisting)
    query:       jest.fn().mockResolvedValue({ rows: [] }),
    totalCount:  3,
    idleCount:   2,
    waitingCount: 0,
  },
  pipelineDB: {
    findFiltered:          jest.fn(),
    findFilteredWithCount: jest.fn(),
    findByRunId:           jest.fn(),
    getHealth:             jest.fn(),
    insert:                jest.fn(),
    deleteById:            jest.fn(),
    deleteByIds:           jest.fn(),
  },
  scanJobDB: {
    create: jest.fn(), getById: jest.fn(), markProcessing: jest.fn(),
    markDone: jest.fn(), markFailed: jest.fn(),
  },
  reportDB:        { insert: jest.fn(), getByToken: jest.fn(), cleanupExpired: jest.fn() },
  providerTokenDB: { upsert: jest.fn(), getByUserId: jest.fn(), deleteByUserId: jest.fn() },
}));

jest.mock("../services/githubAuth.service", () => ({
  verifyDevPulseJWT: jest.fn(),
}));
jest.mock("../services/redis.service", () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
}));

const githubAuthService = require("../services/githubAuth.service");
// Get reference to the mocked pool after jest.mock has run
const { pool: mockPool } = require("../db/database");

// ─── Shared auth setup ────────────────────────────────────────────────────────
const mockUser = { sub: "123", username: "admin", id: "123" };
let mockToken;

beforeAll(() => {
  mockToken = jwt.sign(mockUser, config.jwtSecret);
});

beforeEach(() => {
  jest.clearAllMocks();
  githubAuthService.verifyDevPulseJWT.mockReturnValue(mockUser);
  // Reset pool.query to return empty rows for all catalog queries
  mockPool.query.mockResolvedValue({ rows: [] });
});

// ─── Auth gate ────────────────────────────────────────────────────────────────
describe("GET /api/admin/db-stats — authentication", () => {
  it("returns 401 when no Authorization header is provided", async () => {
    const res = await request(app).get("/api/admin/db-stats");
    expect(res.status).toBe(401);
  });

  it("returns 4xx/5xx when token is malformed (verify throws — propagates via asyncHandler)", async () => {
    // ensureAuthenticated uses asyncHandler: thrown errors are forwarded to the
    // Express global error handler (→ 500), not short-circuited to 401.
    // The 401 path only fires when the Authorization header is absent entirely.
    githubAuthService.verifyDevPulseJWT.mockImplementation(() => {
      throw new Error("invalid token");
    });
    const res = await request(app)
      .get("/api/admin/db-stats")
      .set("Authorization", "Bearer bad.token.here");
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ─── Authenticated response shape ─────────────────────────────────────────────
describe("GET /api/admin/db-stats — authenticated", () => {
  it("returns 200 with required top-level keys", async () => {
    const res = await request(app)
      .get("/api/admin/db-stats")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("generated_at");
    expect(res.body).toHaveProperty("pool");
    expect(res.body).toHaveProperty("tables");
    expect(res.body).toHaveProperty("indexes");
    expect(res.body).toHaveProperty("cache");
    expect(res.body).toHaveProperty("tips");
  });

  it("pool stats reflect the mocked pool values", async () => {
    const res = await request(app)
      .get("/api/admin/db-stats")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.body.pool).toMatchObject({
      total:   3,
      idle:    2,
      waiting: 0,
    });
  });

  it("tables and indexes are arrays (empty when pg returns no rows)", async () => {
    const res = await request(app)
      .get("/api/admin/db-stats")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(Array.isArray(res.body.tables)).toBe(true);
    expect(Array.isArray(res.body.indexes)).toBe(true);
  });

  it("slow_queries is null when pg_stat_statements returns no rows", async () => {
    const res = await request(app)
      .get("/api/admin/db-stats")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.body.slow_queries).toBeNull();
  });

  it("unused_indexes is an empty array when no index rows returned", async () => {
    const res = await request(app)
      .get("/api/admin/db-stats")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(Array.isArray(res.body.unused_indexes)).toBe(true);
  });

  it("returns table data when pg_stat_user_tables has rows", async () => {
    mockPool.query
      .mockResolvedValueOnce({
        rows: [{ table_name: "pipeline_results", live_rows: "42", dead_rows: "0", seq_scans: "5", index_scans: "100", total_size: "8192 bytes", last_vacuum: null, last_autovacuum: null, last_analyze: null, last_autoanalyze: null }],
      })
      .mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get("/api/admin/db-stats")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.body.tables).toHaveLength(1);
    expect(res.body.tables[0].table_name).toBe("pipeline_results");
  });
});

// ─── Graceful error handling ──────────────────────────────────────────────────
describe("GET /api/admin/db-stats — pg query errors", () => {
  it("returns 200 even when all pg catalog queries fail (safeQuery catches)", async () => {
    mockPool.query.mockRejectedValue(new Error("pg connection refused"));

    const res = await request(app)
      .get("/api/admin/db-stats")
      .set("Authorization", `Bearer ${mockToken}`);

    // safeQuery() catches errors and returns [] — endpoint must not crash
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tables)).toBe(true);
    expect(res.body.tables).toHaveLength(0);
  });
});
