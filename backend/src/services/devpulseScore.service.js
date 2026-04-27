/**
 * DevPulse Score Engine v2 — Weighted Multi-Factor Model
 * ======================================================
 *
 * Factors & Weights:
 *   Security (Trivy CVEs)          40%
 *   Commit Frequency               15%
 *   Contributor Count               10%
 *   Code Churn                      10%
 *   Historical Failure Rate         15%
 *   Build & Test Gates              10%
 *
 * Risk Categories:
 *   LOW     → 80–100   (Safe to deploy)
 *   MEDIUM  → 50–79    (Review recommended)
 *   HIGH    → 0–49     (Do not deploy without remediation)
 *
 * Legacy status mapping (for UI backwards compatibility):
 *   SAFE     → 80–100
 *   WARNING  → 55–79
 *   RISKY    → 30–54
 *   CRITICAL → 0–29
 */

// ─── Factor Scoring Functions ────────────────────────────────────────────────

/**
 * Security Factor (0–100)
 * Deductions based on vulnerability severity counts.
 */
function scoreSecurityFactor(stages) {
  let score = 100;
  const details = [];

  const critical = Number(stages?.security?.critical) || 0;
  const high = Number(stages?.security?.high) || 0;
  const medium = Number(stages?.security?.medium) || 0;
  const imageVulns = Number(stages?.docker?.imageVulnerabilities) || 0;

  if (critical > 0) {
    const deduction = Math.min(critical * 12, 36);
    score -= deduction;
    details.push(`${critical} critical CVE(s): -${deduction}`);
  }
  if (high > 0) {
    const deduction = Math.min(high * 5, 15);
    score -= deduction;
    details.push(`${high} high CVE(s): -${deduction}`);
  }
  if (medium > 0) {
    const deduction = Math.min(medium * 2, 6);
    score -= deduction;
    details.push(`${medium} medium CVE(s): -${deduction}`);
  }
  if (imageVulns > 0) {
    const deduction = Math.min(imageVulns * 3, 9);
    score -= deduction;
    details.push(`${imageVulns} Docker image CVE(s): -${deduction}`);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    details: details.length > 0 ? details : ["No vulnerabilities detected"],
    totalVulnerabilities: critical + high + medium,
  };
}

/**
 * Commit Frequency Factor (0–100)
 * Active repos score high; stale repos score low.
 */
function scoreCommitFrequencyFactor(repoHealth) {
  const commitsPerWeek = repoHealth?.commitActivity?.commitsPerWeek || 0;
  let score;
  let detail;

  if (commitsPerWeek >= 7) {
    score = 100;
    detail = `Highly active: ${commitsPerWeek} commits/week`;
  } else if (commitsPerWeek >= 5) {
    score = 90;
    detail = `Active: ${commitsPerWeek} commits/week`;
  } else if (commitsPerWeek >= 3) {
    score = 75;
    detail = `Moderate activity: ${commitsPerWeek} commits/week`;
  } else if (commitsPerWeek >= 1) {
    score = 55;
    detail = `Low activity: ${commitsPerWeek} commits/week`;
  } else if (commitsPerWeek > 0) {
    score = 35;
    detail = `Minimal activity: ${commitsPerWeek} commits/week`;
  } else {
    score = 15;
    detail = "No commits in the last 30 days — repo appears stale";
  }

  return {
    score,
    details: [detail],
    commitsPerWeek,
    totalCommits: repoHealth?.commitActivity?.totalCommits || 0,
  };
}

/**
 * Contributor Count Factor (0–100)
 * Solo projects score lower; collaborative projects score higher.
 */
function scoreContributorFactor(repoHealth) {
  const count = repoHealth?.contributors?.count || 1;
  let score;
  let detail;

  if (count >= 5) {
    score = 100;
    detail = `Strong team: ${count} contributors`;
  } else if (count >= 3) {
    score = 85;
    detail = `Healthy collaboration: ${count} contributors`;
  } else if (count === 2) {
    score = 65;
    detail = `Small team: ${count} contributors`;
  } else {
    score = 40;
    detail = "Solo project — single point of failure risk";
  }

  return {
    score,
    details: [detail],
    count,
  };
}

/**
 * Code Churn Factor (0–100)
 * Moderate churn is healthy; extreme churn is risky; zero churn is stale.
 */
