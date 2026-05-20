/**
 * pipeline.test.js — Extended
 * ============================
 * Tests for pipeline API routes including ingest, score, history, and error cases.
 */

const request = require("supertest");
const app     = require("../app");
const jwt     = require("jsonwebtoken");
const config  = require("../config/env");
const database = require("../db/database");

// ─── Mock the database layer ──────────────────────────────────────────────────
jest.mock("../db/database", () => ({
  pipelineDB: {
    insert:       jest.fn(),
    findFiltered: jest.fn(),
    findByRunId:  jest.fn(),
    getHealth:    jest.fn(),
    deleteById:   jest.fn(),
    deleteByIds:  jest.fn(),
  },
  scanJobDB: {
    create:         jest.fn(),
    getById:        jest.fn(),
    markProcessing: jest.fn(),
    markDone:       jest.fn(),
    markFailed:     jest.fn(),
  },
}));

// ─── Mock auth service so JWT verify is controllable ─────────────────────────
jest.mock("../services/githubAuth.service", () => ({
  verifyDevPulseJWT: jest.fn(),
}));
jest.mock("../services/redis.service", () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
}));

const githubAuthService = require("../services/githubAuth.service");

// ─── Shared setup ─────────────────────────────────────────────────────────────
let mockToken;
const mockUser = { sub: "123", username: "testuser", id: "123" };

beforeAll(() => {
  mockToken = jwt.sign(mockUser, config.jwtSecret);
});

beforeEach(() => {
  jest.clearAllMocks();
  githubAuthService.verifyDevPulseJWT.mockReturnValue(mockUser);
});

// ─── Minimal valid ingest payload ─────────────────────────────────────────────
function validIngestPayload(overrides = {}) {
  return {
    repository:  "octocat/hello-world",
    commitSha:   "abc123def456",
    runId:       "9876543210",
    commitMessage: "feat: add tests",
    branch:      "main",
    overallStatus: "success",
    stages: {
      backend:  { tests: "success" },
      frontend: { build: "success", tests: "success" },
      security: { critical: 0, high: 0, medium: 0 },
      docker:   { build: "success" },
    },
    ...overrides,
  };
}

// ─── GET /api/pipeline/results ────────────────────────────────────────────────
describe("GET /api/pipeline/results", () => {
  it("returns 200 with results array", async () => {
    database.pipelineDB.findFiltered.mockResolvedValue([
      { id: "run1", repository: "octocat/hello-world", overallStatus: "success" },
    ]);

    const res = await request(app)
      .get("/api/pipeline/results")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results).toHaveLength(1);
  });

  it("returns empty array when no results exist", async () => {
    database.pipelineDB.findFiltered.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/pipeline/results")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(0);
  });

  it("passes repository query param to DB filter", async () => {
    database.pipelineDB.findFiltered.mockResolvedValue([]);
    await request(app)
      .get("/api/pipeline/results?repository=octocat/hello-world")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(database.pipelineDB.findFiltered).toHaveBeenCalledWith(
      expect.objectContaining({ repository: "octocat/hello-world" })
    );
  });
});

// ─── POST /api/pipeline/results (ingest) ─────────────────────────────────────
describe("POST /api/pipeline/results", () => {
  beforeEach(() => {
    // Mock findFiltered for score history (used inside ingestResult)
    database.pipelineDB.findFiltered.mockResolvedValue([]);
    database.pipelineDB.insert.mockResolvedValue(undefined);
  });

  it("returns 201 when a valid pipeline result is ingested", async () => {
    const res = await request(app)
      .post("/api/pipeline/results")
      .send(validIngestPayload());

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("devpulseScore");
    expect(res.body.devpulseScore).toHaveProperty("score");
  });

  it("calls pipelineDB.insert exactly once", async () => {
    await request(app)
      .post("/api/pipeline/results")
      .send(validIngestPayload());

    expect(database.pipelineDB.insert).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when repository is missing", async () => {
    const payload = validIngestPayload();
    delete payload.repository;

    const res = await request(app)
      .post("/api/pipeline/results")
      .send(payload);

    expect(res.status).toBe(400);
  });

  it("returns 400 when commitSha is missing", async () => {
    const payload = validIngestPayload();
    delete payload.commitSha;

    const res = await request(app)
      .post("/api/pipeline/results")
      .send(payload);

    expect(res.status).toBe(400);
  });

  it("returns 400 when runId is missing", async () => {
    const payload = validIngestPayload();
    delete payload.runId;

    const res = await request(app)
      .post("/api/pipeline/results")
      .send(payload);

    expect(res.status).toBe(400);
  });

  it("still returns 201 with no stages (all optional)", async () => {
    const payload = {
      repository: "octocat/hello-world",
      commitSha:  "abc123",
      runId:      "123456",
    };

    const res = await request(app)
      .post("/api/pipeline/results")
      .send(payload);

    expect(res.status).toBe(201);
  });
});

