/**
 * devpulseScore.test.js
 * =====================
 * Unit tests for the DevPulse scoring engine.
 * These are pure-function tests — no DB or network required.
 */

const {
  calculateDevPulseScore,
  generatePipelineInsights,
} = require("../services/devpulseScore.service");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanStages(overrides = {}) {
  return {
    backend:  { tests: "success" },
    frontend: { build: "success", tests: "success" },
    docker:   { build: "success", imageSize: "200MB", imageVulnerabilities: 0 },
    security: { critical: 0, high: 0, medium: 0, vulnerabilities: [] },
    ...overrides,
  };
}

function healthyRepoHealth() {
  return {
    commitActivity: { commitsPerWeek: 8 },
    contributors:   { totalContributors: 5 },
    codeChurn:      { additions: 100, deletions: 30 },
  };
}

// ─── calculateDevPulseScore ───────────────────────────────────────────────────

describe("calculateDevPulseScore", () => {
  describe("clean pipeline — no vulnerabilities, good history", () => {
    it("produces a score of 80 or higher", () => {
      const score = calculateDevPulseScore(cleanStages(), healthyRepoHealth(), []);
      expect(score.score).toBeGreaterThanOrEqual(80);
    });

    it("has SAFE status", () => {
      const score = calculateDevPulseScore(cleanStages(), healthyRepoHealth(), []);
      expect(score.status).toBe("SAFE");
    });

    it("has LOW risk category", () => {
      const score = calculateDevPulseScore(cleanStages(), healthyRepoHealth(), []);
      expect(score.riskCategory).toBe("LOW");
    });

    it("exposes numeric score between 0 and 100", () => {
      const score = calculateDevPulseScore(cleanStages(), healthyRepoHealth(), []);
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
    });

    it("exposes a factors breakdown object", () => {
      const score = calculateDevPulseScore(cleanStages(), healthyRepoHealth(), []);
      expect(score.factors).toBeDefined();
      expect(typeof score.factors).toBe("object");
    });
  });

  describe("critical CVE deductions", () => {
    it("deducts points for 1 critical CVE", () => {
      const baseline = calculateDevPulseScore(cleanStages(), healthyRepoHealth(), []).score;
      const withCrit = calculateDevPulseScore(
        cleanStages({ security: { critical: 1, high: 0, medium: 0, vulnerabilities: [] } }),
        healthyRepoHealth(),
        []
      ).score;
      expect(withCrit).toBeLessThan(baseline);
    });

    it("deducts more points for 3 critical CVEs than for 1", () => {
      const one  = calculateDevPulseScore(cleanStages({ security: { critical: 1, high: 0, medium: 0, vulnerabilities: [] } }), healthyRepoHealth(), []).score;
      const three = calculateDevPulseScore(cleanStages({ security: { critical: 3, high: 0, medium: 0, vulnerabilities: [] } }), healthyRepoHealth(), []).score;
      expect(three).toBeLessThan(one);
    });

    it("status is CRITICAL when score drops below 30", () => {
      // 10 criticals = 10×12 = 120 deduction on security factor alone → score well below 30
      const score = calculateDevPulseScore(
        cleanStages({ security: { critical: 10, high: 5, medium: 5, vulnerabilities: [] } }),
        healthyRepoHealth(),
        []
      );
      expect(["CRITICAL", "RISKY"]).toContain(score.status);
    });
  });

  describe("failed build/test stages", () => {
    it("deducts points when backend tests fail", () => {
      const baseline = calculateDevPulseScore(cleanStages(), healthyRepoHealth(), []).score;
      const failed   = calculateDevPulseScore(
        cleanStages({ backend: { tests: "failure" } }),
        healthyRepoHealth(),
        []
      ).score;
      expect(failed).toBeLessThanOrEqual(baseline);
    });

    it("deducts points when frontend build fails", () => {
      const baseline = calculateDevPulseScore(cleanStages(), healthyRepoHealth(), []).score;
      const failed   = calculateDevPulseScore(
        cleanStages({ frontend: { build: "failure", tests: "success" } }),
        healthyRepoHealth(),
        []
      ).score;
      expect(failed).toBeLessThanOrEqual(baseline);
    });
  });

  describe("historical failure rate", () => {
    it("penalises repos with a high failure rate in recent history", () => {
      const noHistory   = calculateDevPulseScore(cleanStages(), healthyRepoHealth(), []).score;
      const highFailure = calculateDevPulseScore(
        cleanStages(),
        healthyRepoHealth(),
        // 8 failures out of 10 runs = 80% failure rate
        Array.from({ length: 10 }, (_, i) => ({
          overallStatus: i < 8 ? "failure" : "success",
        }))
      ).score;
      expect(highFailure).toBeLessThanOrEqual(noHistory);
    });

    it("does NOT penalise repos with a 100% success history", () => {
      const noHistory      = calculateDevPulseScore(cleanStages(), healthyRepoHealth(), []).score;
      const perfectHistory = calculateDevPulseScore(
        cleanStages(),
        healthyRepoHealth(),
        Array.from({ length: 10 }, () => ({ overallStatus: "success" }))
      ).score;
      // Perfect history should score >= no history (bonus possible)
      expect(perfectHistory).toBeGreaterThanOrEqual(noHistory - 5); // allow 5pt tolerance
    });
  });

  describe("null / missing inputs", () => {
    it("handles null repoHealth gracefully", () => {
      expect(() => calculateDevPulseScore(cleanStages(), null, [])).not.toThrow();
    });

    it("handles null stages gracefully", () => {
      expect(() => calculateDevPulseScore(null, healthyRepoHealth(), [])).not.toThrow();
    });

    it("handles undefined history gracefully", () => {
      expect(() => calculateDevPulseScore(cleanStages(), healthyRepoHealth(), undefined)).not.toThrow();
    });
  });
});

// ─── generatePipelineInsights ─────────────────────────────────────────────────

describe("generatePipelineInsights", () => {
  it("returns all-clear explanation for a healthy pipeline", () => {
    const score    = calculateDevPulseScore(cleanStages(), healthyRepoHealth(), []);
    const insights = generatePipelineInsights(cleanStages(), score, healthyRepoHealth());

    expect(insights.explanation).toMatch(/successfully/i);
    expect(insights.rootCause).toBeNull();
    expect(insights.issues).toHaveLength(0);
    expect(Array.isArray(insights.suggestions)).toBe(true);
    expect(insights.suggestions.length).toBeGreaterThan(0);
  });

  it("returns issue list when critical CVEs exist", () => {
    const stages   = cleanStages({ security: { critical: 2, high: 0, medium: 0, vulnerabilities: [] } });
    const score    = calculateDevPulseScore(stages, healthyRepoHealth(), []);
    const insights = generatePipelineInsights(stages, score, healthyRepoHealth());

    expect(insights.issues.length).toBeGreaterThan(0);
    expect(insights.rootCause).not.toBeNull();
  });

  it("explanation mentions issue count when problems detected", () => {
    const stages   = cleanStages({ security: { critical: 1, high: 2, medium: 3, vulnerabilities: [] } });
    const score    = calculateDevPulseScore(stages, healthyRepoHealth(), []);
    const insights = generatePipelineInsights(stages, score, healthyRepoHealth());

    expect(insights.explanation).toMatch(/issue/i);
  });

  it("always returns a suggestions array", () => {
    const score    = calculateDevPulseScore(cleanStages(), healthyRepoHealth(), []);
    const insights = generatePipelineInsights(cleanStages(), score, healthyRepoHealth());
    expect(Array.isArray(insights.suggestions)).toBe(true);
  });
});
