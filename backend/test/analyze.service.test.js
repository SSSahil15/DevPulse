const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.BACKEND_URL = "http://localhost:4000";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.TOKEN_ENCRYPTION_SECRET = "abcdefghijklmnopqrstuvwxyz123456";
process.env.JWT_SECRET = "abcdefghijklmnopqrstuvwxyz1234567890";
process.env.GITHUB_CLIENT_ID = "test-client-id";
process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
process.env.DATABASE_PATH = "./.data/test-analyze.sqlite";

const { buildInitialAnalysis } = require("../src/services/analyze.service");

test("buildInitialAnalysis returns a complete dashboard-friendly analysis payload", async () => {
  const analysis = await buildInitialAnalysis({
    name: "devpulse",
    fullName: "octocat/devpulse",
    openIssuesCount: 8,
    size: 1024,
    updatedAt: new Date().toISOString()
  });

  assert.equal(typeof analysis.riskScore, "number");
  assert.ok(analysis.riskScore >= 0 && analysis.riskScore <= 100);
  assert.ok(["SAFE", "BLOCK"].includes(analysis.decision));
  assert.equal(typeof analysis.failurePrediction.probability, "number");
  assert.ok(Array.isArray(analysis.suggestions));
  assert.ok(Array.isArray(analysis.securityScan.vulnerabilities));
});
