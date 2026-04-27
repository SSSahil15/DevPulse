const { exec } = require("child_process");
const path = require("path");
const fs = require("fs").promises;
const util = require("util");
const execPromise = util.promisify(exec);

const SCANS_DIR = path.join(__dirname, "../../.temp_scans");

async function runTrivyScan(repositoryFullName, githubToken) {
  const scanId = `${Date.now()}-${repositoryFullName.replace("/", "-")}`;
  const repoPath = path.join(SCANS_DIR, scanId);
  const cloneUrl = `https://x-access-token:${githubToken}@github.com/${repositoryFullName}.git`;

  try {
    // 1. Ensure scans directory exists
    await fs.mkdir(SCANS_DIR, { recursive: true });

    // 2. Clone the repository (shallow clone for speed)
    console.log(`Cloning ${repositoryFullName} for security scan...`);
    await execPromise(`git clone --depth 1 ${cloneUrl} ${repoPath}`);

    // 3. Run Trivy scan
    console.log(`Running Trivy scan on ${repoPath}...`);
    const { stdout } = await execPromise(`trivy repo --format json ${repoPath}`);
    
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
      await execPromise(`rm -rf ${repoPath}`);
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