// ─── GET /api/pipeline/score/:repo ────────────────────────────────────────────
describe("GET /api/pipeline/score/:repo", () => {
  it("returns 200 with devpulseScore when data exists", async () => {
    database.pipelineDB.findFiltered.mockResolvedValue([
      {
        id: "run1",
        repository:    "octocat/hello-world",
        overallStatus: "success",
        devpulseScore: { score: 85, status: "SAFE", riskCategory: "LOW" },
        branch:        "main",
        commitSha:     "abc123",
      },
    ]);

    const res = await request(app)
      .get("/api/pipeline/score/octocat/hello-world")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("devpulseScore");
    expect(res.body.devpulseScore.score).toBe(85);
  });

  it("returns 404 when no data exists for the repository", async () => {
    database.pipelineDB.findFiltered.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/pipeline/score/unknown/repo")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.status).toBe(404);
  });
});

// ─── GET /api/pipeline/score/:repo/history ────────────────────────────────────
describe("GET /api/pipeline/score/:repo/history", () => {
  it("returns an array of historical scores", async () => {
    database.pipelineDB.findFiltered.mockResolvedValue([
      { id: "r1", devpulseScore: { score: 80 }, overallStatus: "success", receivedAt: new Date().toISOString(), commitSha: "a1", runId: "1" },
      { id: "r2", devpulseScore: { score: 75 }, overallStatus: "success", receivedAt: new Date().toISOString(), commitSha: "a2", runId: "2" },
    ]);

    const res = await request(app)
      .get("/api/pipeline/score/octocat/hello-world/history")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.history)).toBe(true);
  });

  it("returns an empty history when no runs exist", async () => {
    database.pipelineDB.findFiltered.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/pipeline/score/octocat/hello-world/history")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(0);
  });
});

// ─── GET /api/pipeline/health ─────────────────────────────────────────────────
describe("GET /api/pipeline/health", () => {
  it("returns 200 with health stats", async () => {
    database.pipelineDB.getHealth.mockResolvedValue({
      total: 10, successes: 8, avgScore: 85, latest: null,
    });

    const res = await request(app).get("/api/pipeline/health");

    expect(res.status).toBe(200);
    expect(res.body.totalRuns).toBe(10);
    expect(res.body.successRate).toBe(80);
  });

  it("returns totalRuns:0 when no data", async () => {
    database.pipelineDB.getHealth.mockResolvedValue({
      total: 0, successes: 0, avgScore: null, latest: null,
    });

    const res = await request(app).get("/api/pipeline/health");
    expect(res.status).toBe(200);
    expect(res.body.totalRuns).toBe(0);
  });
});

// ─── GET /api/pipeline/results/:runId ─────────────────────────────────────────
describe("GET /api/pipeline/results/:runId", () => {
  it("returns 200 when run is found", async () => {
    database.pipelineDB.findByRunId.mockResolvedValue({
      id: "result-1", runId: "abc", repository: "owner/repo",
    });

    const res = await request(app)
      .get("/api/pipeline/results/abc")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("runId");
  });

  it("returns 404 when run is not found", async () => {
    database.pipelineDB.findByRunId.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/pipeline/results/nonexistent")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.status).toBe(404);
  });
});
