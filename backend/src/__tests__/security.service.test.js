/**
 * security.service.test.js
 * ========================
 * Tests for parseTrivyResults (exported via module internals) and
 * runTrivyScan error-handling path.
 *
 * parseTrivyResults is the core logic function — it runs pure JS with no
 * I/O. runTrivyScan shells out to git + trivy, so we mock child_process.execFile
 * to exercise the error-return path without hitting the filesystem.
 */

// Mock child_process so no real git/trivy runs
jest.mock("child_process", () => ({
  execFile: jest.fn(),
}));

// Mock fs.promises so no real directory creation/removal happens
jest.mock("fs", () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    rm: jest.fn().mockResolvedValue(undefined),
  },
}));

const { execFile } = require("child_process");
const { runTrivyScan } = require("../services/security.service");

// ─── parseTrivyResults — accessed via runTrivyScan with mocked exec ───────────
// We test parseTrivyResults indirectly by mocking exec to return known JSON.

describe("runTrivyScan() — error path (exec fails)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error object when git clone fails", async () => {
    execFile.mockImplementation((cmd, args, opts, cb) =>
      cb(new Error("git clone failed: authentication required"))
    );

    const result = await runTrivyScan("owner/repo", "ghp_token");

    expect(result.status).toBe("error");
    expect(result.summary).toEqual({
      critical: 0, high: 0, medium: 0, low: 0, unknown: 0,
    });
    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.error).toContain("git clone failed");
  });

  it("returns error object when trivy scan fails", async () => {
    // First exec (git clone) succeeds, second (trivy) fails
    execFile
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: "", stderr: "" }))
      .mockImplementationOnce((cmd, args, opts, cb) => cb(new Error("trivy: command not found")));

    const result = await runTrivyScan("owner/repo", "ghp_token");

    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("returns safe defaults in the error result (0 severities)", async () => {
    execFile.mockImplementation((cmd, args, opts, cb) =>
      cb(new Error("network timeout"))
    );

    const result = await runTrivyScan("owner/repo", "token");

    expect(result.severityScore).toBe(0);
    expect(result.summary.critical).toBe(0);
    expect(result.summary.high).toBe(0);
    expect(result.summary.medium).toBe(0);
  });
});

