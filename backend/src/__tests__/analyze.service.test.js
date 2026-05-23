/**
 * analyze.service.test.js
 * =======================
 * Tests for buildInitialAnalysis — the AI-calling service.
 *
 * Two paths tested:
 *  1. Happy path — axios.post succeeds → returns AI service response verbatim
 *  2. Fallback path — axios.post throws → returns computed bootstrap analysis
 *
 * axios is mocked so no real HTTP requests are made.
 */

jest.mock("axios");
jest.mock("../services/security.service", () => ({
  runTrivyScan: jest.fn(),
}));

const axios = require("axios");
const { buildInitialAnalysis } = require("../services/analyze.service");

// ─── Fixture ──────────────────────────────────────────────────────────────────
const mockRepo = {
  fullName:       "octocat/hello-world",
  description:    "A sample repository",
  language:       "JavaScript",
  stargazersCount: 1500,
  forksCount:     300,
  openIssuesCount: 5,
  size:           2048,
  updatedAt:      new Date().toISOString(), // recently updated
  defaultBranch:  "main",
  htmlUrl:        "https://github.com/octocat/hello-world",
};

const mockAiResponse = {
  decision: "SAFE",
  riskScore: 20,
  failurePrediction: { label: "low", probability: 15, rationale: "AI rationale" },
  source: "ai-service",
};

// ─── Happy path (AI service responds) ─────────────────────────────────────────
describe("buildInitialAnalysis() — AI service success", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.post.mockResolvedValue({ data: mockAiResponse });
  });

  it("calls the AI service endpoint with repository and securityScan", async () => {
    await buildInitialAnalysis(mockRepo, "ghp_token");

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, body] = axios.post.mock.calls[0];
    expect(url).toMatch(/\/analyze$/);
    expect(body).toHaveProperty("repository");
    expect(body).toHaveProperty("securityScan");
  });

  it("passes an empty/placeholder securityScan to AI (Trivy is separate)", async () => {
    await buildInitialAnalysis(mockRepo, "ghp_token");

    const [, body] = axios.post.mock.calls[0];
    expect(body.securityScan.status).toBe("handled_by_pipeline");
    expect(body.securityScan.severityScore).toBe(0);
  });

  it("returns the AI service response directly", async () => {
    const result = await buildInitialAnalysis(mockRepo, "ghp_token");

    expect(result.decision).toBe("SAFE");
    expect(result.riskScore).toBe(20);
    expect(result.source).toBe("ai-service");
  });
});

// ─── Fallback path (AI service down) ─────────────────────────────────────────
describe("buildInitialAnalysis() — AI service fails (fallback logic)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.post.mockRejectedValue(new Error("ECONNREFUSED"));
  });

  it("returns an object without throwing when AI is unreachable", async () => {
    await expect(buildInitialAnalysis(mockRepo, "ghp_token")).resolves.toBeDefined();
  });

  it("fallback result has required top-level keys", async () => {
    const result = await buildInitialAnalysis(mockRepo, "ghp_token");

    expect(result).toHaveProperty("decision");
    expect(result).toHaveProperty("riskScore");
    expect(result).toHaveProperty("failurePrediction");
    expect(result).toHaveProperty("securityScan");
    expect(result).toHaveProperty("suggestions");
    expect(result).toHaveProperty("generatedAt");
    expect(result).toHaveProperty("source");
  });

  it("fallback source is 'bootstrap-github-metadata'", async () => {
    const result = await buildInitialAnalysis(mockRepo, "ghp_token");
    expect(result.source).toBe("bootstrap-github-metadata");
  });

  it("riskScore is between 0 and 100", async () => {
    const result = await buildInitialAnalysis(mockRepo, "ghp_token");
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it("decision is 'SAFE' or 'BLOCK'", async () => {
    const result = await buildInitialAnalysis(mockRepo, "ghp_token");
    expect(["SAFE", "BLOCK"]).toContain(result.decision);
  });

  it("failurePrediction.label is 'low', 'moderate', or 'high'", async () => {
    const result = await buildInitialAnalysis(mockRepo, "ghp_token");
    expect(["low", "moderate", "high"]).toContain(result.failurePrediction.label);
  });

  it("suggestions is a non-empty array", async () => {
    const result = await buildInitialAnalysis(mockRepo, "ghp_token");
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("always returns SAFE in fallback path (riskScore max is 59, BLOCK threshold is 60)", async () => {
    // failureProbability is clamped at 90 max.
    // riskScore = round(90 * 0.65 + 0 * 0.35) = round(58.5) = 59 — always < 60.
    // So BLOCK is unreachable when securityScan.severityScore = 0 (fallback).
    const staleRepo = {
      ...mockRepo,
      openIssuesCount: 30,
      size: 99999,
      updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const result = await buildInitialAnalysis(staleRepo, "ghp_token");
    // riskScore will be high but always SAFE in the fallback (no security score)
    expect(result.decision).toBe("SAFE");
    expect(result.riskScore).toBeGreaterThan(40); // high-pressure repo scores high
  });

  it("fallback securityScan has pending status", async () => {
    const result = await buildInitialAnalysis(mockRepo, "ghp_token");
    expect(result.securityScan.status).toBe("pending_trivy_integration");
    expect(result.securityScan.severityScore).toBe(0);
  });

  it("adds issue-pressure suggestion when openIssuesCount > 20", async () => {
    const highIssuerepo = { ...mockRepo, openIssuesCount: 25 };
    const result = await buildInitialAnalysis(highIssuerepo, "ghp_token");
    const joined = result.suggestions.join(" ");
    expect(joined).toMatch(/issue/i);
  });

  it("adds staleness suggestion when repo not updated in > 30 days", async () => {
    const staleRepo = {
      ...mockRepo,
      updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const result = await buildInitialAnalysis(staleRepo, "ghp_token");
    const joined = result.suggestions.join(" ");
    expect(joined).toMatch(/updated|refresh|dependency/i);
  });

  it("handles invalid updatedAt (NaN date) gracefully — daysSince returns 0", async () => {
    // new Date("not-a-date").getTime() === NaN → Number.isNaN guard → daysSince returns 0
    const invalidDateRepo = { ...mockRepo, updatedAt: "not-a-valid-date" };
    const result = await buildInitialAnalysis(invalidDateRepo, "ghp_token");

    // Should not throw; NaN date → daysSince=0 → repositoryAgePressure=0
    expect(result).toBeDefined();
    expect(result.source).toBe("bootstrap-github-metadata");
    // riskScore is lower than a stale repo (no age pressure)
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });
});

