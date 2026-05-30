const crypto = require('crypto');
const { reportDB } = require('../db/database');

/**
 * Generate a cryptographically secure share token.
 */
function generateShareToken() {
  return `dp_rpt_${crypto.randomBytes(12).toString('hex')}`;
}

/**
 * Create a shareable report snapshot (persisted to PostgreSQL).
 */
async function createReport({ repository, repoMeta, devpulseScore, stages, insights, createdBy }) {
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
      defaultBranch: repoMeta?.defaultBranch || 'main',
      htmlUrl: repoMeta?.htmlUrl || null,
    },
    devpulseScore: devpulseScore || null,
    stages: stages || null,
    insights: insights || null,
    createdBy: createdBy || 'anonymous',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await reportDB.insert(report);
  console.log(
    `[Reports] Created shareable report for ${repository} (token: ${token}), expires ${expiresAt.toDateString()}`,
  );
  return report;
}

/**
 * Retrieve a report by its share token.
 * Checks expiry and returns { expired: true } if past TTL.
 */
async function getReportByToken(token) {
  const report = await reportDB.getByToken(token);
  if (!report) return null;

  if (new Date(report.expiresAt) < new Date()) {
    return { expired: true, repository: report.repository, expiresAt: report.expiresAt };
  }

  return report;
}

module.exports = { createReport, getReportByToken };
