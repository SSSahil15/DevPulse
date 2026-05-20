/**
 * reports.test.js
 * ===============
 * Tests for the /api/reports route — covers creation, validation,
 * and retrieval of shareable reports.
 */

const request = require("supertest");
const app     = require("../app");
const jwt     = require("jsonwebtoken");
const config  = require("../config/env");

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../services/githubAuth.service", () => ({
  verifyDevPulseJWT: jest.fn(),
}));

jest.mock("../services/providerTokenStore.service", () => ({
  getGitHubProviderToken:       jest.fn(),
  getGitHubProviderTokenStatus: jest.fn(),
  saveGitHubProviderToken:      jest.fn(),
  deleteGitHubProviderToken:    jest.fn(),
}));

jest.mock("../db/database", () => ({
  pipelineDB: {
    findFiltered: jest.fn(),
    insert:       jest.fn(),
    getHealth:    jest.fn(),
    findByRunId:  jest.fn(),
    deleteById:   jest.fn(),
    deleteByIds:  jest.fn(),
  },
  reportDB: {
    insert:       jest.fn(),
    getByToken:   jest.fn(),
    cleanupExpired: jest.fn(),
  },
  scanJobDB: {
    create:         jest.fn(),
    getById:        jest.fn(),
    markProcessing: jest.fn(),
    markDone:       jest.fn(),
    markFailed:     jest.fn(),
  },
}));

jest.mock("../services/redis.service", () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
}));

jest.mock("../services/report.service", () => ({
  createReport:    jest.fn(),
  getReportByToken: jest.fn(),
}));

const githubAuthService      = require("../services/githubAuth.service");
const providerTokenStore     = require("../services/providerTokenStore.service");
const database               = require("../db/database");
const { createReport, getReportByToken } = require("../services/report.service");

// ─── Setup ────────────────────────────────────────────────────────────────────

let mockToken;
const mockUser = { sub: "user-123", username: "testuser" };

beforeAll(() => {
  mockToken = jwt.sign(mockUser, config.jwtSecret);
});

beforeEach(() => {
  jest.clearAllMocks();
  githubAuthService.verifyDevPulseJWT.mockReturnValue(mockUser);
  providerTokenStore.getGitHubProviderToken.mockResolvedValue("ghp_mock_token");
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockPipelineResult = {
  id:            "result-1",
  repository:    "octocat/hello-world",
  overallStatus: "success",
  devpulseScore: { score: 85, status: "SAFE", riskCategory: "LOW" },
  stages:        { backend: { tests: "success" }, security: { critical: 0, high: 0, medium: 0 } },
  insights:      { explanation: "All good", suggestions: [], issues: [], rootCause: null },
};

const mockReport = {
  token:         "dp_rpt_aabbccddeeff001122334455",
  repository:    "octocat/hello-world",
  devpulseScore: mockPipelineResult.devpulseScore,
  stages:        mockPipelineResult.stages,
  insights:      mockPipelineResult.insights,
  createdBy:     "testuser",
  createdAt:     new Date().toISOString(),
  expiresAt:     new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  expired:       false,
};

// ─── POST /api/reports ────────────────────────────────────────────────────────

describe("POST /api/reports", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .post("/api/reports")
      .send({ repository: "octocat/hello-world" });

    expect(res.status).toBe(401);
  });

  it("returns 409 when GitHub token not synced", async () => {
    providerTokenStore.getGitHubProviderToken.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${mockToken}`)
      .send({ repository: "octocat/hello-world" });

    expect(res.status).toBe(409);
  });

  it("returns 400 when repository is missing from body", async () => {
    const res = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${mockToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 404 when no pipeline data exists for the repository", async () => {
    database.pipelineDB.findFiltered.mockResolvedValue([]);

    const res = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${mockToken}`)
      .send({ repository: "octocat/hello-world" });

    expect(res.status).toBe(404);
  });

  it("returns 201 with token and shareUrl when successful", async () => {
    database.pipelineDB.findFiltered.mockResolvedValue([mockPipelineResult]);
    createReport.mockResolvedValue(mockReport);

    const res = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${mockToken}`)
      .send({ repository: "octocat/hello-world" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("shareUrl");
    expect(res.body.token).toBe(mockReport.token);
  });

  it("calls createReport with correct parameters", async () => {
    database.pipelineDB.findFiltered.mockResolvedValue([mockPipelineResult]);
    createReport.mockResolvedValue(mockReport);

    await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${mockToken}`)
      .send({ repository: "octocat/hello-world" });

    expect(createReport).toHaveBeenCalledWith(
      expect.objectContaining({ repository: "octocat/hello-world" })
    );
  });
});

// ─── GET /api/reports/:token ──────────────────────────────────────────────────

describe("GET /api/reports/:token", () => {
  it("returns 400 for malformed token format", async () => {
    const res = await request(app).get("/api/reports/not-a-valid-token");
    expect(res.status).toBe(400);
  });

  it("returns 400 for token with wrong prefix", async () => {
    const res = await request(app).get("/api/reports/wrong_prefix_aabbccddeeff001122334455");
    expect(res.status).toBe(400);
  });

  it("returns 404 when report does not exist", async () => {
    getReportByToken.mockResolvedValue(null);

    const res = await request(app).get("/api/reports/dp_rpt_aabbccddeeff001122334455");
    expect(res.status).toBe(404);
  });

  it("returns 410 Gone when report has expired", async () => {
    getReportByToken.mockResolvedValue({ ...mockReport, expired: true });

    const res = await request(app).get("/api/reports/dp_rpt_aabbccddeeff001122334455");
    expect(res.status).toBe(410);
  });

  it("returns 200 with report data for a valid token", async () => {
    getReportByToken.mockResolvedValue(mockReport);

    const res = await request(app).get("/api/reports/dp_rpt_aabbccddeeff001122334455");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("devpulseScore");
    expect(res.body.token).toBe(mockReport.token);
  });
});
