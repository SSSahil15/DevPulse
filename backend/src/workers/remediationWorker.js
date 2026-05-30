const { Worker } = require('bullmq');
const { redisConnection, pubClient } = require('../config/redis');
const { Emitter } = require('@socket.io/redis-emitter');
const logger = require('../utils/logger');
const Sentry = require('@sentry/node');

const {
  parseTrivyVulnerabilities,
  resolveUpgradeVersions,
  deduplicatePatches,
  buildPatchSummary,
} = require('../services/remediation.service');

const {
  verifyWriteScope,
  checkRateLimit,
  discoverManifests,
  applyDependencyPatch,
  buildDiff,
  createRemediationBranch,
  commitPatchedFiles,
  openPullRequest,
  rollbackBranch,
  getDefaultBranch,
} = require('../services/githubRemediation.service');

const {
  explainVulnerability,
  generateRemediationSummary,
  generatePRDescription,
  generateCommitMessage,
  generateRollbackWarning,
} = require('../services/aiRemediation.service');

// Reuse the github client factory
const axios = require('axios');

function createGitHubClient(accessToken) {
  return axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'DevPulse',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    timeout: 15000,
  });
}

// ─── Socket Emitter ───────────────────────────────────────────────────────────
const io = new Emitter(pubClient);

// ─── Progress Emitter ─────────────────────────────────────────────────────────
function emitProgress(room, stage, progress, message, extra = {}) {
  io.to(room).emit('remediation:progress', {
    stage,
    progress,
    message,
    timestamp: new Date().toISOString(),
    ...extra,
  });
  logger.info(`[RemediationWorker] ${stage} (${progress}%): ${message}`);
}

// ─── Main Worker ──────────────────────────────────────────────────────────────

logger.info('[RemediationWorker] Starting remediation worker...');

