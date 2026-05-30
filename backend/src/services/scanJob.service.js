const crypto = require('crypto');
const { scanJobDB, pipelineDB } = require('../db/database');
const { runTrivyScan } = require('./security.service');
const { runTrivyScanWithStream } = require('./trivyStream.service');
const { fetchRepoHealth } = require('./github.service');
const redis = require('./redis.service');
const { pubClient } = require('../config/redis');
const { cacheEvent, clearCache } = require('./scanEventCache.service');
const logger = require('../utils/logger');
const { calculateDevPulseScore, generatePipelineInsights } = require('./devpulseScore.service');

// Redis-backed Socket.IO emitter — same pattern as worker.js
const { Emitter } = require('@socket.io/redis-emitter');
const io = new Emitter(pubClient);

/** Emit a typed scan event to the room AND cache it for replay. */
async function _emit(room, eventType, payload) {
  const envelope = {
    eventId: crypto.randomUUID(),
    event: eventType,
    version: 1,
    timestamp: new Date().toISOString(),
    room,
    payload,
  };
  try {
    io.to(room).emit('scan:event', envelope);
    await cacheEvent(room, envelope);
  } catch (err) {
    logger.warn(`[ScanJob] emit failed for ${eventType}: ${err.message}`);
  }
}

/**
 * Scan Job Service — Async Trivy scanning with PostgreSQL job tracking.
 *
 * Flow:
 *   1. POST /simulate → createAndDispatchJob() → returns jobId immediately (202)
 *   2. Background worker runs Trivy + scoring, updates job to 'done' or 'failed'
 *   3. Frontend polls GET /simulate/status/:jobId every 2s until done
 */