function scoreCodeChurnFactor(repoHealth) {
  const churn = repoHealth?.commitActivity?.codeChurn || 0;
  const commits = repoHealth?.commitActivity?.totalCommits || 0;
  const avgChurnPerCommit = commits > 0 ? Math.round(churn / commits) : 0;
  let score;
  let detail;

  if (commits === 0) {
    score = 20;
    detail = "No code changes detected in the last 30 days";
  } else if (avgChurnPerCommit <= 50) {
    score = 100;
    detail = `Clean, small commits: avg ${avgChurnPerCommit} lines/commit`;
  } else if (avgChurnPerCommit <= 150) {
    score = 85;
    detail = `Moderate changes: avg ${avgChurnPerCommit} lines/commit`;
  } else if (avgChurnPerCommit <= 500) {
    score = 60;
    detail = `High churn: avg ${avgChurnPerCommit} lines/commit — review recommended`;
  } else {
    score = 35;
    detail = `Extreme churn: avg ${avgChurnPerCommit} lines/commit — high risk of regression`;
  }

  return {
    score,
    details: [detail],
    totalChurn: churn,
    avgChurnPerCommit,
  };
}

/**
 * Historical Failure Rate Factor (0–100)
 * Calculated from past pipeline results for this repository.
 */
function scoreHistoricalFailureRateFactor(pipelineHistory) {
  if (!pipelineHistory || pipelineHistory.length === 0) {
    return {
      score: 70, // Neutral — no history yet
      details: ["No pipeline history available — neutral score applied"],
      totalRuns: 0,
      failureRate: 0,
    };
  }

  const totalRuns = pipelineHistory.length;
  const failures = pipelineHistory.filter(r => r.overallStatus === "failure").length;
  const failureRate = Math.round((failures / totalRuns) * 100);

  let score;
  let detail;

  if (failureRate === 0) {
    score = 100;
    detail = `Perfect record: 0% failure rate across ${totalRuns} runs`;
  } else if (failureRate <= 10) {
    score = 90;
    detail = `Excellent: ${failureRate}% failure rate (${failures}/${totalRuns} runs)`;
  } else if (failureRate <= 25) {
    score = 70;
    detail = `Moderate: ${failureRate}% failure rate (${failures}/${totalRuns} runs)`;
  } else if (failureRate <= 50) {
    score = 45;
    detail = `Concerning: ${failureRate}% failure rate (${failures}/${totalRuns} runs)`;
  } else {
    score = 20;
    detail = `Critical: ${failureRate}% failure rate (${failures}/${totalRuns} runs)`;
  }

  return {
    score,
    details: [detail],
    totalRuns,
    failureRate,
  };
}

/**
 * Build & Test Gates Factor (0–100)
 * Pass/fail of backend tests, frontend build, Docker build.
 */
function scoreBuildGatesFactor(stages) {
  let score = 100;
  const details = [];

  if (stages?.backend?.tests === "failure") {
    score -= 40;
    details.push("Backend tests failed: -40");
  }
  if (stages?.frontend?.build === "failure") {
    score -= 30;
    details.push("Frontend build failed: -30");
  }
  if (stages?.frontend?.tests === "failure") {
    score -= 15;
    details.push("Frontend tests failed: -15");
  }
  if (stages?.docker?.build === "failure") {
    score -= 15;
    details.push("Docker build failed: -15");
  }

  return {
    score: Math.max(0, score),
    details: details.length > 0 ? details : ["All build and test gates passed"],
  };
}

// ─── Main Score Calculator ───────────────────────────────────────────────────

const FACTOR_WEIGHTS = {
  security: 0.40,
  commitFrequency: 0.15,
  contributors: 0.10,
  codeChurn: 0.10,
  historicalFailureRate: 0.15,
  buildGates: 0.10,
};

/**
 * Calculate the enhanced DevPulse Score using a weighted multi-factor model.
 *
 * @param {Object} stages - Pipeline stage results (tests, builds, security scan)
 * @param {Object} repoHealth - GitHub health metrics from fetchRepoHealth()
 * @param {Array}  pipelineHistory - Past pipeline results for this repository
 */
