const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs").promises;
const crypto = require("crypto");
const util = require("util");
const execFilePromise = util.promisify(execFile);

const SCANS_DIR = path.join(__dirname, "../../.temp_scans");

async function runTrivyScan(repositoryFullName, githubToken) {
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repositoryFullName)) {
    return {
      status: "error",
      severityScore: 0,
      summary: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
      vulnerabilities: [],
      error: "Invalid repository full name."
    };
  }

  const scanId = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const repoPath = path.join(SCANS_DIR, scanId);
  const cloneUrl = `https://github.com/${repositoryFullName}.git`;
  const authHeader = Buffer
    .from(`x-access-token:${githubToken}`, "utf8")
    .toString("base64");

  try {
    // 1. Ensure scans directory exists
    await fs.mkdir(SCANS_DIR, { recursive: true });

    // 2. Clone the repository (shallow clone for speed)
    console.log(`Cloning ${repositoryFullName} for security scan...`);
    await execFilePromise("git", [
      "-c",
      `http.https://github.com/.extraheader=AUTHORIZATION: basic ${authHeader}`,
      "clone",
      "--depth",
      "1",
      cloneUrl,
      repoPath,
    ], { maxBuffer: 1024 * 1024 });

    // 3. Run Trivy scan
    console.log(`Running Trivy scan on ${repoPath}...`);
    const { stdout } = await execFilePromise("trivy", [
      "repo",
      "--format",
      "json",
      repoPath,
    ], { maxBuffer: 20 * 1024 * 1024 });
    
    const trivyOutput = JSON.parse(stdout);
    return parseTrivyResults(trivyOutput);
  } catch (error) {
    console.error("Security scan failed:", error.message);
    return {
      status: "error",
      severityScore: 0,
      summary: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
      vulnerabilities: [],
      error: error.message
    };
  } finally {
    // 4. Cleanup: Remove the cloned repo
    try {
      await fs.rm(repoPath, { recursive: true, force: true });
      console.log(`Cleaned up scan directory: ${repoPath}`);
    } catch (cleanupError) {
      console.error("Failed to cleanup scan directory:", cleanupError.message);
    }
  }
}

function parseTrivyResults(output) {
  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0
  };

  const vulnerabilities = [];

  if (output.Results) {
    output.Results.forEach(result => {
      if (result.Vulnerabilities) {
        result.Vulnerabilities.forEach(vuln => {
          const severity = (vuln.Severity || "unknown").toLowerCase();
          if (summary.hasOwnProperty(severity)) {
            summary[severity]++;
          } else {
            summary.unknown++;
          }

          if (vulnerabilities.length < 10) {
            vulnerabilities.push({
              id: vuln.VulnerabilityID,
              title: vuln.Title,
              severity: vuln.Severity,
              pkgName: vuln.PkgName,
              installedVersion: vuln.InstalledVersion,
              fixedVersion: vuln.FixedVersion
            });
          }
        });
      }
    });
  }

  // Calculate a basic severity score (0-100)
  const severityScore = Math.min(
    (summary.critical * 25) + (summary.high * 10) + (summary.medium * 3),
    100
  );

  return {
    status: "completed",
    severityScore,
    summary,
    vulnerabilities
  };
}

module.exports = {
  runTrivyScan
};