function generateJobId() {
  return `job_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Creates a pending scan job in DB and fires off the background worker.
 * Returns the jobId immediately — does NOT await the scan.
 */
async function createAndDispatchJob(repositoryFullName, githubAccessToken) {
  const jobId = generateJobId();
  await scanJobDB.create(jobId, repositoryFullName);

  // The room key must match what the frontend subscribes to
  const room = `scan_${repositoryFullName}`;

  // Fire and forget — run in background
  _processJob(jobId, repositoryFullName, githubAccessToken, room).catch(async (err) => {
    logger.error(`[ScanJob] Unhandled error in job ${jobId}`, { error: err.message });
    await scanJobDB.markFailed(jobId, err.message);
  });

  return jobId;
}

/**
 * Background worker — runs the full pipeline simulation for a job.
 * Emits real-time Socket.IO events to the scan room throughout.
 */
async function _processJob(jobId, repositoryFullName, githubAccessToken, room) {
  await scanJobDB.markProcessing(jobId);

  // Invalidate cached repository data so next request fetches fresh results
  await redis.del(`repo:${repositoryFullName}`);
  await redis.del(`repo:health:${repositoryFullName}`);

  // Brief pause: give the frontend a moment to subscribe to the room
  await new Promise((r) => setTimeout(r, 800));

  const scanStart = Date.now();
  let filesScanned = 0;
  let vulnsFound = 0;
  let depsAnalyzed = 0;

  try {
    // ── scan.started ────────────────────────────────────────────────────────
    await _emit(room, 'scan.started', {
      repository: repositoryFullName,
      jobId,
      current_phase: 'initializing',
      message: 'CI/CD simulation pipeline initialised',
    });

    // ── Clone phase ──────────────────────────────────────────────────────────
    await _emit(room, 'scan.progress', {
      repository: repositoryFullName,
      files_scanned: 0,
      total_files: null,
      current_phase: 'cloning',
      elapsed_ms: Date.now() - scanStart,
      message: 'Cloning repository for security scan...',
    });

    // ── Run Trivy with streaming callbacks ───────────────────────────────────
    const [securityScan, repoHealth] = await Promise.all([
      runTrivyScanWithStream(repositoryFullName, githubAccessToken, {
        onCloneStarted: async () => {
          await _emit(room, 'scan.progress', {
            repository: repositoryFullName,
            files_scanned: 0,
            total_files: null,
            current_phase: 'cloning',
            elapsed_ms: Date.now() - scanStart,
            message: 'Shallow clone initiated...',
          });
        },

        onCloneComplete: async () => {
          await _emit(room, 'scan.progress', {
            repository: repositoryFullName,
            files_scanned: 0,
            total_files: null,
            current_phase: 'scanning',
            elapsed_ms: Date.now() - scanStart,
            message: 'Clone complete. Trivy scanner starting...',
          });
        },

        onScanStarted: async () => {
          await _emit(room, 'scan.started', {
            repository: repositoryFullName,
            jobId,
            current_phase: 'scanning',
            message: 'Trivy vulnerability scanner running',
          });
        },

        onDependencyAnalyzed: async (target, vulnCount, ecosystem) => {
          depsAnalyzed++;
          filesScanned++;
          await _emit(room, 'dependency.analyzed', {
            repository: repositoryFullName,
            target,
            ecosystem,
            vuln_count: vulnCount,
            deps_done: depsAnalyzed,
            elapsed_ms: Date.now() - scanStart,
            message: `Analysed ${target} (${ecosystem})`,
          });
          await _emit(room, 'scan.progress', {
            repository: repositoryFullName,
            files_scanned: filesScanned,
            total_files: null,
            current_phase: 'scanning',
            elapsed_ms: Date.now() - scanStart,
            message: `Scanning... ${filesScanned} files processed`,
          });
        },

        onVulnerabilityFound: async (vuln) => {
          vulnsFound++;
          await _emit(room, 'vulnerability.detected', {
            repository: repositoryFullName,
            severity: vuln.severity,
            package: vuln.pkgName,
            cve: vuln.id,
            title: vuln.title,
            installed_version: vuln.installedVersion,
            fixed_version: vuln.fixedVersion,
            ecosystem: vuln.ecosystem,
            cvss_score: vuln.cvssScore,
            fix_available: !!vuln.fixedVersion,
            total_found: vulnsFound,
            elapsed_ms: Date.now() - scanStart,
          });
        },

        onScanComplete: async () => {
          await _emit(room, 'scan.progress', {
            repository: repositoryFullName,
            files_scanned: filesScanned,
            total_files: filesScanned,
            current_phase: 'scoring',
            elapsed_ms: Date.now() - scanStart,
            message: `Trivy scan complete. ${vulnsFound} vulnerabilities found. Scoring...`,
          });
        },

        onError: async (err) => {
          logger.warn(`[ScanJob] Trivy streaming error: ${err.message}`);
        },
      }),
      fetchRepoHealth(githubAccessToken, repositoryFullName),
    ]);

    const runId = Math.floor(Math.random() * 10000000).toString();

    const stages = {
      backend: { tests: 'success' },
      frontend: { build: 'success', tests: 'success' },
      docker: {
        build: 'success',
        imageSize: '450MB',
        imageVulnerabilities: securityScan.summary?.unknown || 0,
      },
      security: {
        critical: securityScan.summary?.critical || 0,
        high: securityScan.summary?.high || 0,
        medium: securityScan.summary?.medium || 0,
        vulnerabilities: securityScan.vulnerabilities || [],
      },
    };

    const overallStatus = stages.security.critical > 0 ? 'failure' : 'success';

    const repoHistory = await pipelineDB.findFiltered({
      repository: repositoryFullName,
      limit: 20,
      columns: 'summary',
    });
    const devpulseScore = calculateDevPulseScore(stages, repoHealth, repoHistory);
    const insights = generatePipelineInsights(stages, devpulseScore, repoHealth);

    const record = {
      id: `sim-${runId}-${Date.now()}`,
      repository: repositoryFullName,
      commitSha: crypto.randomBytes(6).toString('hex'),
      commitMessage: `Simulated commit ${crypto.randomBytes(3).toString('hex')}`,
      branch: 'main',
      triggeredBy: 'DevPulse Simulator',
      runId,
      runUrl: null,
      event: 'push',
      timestamp: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      overallStatus,
      stages,
      devpulseScore,
      insights,
    };

    await pipelineDB.insert(record);
    await scanJobDB.markDone(jobId, { record });

    // ── scan.completed ────────────────────────────────────────────────────────
    await _emit(room, 'scan.completed', {
      repository: repositoryFullName,
      files_scanned: filesScanned,
      vulns_found: vulnsFound,
      critical: securityScan.summary?.critical || 0,
      high: securityScan.summary?.high || 0,
      medium: securityScan.summary?.medium || 0,
      low: securityScan.summary?.low || 0,
      score: devpulseScore.score,
      status: devpulseScore.status,
      elapsed_ms: Date.now() - scanStart,
      message: 'CI/CD simulation complete',
    });

    // Legacy channel for backward-compat polling
    io.to(room).emit('scan:complete', { record });

    await clearCache(room);

    logger.info(`[ScanJob] ${jobId} completed`, {
      score: devpulseScore.score,
      status: devpulseScore.status,
    });
  } catch (err) {
    logger.error(`[ScanJob] ${jobId} failed`, { error: err.message });
    await _emit(room, 'scan.failed', {
      repository: repositoryFullName,
      error: err.message,
      code: err.code || 'SCAN_FAILED',
      elapsed_ms: Date.now() - scanStart,
      message: `Simulation failed: ${err.message}`,
    });
    io.to(room).emit('scan:error', { message: err.message });
    await clearCache(room);
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