const remediationWorker = new Worker(
  'remediationQueue',
  async (job) => {
    const {
      repositoryFullName,
      githubAccessToken,
      scanData,
      targetVulnIds,
      room,
      userId,
      isDryRun = false,
    } = job.data;

    const startNs = process.hrtime.bigint();
    const branchName = `devpulse/fix-${job.id.replace('remediation-', '')}`;

    logger.info(
      `[RemediationWorker] Job ${job.id} started for ${repositoryFullName} (dryRun=${isDryRun})`,
    );

    // Brief pause to let frontend WebSocket subscribe to the room
    await new Promise((r) => setTimeout(r, 800));

    let createdBranch = false;
    const client = createGitHubClient(githubAccessToken);

    try {
      // ── Stage 1: Verify GitHub access & parse scan ───────────────────────
      emitProgress(room, 'verifying', 5, 'Verifying GitHub access...');

      await verifyWriteScope(githubAccessToken);
      await checkRateLimit(client);

      // ── Stage 2: Parse Trivy scan data ─────────────────────────────────
      emitProgress(room, 'parsing', 12, 'Parsing vulnerability scan data...');

      const scanResult = parseTrivyVulnerabilities(scanData);
      let { vulnerabilities } = scanResult;

      // Filter to targetted CVEs if provided
      if (targetVulnIds && targetVulnIds.length > 0) {
        vulnerabilities = vulnerabilities.filter((v) => targetVulnIds.includes(v.id));
      }

      const fixable = vulnerabilities.filter((v) => v.hasFixedVersion);

      if (fixable.length === 0) {
        io.to(room).emit('remediation:complete', {
          success: false,
          reason: 'no_fixable_vulns',
          message:
            'No automatically fixable vulnerabilities found. All detected issues require manual remediation.',
          vulnCount: vulnerabilities.length,
        });
        return { success: false, reason: 'no_fixable_vulns' };
      }

      emitProgress(room, 'parsing', 18, `Found ${fixable.length} patchable vulnerabilities`, {
        totalVulns: vulnerabilities.length,
        fixableCount: fixable.length,
        ecosystems: scanResult.ecosystems,
      });

      // ── Stage 3: AI analysis of top vulnerabilities ─────────────────────
      emitProgress(room, 'ai_analysis', 25, 'AI is analysing vulnerabilities...');

      const topVulns = fixable.slice(0, 8); // Analyse top 8 for speed
      const aiExplains = {};

      for (let i = 0; i < topVulns.length; i++) {
        const vuln = topVulns[i];
        try {
          aiExplains[vuln.id] = await explainVulnerability(vuln);
        } catch {
          aiExplains[vuln.id] = null;
        }
        emitProgress(
          room,
          'ai_analysis',
          25 + Math.floor((i / topVulns.length) * 10),
          `Analysing ${vuln.id}...`,
          {
            currentVuln: { id: vuln.id, pkgName: vuln.pkgName, severity: vuln.severity },
          },
        );
      }

      // ── Stage 4: Resolve upgrade versions ────────────────────────────────
      emitProgress(room, 'version_resolution', 38, 'Resolving safe upgrade versions...');

      const enriched = await resolveUpgradeVersions(fixable);
      const patches = deduplicatePatches(enriched);
      const patchSummary = buildPatchSummary(patches);

      emitProgress(room, 'version_resolution', 46, `Resolved ${patches.length} upgrade paths`, {
        patches: patchSummary,
      });

      // ── Stage 5: Generate AI summary ─────────────────────────────────────
      emitProgress(room, 'ai_analysis', 50, 'Generating AI remediation summary...');

      const aiSummary = await generateRemediationSummary(patchSummary);

      // Rolling warnings for breaking changes
      const breakingPatches = patchSummary.filter((p) => p.breakingRisk === 'HIGH');
      const rollbackWarnings = {};
      for (const patch of breakingPatches.slice(0, 3)) {
        rollbackWarnings[patch.packageName] = await generateRollbackWarning(patch);
      }

      // ── Stage 6: Dry-run mode — return diff preview without touching GitHub ─
      if (isDryRun) {
        emitProgress(room, 'dry_run', 60, 'Generating diff preview...');

        const defaultBranch = await getDefaultBranch(client, repositoryFullName);
        const ecosystems = [...new Set(patchSummary.map((p) => p.ecosystem))];
        const manifests = await discoverManifests(client, repositoryFullName, ecosystems);
        const diffPreviews = [];

        for (const eco of ecosystems) {
          for (const manifest of manifests[eco] || []) {
            const ecoPatches = patchSummary.filter((p) => p.ecosystem === eco);
            const { patched, appliedPatches } = applyDependencyPatch(
              manifest.content,
              ecoPatches,
              eco,
            );
            if (appliedPatches.length > 0) {
              diffPreviews.push({
                filePath: manifest.path,
                ecosystem: eco,
                diff: buildDiff(manifest.content, patched, manifest.path),
                appliedCount: appliedPatches.length,
              });
            }
          }
        }

        const prDescription = await generatePRDescription(
          repositoryFullName,
          patchSummary,
          aiSummary,
        );
        const commitMessage = await generateCommitMessage(patchSummary);
        const prTitle = aiSummary?.headline || `fix(security): remediate ${patches.length} CVEs`;

        io.to(room).emit('remediation:dry_run_complete', {
          success: true,
          patchCount: patches.length,
          patches: patchSummary,
          aiSummary,
          aiExplanations: aiExplains,
          rollbackWarnings,
          diffPreviews,
          prTitle,
          prDescription,
          commitMessage,
          branchName: `devpulse/fix-preview`,
          baseBranch: defaultBranch,
        });

        return { success: true, isDryRun: true, patchCount: patches.length };
      }

      // ── Stage 7: Get repo default branch ────────────────────────────────
      emitProgress(room, 'branch_creation', 55, 'Fetching repository information...');

      const defaultBranch = await getDefaultBranch(client, repositoryFullName);

      // ── Stage 8: Create remediation branch ───────────────────────────────
      emitProgress(room, 'branch_creation', 60, `Creating branch ${branchName}...`);

      await createRemediationBranch(client, repositoryFullName, defaultBranch, branchName);
      createdBranch = true;

      // ── Stage 9: Discover & patch manifests ─────────────────────────────
      emitProgress(room, 'patching', 68, 'Applying dependency patches...');

      const ecosystems = [...new Set(patchSummary.map((p) => p.ecosystem))];
      const manifests = await discoverManifests(client, repositoryFullName, ecosystems);
      const filesToCommit = [];

      for (const eco of ecosystems) {
        for (const manifest of manifests[eco] || []) {
          const ecoPatches = patchSummary.filter((p) => p.ecosystem === eco);
          const { patched, appliedPatches } = applyDependencyPatch(
            manifest.content,
            ecoPatches,
            eco,
          );

          if (appliedPatches.length > 0) {
            filesToCommit.push({
              path: manifest.path,
              content: patched,
              eco,
              appliedPatches,
            });
            emitProgress(
              room,
              'patching',
              72,
              `Patched ${manifest.path} (${appliedPatches.length} changes)`,
            );
          }
        }
      }

      if (filesToCommit.length === 0) {
        await rollbackBranch(client, repositoryFullName, branchName);
        io.to(room).emit('remediation:complete', {
          success: false,
          reason: 'no_manifest_changes',
          message:
            'Manifests found but no changes could be applied. The dependencies may not be directly listed.',
        });
        return { success: false, reason: 'no_manifest_changes' };
      }

      // ── Stage 10: Commit changes ─────────────────────────────────────────
      emitProgress(room, 'committing', 80, `Committing ${filesToCommit.length} changed files...`);

      const commitMessage = await generateCommitMessage(patchSummary);
      const { commitSha } = await commitPatchedFiles(
        client,
        repositoryFullName,
        branchName,
        filesToCommit,
        commitMessage,
      );

      emitProgress(room, 'committing', 88, `Committed: ${commitSha.slice(0, 7)}`);

      // ── Stage 11: Generate PR description & open PR ──────────────────────
      emitProgress(room, 'pr_creation', 92, 'Opening GitHub Pull Request...');

      const prTitle = aiSummary?.headline || `fix(security): remediate ${patches.length} CVEs`;
      const prDescription = await generatePRDescription(
        repositoryFullName,
        patchSummary,
        aiSummary,
      );

      const prResult = await openPullRequest(
        client,
        repositoryFullName,
        branchName,
        defaultBranch,
        `[DevPulse] ${prTitle}`,
        prDescription,
      );

      // ── Stage 12: Complete ────────────────────────────────────────────────
      const durationSec = Number(process.hrtime.bigint() - startNs) / 1e9;

      emitProgress(room, 'complete', 100, 'Pull Request opened successfully!', {
        prUrl: prResult.prUrl,
        prNumber: prResult.prNumber,
      });

      io.to(room).emit('remediation:complete', {
        success: true,
        prUrl: prResult.prUrl,
        prNumber: prResult.prNumber,
        prTitle: prResult.prTitle,
        branchName,
        commitSha,
        patchCount: patches.length,
        patches: patchSummary,
        aiSummary,
        aiExplanations: aiExplains,
        rollbackWarnings,
        durationSec,
      });

      logger.info(
        `[RemediationWorker] Job ${job.id} completed in ${durationSec.toFixed(1)}s — PR #${prResult.prNumber}`,
      );

      // ── Fire remediation-complete email (non-blocking) ────────────────────
      setImmediate(async () => {
        try {
          const { sendRemediationCompleteEmail } = require('../services/email.service');
          const userEmail = job.data.userEmail || null;
          if (userEmail) {
            const cveIds = targetVulnIds?.length ? targetVulnIds : fixable.map((v) => v.id);
            await sendRemediationCompleteEmail({
              to: userEmail,
              repository: repositoryFullName,
              prUrl: prResult.prUrl,
              prNumber: prResult.prNumber,
              patchCount: patches.length,
              cveIds: cveIds.slice(0, 10),
            });
          }
        } catch (emailErr) {
          logger.warn(`[RemediationWorker] Email notification failed: ${emailErr.message}`);
        }
      });

      return { success: true, prUrl: prResult.prUrl, patchCount: patches.length };
    } catch (err) {
      // Rollback branch if we created it and something failed mid-way
      if (createdBranch) {
        await rollbackBranch(client, repositoryFullName, branchName).catch(() => {});
      }

      logger.error(`[RemediationWorker] Job ${job.id} failed: ${err.message}`, {
        stack: err.stack,
      });

      io.to(room).emit('remediation:error', {
        message: err.message,
        code: err.code || 'REMEDIATION_FAILED',
        retryable: job.attemptsMade < (job.opts?.attempts || 3) - 1,
        rolledBack: createdBranch,
      });

      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
  },
);

remediationWorker.on('completed', (job) => {
  logger.info(`[RemediationWorker] Job ${job.id} completed`);
});

remediationWorker.on('failed', (job, err) => {
  logger.error(`[RemediationWorker] Job ${job?.id} failed permanently: ${err.message}`);
  Sentry.captureException(err, { extra: { jobId: job?.id, jobData: job?.data } });
});

async function shutdownRemediationWorker() {
  logger.info('[RemediationWorker] Shutting down...');
  await remediationWorker.close();
}

module.exports = { remediationWorker, shutdownRemediationWorker };