function calculateDevPulseScore(stages, repoHealth = null, pipelineHistory = []) {
  // Score each factor independently (0–100)
  const securityResult = scoreSecurityFactor(stages);
  const commitResult = scoreCommitFrequencyFactor(repoHealth);
  const contributorResult = scoreContributorFactor(repoHealth);
  const churnResult = scoreCodeChurnFactor(repoHealth);
  const historyResult = scoreHistoricalFailureRateFactor(pipelineHistory);
  const buildResult = scoreBuildGatesFactor(stages);

  // Build factors object with weighted scores
  const factors = {
    security: {
      score: securityResult.score,
      weight: FACTOR_WEIGHTS.security,
      weighted: Math.round(securityResult.score * FACTOR_WEIGHTS.security * 10) / 10,
      details: securityResult.details,
      totalVulnerabilities: securityResult.totalVulnerabilities,
    },
    commitFrequency: {
      score: commitResult.score,
      weight: FACTOR_WEIGHTS.commitFrequency,
      weighted: Math.round(commitResult.score * FACTOR_WEIGHTS.commitFrequency * 10) / 10,
      details: commitResult.details,
      commitsPerWeek: commitResult.commitsPerWeek,
      totalCommits: commitResult.totalCommits,
    },
    contributors: {
      score: contributorResult.score,
      weight: FACTOR_WEIGHTS.contributors,
      weighted: Math.round(contributorResult.score * FACTOR_WEIGHTS.contributors * 10) / 10,
      details: contributorResult.details,
      count: contributorResult.count,
    },
    codeChurn: {
      score: churnResult.score,
      weight: FACTOR_WEIGHTS.codeChurn,
      weighted: Math.round(churnResult.score * FACTOR_WEIGHTS.codeChurn * 10) / 10,
      details: churnResult.details,
      totalChurn: churnResult.totalChurn,
      avgChurnPerCommit: churnResult.avgChurnPerCommit,
    },
    historicalFailureRate: {
      score: historyResult.score,
      weight: FACTOR_WEIGHTS.historicalFailureRate,
      weighted: Math.round(historyResult.score * FACTOR_WEIGHTS.historicalFailureRate * 10) / 10,
      details: historyResult.details,
      totalRuns: historyResult.totalRuns,
      failureRate: historyResult.failureRate,
    },
    buildGates: {
      score: buildResult.score,
      weight: FACTOR_WEIGHTS.buildGates,
      weighted: Math.round(buildResult.score * FACTOR_WEIGHTS.buildGates * 10) / 10,
      details: buildResult.details,
    },
  };

  // Calculate final weighted score
  const finalScore = Math.max(0, Math.min(100, Math.round(
    factors.security.weighted +
    factors.commitFrequency.weighted +
    factors.contributors.weighted +
    factors.codeChurn.weighted +
    factors.historicalFailureRate.weighted +
    factors.buildGates.weighted
  )));

  // Risk category (new)
  let riskCategory;
  if (finalScore >= 80) {
    riskCategory = "LOW";
  } else if (finalScore >= 50) {
    riskCategory = "MEDIUM";
  } else {
    riskCategory = "HIGH";
  }

  // Legacy status (backwards compatible with existing UI)
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

  // Build legacy breakdown array for backwards compatibility
  const breakdown = [];
  Object.entries(factors).forEach(([name, factor]) => {
    factor.details.forEach(detail => {
      if (!detail.includes("passed") && !detail.includes("No vulnerabilities")) {
        breakdown.push({
          check: name.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim(),
          impact: Math.round(factor.weighted - (factor.weight * 100)),
          reason: detail,
        });
      }
    });
  });

  return {
    score: finalScore,
    riskCategory,
    status,
    statusColor,
    factors,
    breakdown,
    totalVulnerabilities: securityResult.totalVulnerabilities,
    computedAt: new Date().toISOString(),
  };
}

// ─── Pipeline Insights Generator ─────────────────────────────────────────────

/**
 * Generate plain-English AI insights from pipeline data.
 * Now includes insights from all 6 scoring factors.
 */
