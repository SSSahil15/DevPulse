const { Worker, Queue } = require('bullmq');
const { redisConnection, pubClient } = require('./config/redis');
const { buildInitialAnalysis } = require('./services/analyze.service');
const { fetchRepository, mapRepository } = require('./services/github.service');
const { runTrivyScanWithStream } = require('./services/trivyStream.service');
const { emitScanEvent } = require('./services/scanEventEmitter.service');
const { cacheEvent, clearCache } = require('./services/scanEventCache.service');
const { sendScanCompleteEmail } = require('./services/email.service');
const logger = require('./utils/logger');
const Sentry = require('@sentry/node');
const {
  bullmqQueueWaiting,
  bullmqQueueActive,
  bullmqJobsTotal,
  bullmqJobDurationSeconds,
} = require('./utils/metrics');

// Redis-backed Socket.IO emitter (worker has no HTTP server)
const { Emitter } = require('@socket.io/redis-emitter');
const io = new Emitter(pubClient);

// Queue instance for depth polling
const scanQueue = new Queue('scanQueue', { connection: redisConnection });

logger.info('[Worker] Starting background workers...');

/**
 * Wraps emitScanEvent + cacheEvent so every emission is also persisted
 * to Redis for reconnect replay without extra boilerplate in the worker.
 */