describe("runTrivyScan() — success path (mocked trivy output)", () => {
  beforeEach(() => jest.clearAllMocks());

  const trivyOutput = JSON.stringify({
    Results: [
      {
        Vulnerabilities: [
          { VulnerabilityID: "CVE-1", Severity: "CRITICAL", PkgName: "pkg-a", InstalledVersion: "1.0", FixedVersion: "2.0", Title: "Critical vuln" },
          { VulnerabilityID: "CVE-2", Severity: "HIGH",     PkgName: "pkg-b", InstalledVersion: "1.0", FixedVersion: "1.1", Title: "High vuln" },
          { VulnerabilityID: "CVE-3", Severity: "MEDIUM",   PkgName: "pkg-c", InstalledVersion: "1.0", FixedVersion: null,  Title: "Medium vuln" },
          { VulnerabilityID: "CVE-4", Severity: "LOW",      PkgName: "pkg-d", InstalledVersion: "1.0", FixedVersion: null,  Title: "Low vuln" },
        ],
      },
    ],
  });

  it("returns status=completed on success", async () => {
    execFile
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: "", stderr: "" })) // clone
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: trivyOutput, stderr: "" })); // trivy

    const result = await runTrivyScan("owner/repo", "token");

    expect(result.status).toBe("completed");
  });

  it("correctly counts vulnerability severities", async () => {
    execFile
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: "", stderr: "" }))
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: trivyOutput, stderr: "" }));

    const result = await runTrivyScan("owner/repo", "token");

    expect(result.summary.critical).toBe(1);
    expect(result.summary.high).toBe(1);
    expect(result.summary.medium).toBe(1);
    expect(result.summary.low).toBe(1);
  });

  it("calculates a non-zero severityScore when vulnerabilities exist", async () => {
    execFile
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: "", stderr: "" }))
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: trivyOutput, stderr: "" }));

    const result = await runTrivyScan("owner/repo", "token");

    // CRITICAL(1)*25 + HIGH(1)*10 + MEDIUM(1)*3 = 38
    expect(result.severityScore).toBe(38);
  });

  it("caps severityScore at 100", async () => {
    const bigOutput = JSON.stringify({
      Results: [{
        Vulnerabilities: Array.from({ length: 20 }, (_, i) => ({
          VulnerabilityID: `CVE-${i}`, Severity: "CRITICAL",
          PkgName: "x", InstalledVersion: "1", FixedVersion: "2",
        })),
      }],
    });

    execFile
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: "", stderr: "" }))
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: bigOutput, stderr: "" }));

    const result = await runTrivyScan("owner/repo", "token");

    expect(result.severityScore).toBeLessThanOrEqual(100);
  });

  it("limits vulnerabilities array to 10 entries", async () => {
    const manyVulns = JSON.stringify({
      Results: [{
        Vulnerabilities: Array.from({ length: 25 }, (_, i) => ({
          VulnerabilityID: `CVE-${i}`, Severity: "HIGH",
          PkgName: "x", InstalledVersion: "1", FixedVersion: "2",
        })),
      }],
    });

    execFile
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: "", stderr: "" }))
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: manyVulns, stderr: "" }));

    const result = await runTrivyScan("owner/repo", "token");

    expect(result.vulnerabilities.length).toBeLessThanOrEqual(10);
  });

  it("returns zero score and empty arrays when Results is empty", async () => {
    const empty = JSON.stringify({ Results: [] });

    execFile
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: "", stderr: "" }))
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: empty, stderr: "" }));

    const result = await runTrivyScan("owner/repo", "token");

    expect(result.severityScore).toBe(0);
    expect(result.vulnerabilities).toHaveLength(0);
  });

  it("handles Results item with no Vulnerabilities key gracefully", async () => {
    // A result entry may represent a file type with no vulns (e.g. lockfile scan)
    const noVulnsResult = JSON.stringify({
      Results: [
        { Target: "package-lock.json" },           // no Vulnerabilities key
        { Target: "go.sum", Vulnerabilities: [] },  // empty Vulnerabilities
      ],
    });

    execFile
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: "", stderr: "" }))
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: noVulnsResult, stderr: "" }));

    const result = await runTrivyScan("owner/repo", "token");

    expect(result.status).toBe("completed");
    expect(result.severityScore).toBe(0);
    expect(result.vulnerabilities).toHaveLength(0);
  });

  it("maps non-standard severity (INFORMATIONAL) to summary.unknown", async () => {
    const weirdSeverity = JSON.stringify({
      Results: [{
        Vulnerabilities: [
          { VulnerabilityID: "CVE-X", Severity: "INFORMATIONAL", PkgName: "x",
            InstalledVersion: "1", FixedVersion: null },
        ],
      }],
    });

    execFile
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: "", stderr: "" }))
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: weirdSeverity, stderr: "" }));

    const result = await runTrivyScan("owner/repo", "token");

    // "informational" is not in the known severity list → falls to summary.unknown
    expect(result.summary.unknown).toBe(1);
    expect(result.summary.critical).toBe(0);
  });

  it("handles vuln with null Severity (defaults to unknown bucket)", async () => {
    const nullSeverity = JSON.stringify({
      Results: [{
        Vulnerabilities: [
          { VulnerabilityID: "CVE-NULL", Severity: null, PkgName: "y",
            InstalledVersion: "2", FixedVersion: null },
        ],
      }],
    });

    execFile
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: "", stderr: "" }))
      .mockImplementationOnce((cmd, args, opts, cb) => cb(null, { stdout: nullSeverity, stderr: "" }));

    const result = await runTrivyScan("owner/repo", "token");

    // null Severity → "unknown" via (vuln.Severity || "unknown") → summary.unknown
    expect(result.summary.unknown).toBe(1);
  });
});