function generatePipelineInsights(stages, score, repoHealth = null) {
  const issues = [];
  const suggestions = [];
  const rootCauses = [];

  const critical = Number(stages?.security?.critical) || 0;
  const high = Number(stages?.security?.high) || 0;
  const medium = Number(stages?.security?.medium) || 0;
  const imageVulns = Number(stages?.docker?.imageVulnerabilities) || 0;
  const vulns = Array.isArray(stages?.security?.vulnerabilities) ? stages.security.vulnerabilities : [];

  // ─── Security insights ─────────────────────────────────────
  if (stages?.backend?.tests === "failure") {
    issues.push("Backend test suite failed.");
    suggestions.push("Run `npm test` locally and fix failing assertions before pushing.");
    rootCauses.push("Backend tests failed, indicating a regression in application logic or breaking API contract changes.");
  }

  if (stages?.frontend?.build === "failure") {
    issues.push("Frontend production build failed.");
    suggestions.push("Check the frontend-logs artifact for TypeScript or Vite build errors.");
    rootCauses.push("Frontend Vite build failed, likely due to missing environment variables or import errors in the React codebase.");
  }

  if (stages?.docker?.build === "failure") {
    issues.push("Docker image build failed.");
    suggestions.push("Test the build locally with `docker build -f backend/Dockerfile ./backend`.");
    rootCauses.push("Docker multi-stage build failed. Check that all required source files are present and the Dockerfile paths are correct.");
  }

  if (critical > 0) {
    issues.push(`${critical} critical CVE(s) found in project dependencies.`);
    suggestions.push(`Run \`npm audit fix --force\` in the affected workspace to auto-patch critical vulnerabilities.`);
    rootCauses.push(`${critical} critical CVE(s) detected by Trivy filesystem scan. These must be patched immediately.`);
  }

  if (high > 0) {
    issues.push(`${high} high-severity CVE(s) detected.`);
    suggestions.push("Update affected packages to their latest patched versions using `npm update`.");
    rootCauses.push(`${high} high-severity CVE(s) pose a significant risk and should be patched in the next release.`);
  }

  if (medium > 0) {
    issues.push(`${medium} medium-severity CVE(s) detected.`);
    suggestions.push("Schedule a dependency audit sprint to address medium vulnerabilities over the next development cycle.");
    rootCauses.push(`${medium} medium-severity CVE(s) found.`);
  }

  if (imageVulns > 0) {
    issues.push(`${imageVulns} vulnerabilities found in the Docker image.`);
    suggestions.push("Consider using a distroless or scratch base image to reduce the attack surface.");
    rootCauses.push(`${imageVulns} vulnerabilities originate from the base Docker image OS.`);
  }

  if (vulns.length > 0) {
    const vulnNames = vulns.map(v => `${v.id} (${v.pkgName})`).join(", ");
    issues.push(`Actionable Vulnerabilities: ${vulnNames}.`);
    vulns.forEach(v => {
      suggestions.push(`Upgrade package '${v.pkgName}' to version ${v.fixedVersion || 'latest'} to resolve ${v.id}.`);
    });
  }

  // ─── Repository health insights (new in v2) ───────────────
  if (repoHealth) {
    const cpw = repoHealth?.commitActivity?.commitsPerWeek || 0;
    const contribs = repoHealth?.contributors?.count || 1;
    const avgChurn = repoHealth?.commitActivity?.totalCommits > 0
      ? Math.round(repoHealth.commitActivity.codeChurn / repoHealth.commitActivity.totalCommits)
      : 0;

    if (cpw < 1) {
      issues.push("Repository appears stale with no commits in the last 30 days.");
      suggestions.push("Consider archiving this repository if it is no longer actively maintained, or schedule regular maintenance commits.");
      rootCauses.push("Stale repository with zero recent commit activity increases the risk of unpatched vulnerabilities.");
    } else if (cpw < 3) {
      suggestions.push(`Low commit frequency (${cpw}/week). Increasing development cadence would improve the health score.`);
    }

    if (contribs === 1) {
      issues.push("Single contributor — no code review coverage.");
      suggestions.push("Add at least one additional contributor or enable branch protection rules requiring PR reviews.");
      rootCauses.push("Solo development without code review increases the risk of undetected bugs reaching production.");
    }

    if (avgChurn > 500) {
      issues.push(`Extremely high code churn (avg ${avgChurn} lines/commit).`);
      suggestions.push("Break large changes into smaller, focused commits. Consider adopting a feature-branch workflow to isolate risky changes.");
      rootCauses.push("Large code changes per commit significantly increase the probability of regression bugs.");
    }
  }

  // ─── Historical failure insights ───────────────────────────
  if (score.factors?.historicalFailureRate?.failureRate > 25) {
    const rate = score.factors.historicalFailureRate.failureRate;
    issues.push(`${rate}% historical pipeline failure rate.`);
    suggestions.push("Investigate recurring failure patterns. Consider adding pre-commit hooks and improving test coverage to reduce failure frequency.");
    rootCauses.push(`A ${rate}% failure rate across past pipeline runs indicates systemic issues with code quality or CI/CD configuration.`);
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
      riskCategory: score.riskCategory,
      status: score.status,
    };
  }

  const explanation =
    `DevPulse detected ${issues.length} issue(s) in this pipeline run. ` +
    `The repository scored ${score.score}/100 (Risk: ${score.riskCategory}, Status: ${score.status}). ` +
    issues.join(" ");

  return {
    explanation,
    rootCause: rootCauses.length > 0 ? rootCauses.join(" ") : "Multiple pipeline checks failed. Review each stage's logs for details.",
    issues,
    suggestions: [...new Set(suggestions)].slice(0, 10),
    score: score.score,
    riskCategory: score.riskCategory,
    status: score.status,
  };
}

module.exports = { calculateDevPulseScore, generatePipelineInsights };
