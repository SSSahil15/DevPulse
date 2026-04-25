/**
 * DevPulse Score Engine
 * =====================
 * Calculates a 0–100 score from CI/CD pipeline results.
 *
 * Score breakdown (deductions from 100):
 *   Backend tests failed     → -25
 *   Frontend build failed    → -20
 *   Docker build failed      → -10
 *   Critical CVE each        → -12 (capped at -36)
 *   High CVE each            → -5  (capped at -15)
 *   Medium CVE each          → -2  (capped at -6)
 *   Docker image CVEs each   → -3  (capped at -9)
 *
 * Status:
 *   SAFE      → 80–100
 *   WARNING   → 55–79
 *   RISKY     → 30–54
 *   CRITICAL  → 0–29
 */

function calculateDevPulseScore(stages) {
  let score = 100;
  const breakdown = [];

  // ─── Test & build gates ────────────────────────────────────
  if (stages?.backend?.tests === "failure") {
    score -= 25;
    breakdown.push({ check: "Backend Tests", impact: -25, reason: "Tests failed" });
  }

  if (stages?.frontend?.build === "failure") {
    score -= 20;
    breakdown.push({ check: "Frontend Build", impact: -20, reason: "Build failed" });
  }

  if (stages?.frontend?.tests === "failure") {
    score -= 10;
    breakdown.push({ check: "Frontend Tests", impact: -10, reason: "Tests failed" });
  }

  if (stages?.docker?.build === "failure") {
    score -= 10;
    breakdown.push({ check: "Docker Build", impact: -10, reason: "Image build failed" });
  }

  // ─── Security deductions ───────────────────────────────────
  const critical = Number(stages?.security?.critical) || 0;
  const high = Number(stages?.security?.high) || 0;
  const medium = Number(stages?.security?.medium) || 0;
  const imageVulns = Number(stages?.docker?.imageVulnerabilities) || 0;

  if (critical > 0) {
    const deduction = Math.min(critical * 12, 36);
    score -= deduction;
    breakdown.push({ check: "Critical CVEs", impact: -deduction, reason: `${critical} critical vulnerabilities in dependencies` });
  }

  if (high > 0) {
    const deduction = Math.min(high * 5, 15);
    score -= deduction;
    breakdown.push({ check: "High CVEs", impact: -deduction, reason: `${high} high-severity vulnerabilities` });
  }

  if (medium > 0) {
    const deduction = Math.min(medium * 2, 6);
    score -= deduction;
    breakdown.push({ check: "Medium CVEs", impact: -deduction, reason: `${medium} medium-severity vulnerabilities` });
  }

  if (imageVulns > 0) {
    const deduction = Math.min(imageVulns * 3, 9);
    score -= deduction;
    breakdown.push({ check: "Docker Image CVEs", impact: -deduction, reason: `${imageVulns} vulnerabilities in Docker image` });
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  let status;
  let statusColor;
  if (finalScore >= 80) {
    status = "SAFE";
    statusColor = "green";
  } else if (finalScore >= 55) {
    status = "WARNING";
    statusColor = "amber";
  } else if (finalScore >= 30) {
    status = "RISKY";
    statusColor = "orange";
  } else {
    status = "CRITICAL";
    statusColor = "red";
  }

  return {
    score: finalScore,
    status,
    statusColor,
    breakdown,
    totalVulnerabilities: critical + high + medium,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Generate plain-English AI insights from pipeline data.
 * In production this would call the AI engine; this deterministic
 * version runs in the backend with no external dependency.
 */
function generatePipelineInsights(stages, score) {
  const issues = [];
  const suggestions = [];
  let rootCause = null;

  const critical = Number(stages?.security?.critical) || 0;
  const high = Number(stages?.security?.high) || 0;
  const medium = Number(stages?.security?.medium) || 0;
  const imageVulns = Number(stages?.docker?.imageVulnerabilities) || 0;

  // ─── Detect issues & generate root cause ───────────────────
  if (stages?.backend?.tests === "failure") {
    issues.push("Backend test suite failed.");
    suggestions.push("Review the backend-logs artifact in GitHub Actions to identify which test cases failed.");
    suggestions.push("Run `npm test` locally and fix failing assertions before pushing.");
    if (!rootCause) rootCause = "Backend tests failed, indicating a regression in application logic or breaking API contract changes.";
  }

  if (stages?.frontend?.build === "failure") {
    issues.push("Frontend production build failed.");
    suggestions.push("Check the frontend-logs artifact for TypeScript or Vite build errors.");
    suggestions.push("Ensure all imported modules and environment variables are correctly defined.");
    if (!rootCause) rootCause = "Frontend Vite build failed, likely due to missing environment variables or import errors in the React codebase.";
  }

  if (stages?.docker?.build === "failure") {
    issues.push("Docker image build failed.");
    suggestions.push("Review the docker-reports artifact. Common causes: missing files, invalid COPY paths, or network timeouts.");
    suggestions.push("Test the build locally with `docker build -f backend/Dockerfile ./backend`.");
    if (!rootCause) rootCause = "Docker multi-stage build failed. Check that all required source files are present and the Dockerfile paths are correct.";
  }

  if (critical > 0) {
    issues.push(`${critical} critical CVE(s) found in project dependencies.`);
    suggestions.push(`Run \`npm audit fix --force\` in the affected workspace to auto-patch critical vulnerabilities.`);
    suggestions.push("Review the security-reports artifact for exact package names and CVE IDs, then update or replace the vulnerable packages.");
    if (!rootCause) rootCause = `${critical} critical CVE(s) detected by Trivy filesystem scan. These vulnerabilities could be exploited in production and must be patched before deployment.`;
  }

  if (high > 0) {
    issues.push(`${high} high-severity CVE(s) detected.`);
    suggestions.push("Update affected packages to their latest patched versions using `npm update`.");
  }

  if (medium > 0) {
    issues.push(`${medium} medium-severity CVE(s) detected.`);
    suggestions.push("Schedule a dependency audit sprint to address medium vulnerabilities over the next development cycle.");
  }

  if (imageVulns > 0) {
    issues.push(`${imageVulns} vulnerabilities found in the Docker image.`);
    suggestions.push("Consider using a distroless or scratch base image to reduce the attack surface.");
    suggestions.push("Pin base image versions and regularly rebuild images to pick up OS-level security patches.");
  }

  // ─── All-clear case ────────────────────────────────────────
  if (issues.length === 0) {
    return {
      explanation: "All pipeline stages completed successfully. No vulnerabilities or failures detected.",
      rootCause: null,
      issues: [],
      suggestions: [
        "Pipeline is healthy. Consider adding integration tests to further increase confidence.",
        "Review code coverage reports to identify untested code paths.",
        "Enable Dependabot to automatically open PRs for dependency updates.",
      ],
      score: score.score,
      status: score.status,
    };
  }

  const explanation =
    `DevPulse detected ${issues.length} issue(s) in this pipeline run. ` +
    `The repository scored ${score.score}/100 (${score.status}). ` +
    issues.join(" ");

  return {
    explanation,
    rootCause: rootCause || "Multiple pipeline checks failed. Review each stage's logs for details.",
    issues,
    suggestions: [...new Set(suggestions)].slice(0, 5), // deduplicate, cap at 5
    score: score.score,
    status: score.status,
  };
}

module.exports = { calculateDevPulseScore, generatePipelineInsights };
