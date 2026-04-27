const test = require("node:test");
const assert = require("node:assert/strict");

const { buildInitialAnalysis } = require("../src/services/analyze.service");

test("buildInitialAnalysis returns a complete dashboard-friendly analysis payload", () => {
  const analysis = buildInitialAnalysis({
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
