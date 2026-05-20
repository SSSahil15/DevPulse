const crypto = require("crypto");
const { scanJobDB, pipelineDB } = require("../db/database");
const { runTrivyScan }           = require("./security.service");
const { fetchRepoHealth }        = require("./github.service");
const redis                      = require("./redis.service");
const logger                     = require("../utils/logger");
const {
  calculateDevPulseScore,
  generatePipelineInsights,
} = require("./devpulseScore.service");


/**
 * Scan Job Service — Async Trivy scanning with SQLite job tracking.
 *
 * Flow:
 *   1. POST /simulate → createAndDispatchJob() → returns jobId immediately (202)
 *   2. Background worker runs Trivy + scoring, updates job to 'done' or 'failed'
 *   3. Frontend polls GET /simulate/status/:jobId every 2s until done
 */

function generateJobId() {
  return `job_${crypto.randomBytes(8).toString("hex")}`;
}

/**
 * Creates a pending scan job in DB and fires off the background worker.
 * Returns the jobId immediately — does NOT await the scan.
 */
async function createAndDispatchJob(repositoryFullName, githubAccessToken) {
  const jobId = generateJobId();
  await scanJobDB.create(jobId, repositoryFullName);

  // Fire and forget — run in background
  _processJob(jobId, repositoryFullName, githubAccessToken).catch(async (err) => {
    logger.error(`[ScanJob] Unhandled error in job ${jobId}`, { error: err.message });
    await scanJobDB.markFailed(jobId, err.message);
  });

  return jobId;
}

/**
 * Background worker — runs the full pipeline simulation for a job.
 */
async function _processJob(jobId, repositoryFullName, githubAccessToken) {
  await scanJobDB.markProcessing(jobId);

  // Invalidate cached repository data so next request fetches fresh simulation results
  await redis.del(`repo:${repositoryFullName}`);
  await redis.del(`repo:health:${repositoryFullName}`);

  try {
    // Run real Trivy scan + GitHub health metrics in parallel
    const [securityScan, repoHealth] = await Promise.all([
      runTrivyScan(repositoryFullName, githubAccessToken),
      fetchRepoHealth(githubAccessToken, repositoryFullName),
    ]);

    const runId = Math.floor(Math.random() * 10000000).toString();

    const stages = {
      backend: { tests: "success" },
      frontend: { build: "success", tests: "success" },
      docker: {
        build: "success",
        imageSize: "450MB",
        imageVulnerabilities: securityScan.summary?.unknown || 0,
      },
      security: {
        critical: securityScan.summary?.critical || 0,
        high: securityScan.summary?.high || 0,
        medium: securityScan.summary?.medium || 0,
        vulnerabilities: securityScan.vulnerabilities || [],
      },
    };

    const overallStatus = stages.security.critical > 0 ? "failure" : "success";

    // Pull repo's existing history for failure-rate factor.
    // 'summary' columns: omits stages+insights JSONB — only overallStatus needed.
    // limit:20 is enough for a statistically meaningful failure-rate sample.
    const repoHistory = await pipelineDB.findFiltered({
      repository: repositoryFullName,
      limit:      20,
      columns:    "summary",
    });
    const devpulseScore = calculateDevPulseScore(stages, repoHealth, repoHistory);
    const insights = generatePipelineInsights(stages, devpulseScore, repoHealth);

    const record = {
      id: `sim-${runId}-${Date.now()}`,
      repository: repositoryFullName,
      commitSha: crypto.randomBytes(6).toString("hex"),
      commitMessage: `Simulated commit ${crypto.randomBytes(3).toString("hex")}`,
      branch: "main",
      triggeredBy: "DevPulse Simulator",
      runId,
      runUrl: null,
      event: "push",
      timestamp: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      overallStatus,
      stages,
      devpulseScore,
      insights,
    };

    await pipelineDB.insert(record);
    await scanJobDB.markDone(jobId, { record });

    logger.info(`[ScanJob] ${jobId} completed`, { score: devpulseScore.score, status: devpulseScore.status });
  } catch (err) {
    logger.error(`[ScanJob] ${jobId} failed`, { error: err.message });
    await scanJobDB.markFailed(jobId, err.message);
  }
}

/**
 * Returns the current status of a scan job.
 *
 * @param {string} jobId
 * @param {object} [opts]
 * @param {boolean} [opts.lite=false] - Pass true to skip loading the result JSONB
 *   (faster for status-polling; use false when you need the full result payload).
 */
async function getJobStatus(jobId, { lite = false } = {}) {
  return await scanJobDB.getById(jobId, { lite });
}

module.exports = { createAndDispatchJob, getJobStatus };