async function emit(room, eventType, payload) {
  // Create the same envelope that emitScanEvent sends
  const { randomUUID } = require('crypto');
  const envelope = {
    eventId: randomUUID(),
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
    logger.warn(`[Worker] emit failed for ${eventType}: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
const scanWorker = new Worker(
  'scanQueue',
  async (job) => {
    const { repositoryFullName, githubAccessToken, room } = job.data;
    const jobStartNs = process.hrtime.bigint();

    logger.info(`[Worker] Job ${job.id} started → ${repositoryFullName}`);

    // Brief pause: let the frontend subscribe to the room before events fly
    await new Promise((r) => setTimeout(r, 800));

    let filesScanned = 0;
    let vulnsFound = 0;
    let depsAnalyzed = 0;
    const scanStart = Date.now();

    try {
      // ── Event 1: scan.started ──────────────────────────────────────────────
      await emit(room, 'scan.started', {
        repository: repositoryFullName,
        jobId: job.id,
        current_phase: 'initializing',
        message: 'Scan pipeline initialised',
      });

      // ── Fetch repository metadata ──────────────────────────────────────────
      const repository = await fetchRepository(githubAccessToken, repositoryFullName);
      const mappedRepository = mapRepository(repository);

      // ── Event 2: repository.synced ─────────────────────────────────────────
      await emit(room, 'repository.synced', {
        repository: repositoryFullName,
        defaultBranch: mappedRepository.defaultBranch,
        language: mappedRepository.language,
        size: mappedRepository.size,
        openIssues: mappedRepository.openIssuesCount,
        message: 'Repository metadata fetched from GitHub',
      });

      // ── Event 3: scan.progress (clone phase) ───────────────────────────────
      await emit(room, 'scan.progress', {
        repository: repositoryFullName,
        files_scanned: 0,
        total_files: null,
        current_phase: 'cloning',
        elapsed_ms: Date.now() - scanStart,
        message: 'Cloning repository for security scan...',
      });

      // ── Run Trivy with streaming callbacks ─────────────────────────────────
      let securityScan;

      securityScan = await runTrivyScanWithStream(repositoryFullName, githubAccessToken, {
        // Clone started
        onCloneStarted: async () => {
          await emit(room, 'scan.progress', {
            repository: repositoryFullName,
            files_scanned: 0,
            total_files: null,
            current_phase: 'cloning',
            elapsed_ms: Date.now() - scanStart,
            message: 'Shallow clone initiated...',
          });
        },

        // Clone complete → Trivy starting
        onCloneComplete: async () => {
          await emit(room, 'scan.progress', {
            repository: repositoryFullName,
            files_scanned: 0,
            total_files: null,
            current_phase: 'scanning',
            elapsed_ms: Date.now() - scanStart,
            message: 'Clone complete. Trivy scanner starting...',
          });
        },

        // Trivy scan started
        onScanStarted: async () => {
          await emit(room, 'scan.started', {
            repository: repositoryFullName,
            jobId: job.id,
            current_phase: 'scanning',
            message: 'Trivy vulnerability scanner running',
          });
        },

        // Each manifest/target file processed
        onDependencyAnalyzed: async (target, vulnCount, ecosystem) => {
          depsAnalyzed++;
          filesScanned++;
          await emit(room, 'dependency.analyzed', {
            repository: repositoryFullName,
            target,
            ecosystem,
            vuln_count: vulnCount,
            deps_done: depsAnalyzed,
            elapsed_ms: Date.now() - scanStart,
            message: `Analysed ${target} (${ecosystem})`,
          });
          // Also send a progress roll-up
          await emit(room, 'scan.progress', {
            repository: repositoryFullName,
            files_scanned: filesScanned,
            total_files: null,
            current_phase: 'scanning',
            elapsed_ms: Date.now() - scanStart,
            message: `Scanning... ${filesScanned} files processed`,
          });
        },

        // Each individual CVE found
        onVulnerabilityFound: async (vuln) => {
          vulnsFound++;
          await emit(room, 'vulnerability.detected', {
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

        // Trivy complete — fire a progress event before AI starts
        onScanComplete: async (result) => {
          securityScan = result;
          await emit(room, 'scan.progress', {
            repository: repositoryFullName,
            files_scanned: filesScanned,
            total_files: filesScanned,
            current_phase: 'ai_analysis',
            elapsed_ms: Date.now() - scanStart,
            message: `Trivy scan complete. ${vulnsFound} vulnerabilities found.`,
          });
        },

        onError: async (err) => {
          logger.warn(`[Worker] Trivy streaming error: ${err.message}`);
        },
      });

      // ── Event: ai.analysis.started ─────────────────────────────────────────
      await emit(room, 'ai.analysis.started', {
        repository: repositoryFullName,
        model: 'gemini',
        phase: 'failure_prediction',
        vuln_count: vulnsFound,
        elapsed_ms: Date.now() - scanStart,
        message: 'AI analysis pipeline started',
      });

      // ── Run AI analysis (Python microservice) ──────────────────────────────
      const analysis = await buildInitialAnalysis(mappedRepository, githubAccessToken);

      // ── Event: ai.analysis.completed ──────────────────────────────────────
      await emit(room, 'ai.analysis.completed', {
        repository: repositoryFullName,
        decision: analysis.decision,
        failure_probability: analysis.failurePrediction?.probability,
        risk_score: analysis.riskScore,
        suggestions_count: analysis.suggestions?.length || 0,
        elapsed_ms: Date.now() - scanStart,
        message: `AI decision: ${analysis.decision} (risk: ${analysis.riskScore})`,
      });

      const durationSec = Number(process.hrtime.bigint() - jobStartNs) / 1e9;

      const result = { analysis, repository: mappedRepository };

      // ── Event: scan.completed ──────────────────────────────────────────────
      await emit(room, 'scan.completed', {
        repository: repositoryFullName,
        files_scanned: filesScanned,
        vulns_found: vulnsFound,
        critical: securityScan?.summary?.critical || 0,
        high: securityScan?.summary?.high || 0,
        medium: securityScan?.summary?.medium || 0,
        low: securityScan?.summary?.low || 0,
        duration_sec: durationSec,
        ai_decision: analysis.decision,
        elapsed_ms: Date.now() - scanStart,
        message: 'Scan complete',
      });

      // Emit the full result payload on the legacy channel so existing
      // consumers (AnalysisPanel) continue to work without changes
      io.to(room).emit('scan:complete', result);

      // ── Fire scan-complete email (non-blocking, best-effort) ────────────
      // We try to get the user's GitHub email from the DB.
      // If we can't, we skip silently — email is never critical path.
      setImmediate(async () => {
        try {
          const userId = job.data.userId;
          if (userId) {
            const { providerTokenDB } = require('./db/database');
            const tokenRow = await providerTokenDB.getByUserId(userId);
            // GitHub email may be available from the JWT payload stored in the session
            // For now we log; full email requires user profile endpoint.
            const userEmail = job.data.userEmail || null;
            if (userEmail) {
              const { createReport } = require('./services/report.service');
              const config = require('./config/env');
              // Build a shareable report
              const score = securityScan?.summary || {};
              const devScore = analysis?.riskScore || 0;
              await sendScanCompleteEmail({
                to: userEmail,
                repository: repositoryFullName,
                score: devScore,
                status: analysis?.decision || 'UNKNOWN',
                critical: securityScan?.summary?.critical || 0,
                high: securityScan?.summary?.high || 0,
                medium: securityScan?.summary?.medium || 0,
              });
            }
          }
        } catch (emailErr) {
          logger.warn(`[Worker] Email notification failed: ${emailErr.message}`);
        }
      });

      // Reduce cache TTL to 5 minutes now that the scan is done
      await clearCache(room);

      bullmqJobDurationSeconds.observe({ queue: 'scanQueue' }, durationSec);
      return result;
    } catch (err) {
      const elapsed = Date.now() - scanStart;

      await emit(room, 'scan.failed', {
        repository: repositoryFullName,
        error: err.message,
        code: err.code || 'SCAN_FAILED',
        elapsed_ms: elapsed,
        message: `Scan failed: ${err.message}`,
      });

      // Also emit on legacy channel for backward compat
      io.to(room).emit('scan:error', { message: err.message });

      await clearCache(room);
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

// ── Worker lifecycle events ────────────────────────────────────────────────────
scanWorker.on('completed', (job) => {
  logger.info(`[Worker] Job ${job.id} completed`);
  bullmqJobsTotal.inc({ queue: 'scanQueue', status: 'completed' });
});

scanWorker.on('failed', (job, err) => {
  logger.error(`[Worker] Job ${job.id} failed: ${err.message}`);
  Sentry.captureException(err);
  bullmqJobsTotal.inc({ queue: 'scanQueue', status: 'failed' });
});

// ── Queue depth poll (Prometheus gauges) ──────────────────────────────────────
setInterval(async () => {
  try {
    const [waiting, active] = await Promise.all([
      scanQueue.getWaitingCount(),
      scanQueue.getActiveCount(),
    ]);
    bullmqQueueWaiting.set({ queue: 'scanQueue' }, waiting);
    bullmqQueueActive.set({ queue: 'scanQueue' }, active);
  } catch {
    /* Redis briefly unavailable during startup */
  }
}, 15_000);

// ── Graceful shutdown ──────────────────────────────────────────────────────────
async function shutdown() {
  logger.info('[Worker] Shutting down gracefully...');
  await scanWorker.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ── Scheduled Scan Worker (BullMQ repeatable jobs) ──────────────────────
const { scheduledScanQueue } = require('./services/schedulerEngine.service');
const { scheduleDB, providerTokenDB } = require('./db/database');
const { createAndDispatchJob } = require('./services/scanJob.service');

const scheduledScanWorker = new Worker(
  'scheduledScanQueue',
  async (job) => {
    const { scheduleId, userId, repository } = job.data;
    logger.info(
      `[ScheduledWorker] Running scheduled scan for ${repository} (scheduleId=${scheduleId})`,
    );

    try {
      // Get the stored GitHub token for this user
      const tokenRow = await providerTokenDB.getByUserId(userId);
      if (!tokenRow?.encryptedToken) {
        logger.warn(`[ScheduledWorker] No GitHub token for user ${userId} — skipping`);
        return;
      }

      // Decrypt token and enqueue a regular scan job
      const { decryptText } = require('./utils/crypto');
      const githubAccessToken = decryptText(tokenRow.encryptedToken);

      await createAndDispatchJob(repository, githubAccessToken);

      // Update last_run_at
      await scheduleDB.markLastRun(scheduleId);

      logger.info(`[ScheduledWorker] Scan enqueued for ${repository}`);
    } catch (err) {
      logger.error(`[ScheduledWorker] Failed: ${err.message}`);
      throw err;
    }
  },
  { connection: redisConnection, concurrency: 3 },
);

scheduledScanWorker.on('completed', (job) => {
  logger.info(`[ScheduledWorker] Job ${job.id} completed`);
});

scheduledScanWorker.on('failed', (job, err) => {
  logger.error(`[ScheduledWorker] Job ${job.id} failed: ${err.message}`);
  Sentry.captureException(err);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdownWorkers() {
  await Promise.allSettled([
    scanWorker.close(),
    scheduledScanWorker.close(),
  ]);
  logger.info('[Worker] All workers shut down.');
}

module.exports = { scanWorker, scheduledScanWorker, shutdownWorkers };
