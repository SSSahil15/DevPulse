const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// ─── File-based Report Storage ───────────────────────────────────────────────
const REPORTS_FILE = path.join(__dirname, "../..", ".data", "reports.json");

const dataDir = path.dirname(REPORTS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let reportsDatabase = [];
if (fs.existsSync(REPORTS_FILE)) {
  try {
    reportsDatabase = JSON.parse(fs.readFileSync(REPORTS_FILE, "utf-8"));
  } catch (err) {
    console.error("[Reports DB] Failed to parse reports file, starting fresh.");
    reportsDatabase = [];
  }
}

function saveReportsDatabase() {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(reportsDatabase, null, 2), "utf-8");
}

/**
 * Generate a cryptographically secure share token.
 */
function generateShareToken() {
  return `dp_rpt_${crypto.randomBytes(12).toString("hex")}`;
}

/**
 * Create a shareable report snapshot.
 *
 * @param {Object} params
 * @param {string} params.repository - Full repo name (e.g. "SSSahil15/DevPulse")
 * @param {Object} params.repoMeta - Stars, forks, description, language, etc.
 * @param {Object} params.devpulseScore - Full score object with factors
 * @param {Object} params.stages - Pipeline stage results
 * @param {Object} params.insights - AI insights object
 * @param {string} params.createdBy - GitHub username of the creator
 * @returns {Object} The created report record
 */
function createReport({ repository, repoMeta, devpulseScore, stages, insights, createdBy }) {
  const token = generateShareToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const report = {
    token,
    repository,
    repoMeta: {
      description: repoMeta?.description || null,
      language: repoMeta?.language || null,
      stargazersCount: repoMeta?.stargazersCount || 0,
      forksCount: repoMeta?.forksCount || 0,
      defaultBranch: repoMeta?.defaultBranch || "main",
      htmlUrl: repoMeta?.htmlUrl || null,
    },
    devpulseScore: devpulseScore || null,
    stages: stages || null,
    insights: insights || null,
    createdBy: createdBy || "anonymous",
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  reportsDatabase.push(report);
  saveReportsDatabase();

  console.log(`[Reports] Created shareable report for ${repository} (token: ${token})`);
  return report;
}

/**
 * Retrieve a report by its share token.
 * Returns null if not found or expired.
 */
function getReportByToken(token) {
  const report = reportsDatabase.find(r => r.token === token);
  if (!report) return null;

  // Check expiration
  if (new Date(report.expiresAt) < new Date()) {
    return { expired: true, repository: report.repository, expiresAt: report.expiresAt };
  }

  return report;
}

module.exports = {
  createReport,
  getReportByToken,
};
