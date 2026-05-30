const { pipelineDB } = require('../db/database');
const {
  calculateDevPulseScore,
  generatePipelineInsights,
} = require('../services/devpulseScore.service');
const { createAndDispatchJob, getJobStatus } = require('../services/scanJob.service');
const logger = require('../utils/logger');

const ingestResult = async (req, res) => {
  const {
    repository,
    commitSha,
    commitMessage,
    branch,
    triggeredBy,
    runId,
    runUrl,
    event,
    timestamp,
    stages: rawStages,
    overallStatus,
  } = req.body;

  const normalizedStages = {
    backend: { tests: rawStages?.backend?.tests || 'skipped' },
    frontend: {
      build: rawStages?.frontend?.build || 'skipped',
      tests: rawStages?.frontend?.tests || 'skipped',
    },
    security: {
      critical: Number(rawStages?.security?.critical) || 0,
      high: Number(rawStages?.security?.high) || 0,
      medium: Number(rawStages?.security?.medium) || 0,
      vulnerabilities: Array.isArray(rawStages?.security?.vulnerabilities)
        ? rawStages.security.vulnerabilities
        : [],
    },
    docker: {
      build: rawStages?.docker?.build || 'skipped',
      imageSize: rawStages?.docker?.imageSize || 'N/A',
      imageVulnerabilities: Number(rawStages?.docker?.imageVulnerabilities) || 0,
    },
  };

  // Fetch recent history for failure-rate scoring.
  // 'summary' mode omits stages+insights JSONB — only overallStatus is needed here.
  // limit:20 is sufficient for a statistically meaningful failure-rate sample.
  const repoHistory = await pipelineDB.findFiltered({ repository, limit: 20, columns: 'summary' });
  const devpulseScore = calculateDevPulseScore(normalizedStages, null, repoHistory);
  const insights = generatePipelineInsights(normalizedStages, devpulseScore);

  const record = {
    id: `pr-${runId}-${Date.now()}`,
    repository,
    commitSha: commitSha?.slice(0, 12),
    commitMessage: commitMessage?.slice(0, 200) || '',
    branch: branch || 'unknown',
    triggeredBy: triggeredBy || 'unknown',
    runId,
    runUrl: runUrl || null,
    event: event || 'unknown',
    timestamp: timestamp || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    overallStatus: overallStatus || 'unknown',
    stages: normalizedStages,
    devpulseScore,
    insights,
  };

  await pipelineDB.insert(record);

  logger.info('[Pipeline] Event stored:', {
    event: 'pipeline_result_received',
    repository: record.repository,
    commit: record.commitSha,
    status: record.overallStatus,
    score: devpulseScore.score,
  });

  return res.status(201).json({
    message: 'Pipeline results stored successfully.',
    id: record.id,
    overallStatus: record.overallStatus,
    devpulseScore: devpulseScore.score,
    scoreStatus: devpulseScore.status,
    insights: insights.explanation,
  });
};

const simulateScan = async (req, res) => {
  logger.info('[Pipeline] POST /simulate received:', req.body);
  const { repositoryFullName } = req.body;
  logger.info('[Pipeline] Creating scan job for:', repositoryFullName);
  const jobId = await createAndDispatchJob(repositoryFullName, req.githubAccessToken);
  logger.info('[Pipeline] Created jobId:', jobId);

  const response = {
    message: 'Scan job accepted. Poll the status endpoint for results.',
    jobId,
    statusUrl: `/api/pipeline/simulate/status/${jobId}`,
  };
  logger.info('[Pipeline] Sending response:', response);
  return res.status(202).json(response);
};

const getSimulationStatus = async (req, res) => {
  const { jobId } = req.params;

  // Use lite mode (no result JSONB) while the job is still running — faster poll
  const job = await getJobStatus(jobId, { lite: true });

  if (!job) {
    return res.status(404).json({ message: `Scan job not found: ${jobId}` });
  }

  if (job.status === 'pending' || job.status === 'processing') {
    return res.status(200).json({
      jobId,
      status: job.status,
      repository: job.repository,
      createdAt: job.createdAt,
    });
  }

  if (job.status === 'failed') {
    return res.status(200).json({
      jobId,
      status: 'failed',
      repository: job.repository,
      error: job.error,
    });
  }

  // Job done — fetch again with full result payload
  const fullJob = await getJobStatus(jobId, { lite: false });
  return res.status(200).json({
    jobId,
    status: 'done',
    repository: fullJob.repository,
    record: fullJob.result?.record || null,
  });
};

const getResultsList = async (req, res) => {
  const { repository, branch, limit: rawLimit, offset: rawOffset } = req.query;
  const limit = Math.min(Math.max(Number(rawLimit) || 20, 1), 100);
  const offset = Math.max(Number(rawOffset) || 0, 0);

  // findFilteredWithCount uses COUNT(*) OVER() window function — returns the
  // true total matching rows in a SINGLE query (no separate COUNT round-trip).
  const { rows, total } = await pipelineDB.findFilteredWithCount({
    repository,
    branch,
    limit,
    offset,
  });

  return res.status(200).json({
    total, // real DB count — not just the current page batch size
    limit,
    offset,
    hasMore: offset + rows.length < total,
    results: rows,
  });
};

const getResultById = async (req, res) => {
  const { runId } = req.params;
  const result = await pipelineDB.findByRunId(runId);

  if (!result) {
    return res.status(404).json({ message: `No pipeline result found for run ID: ${runId}` });
  }
  return res.status(200).json(result);
};

const getScoreHistory = async (req, res) => {
  const repository = req.params.repository;
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  // 'summary' mode: omits stages+insights JSONB — history view only needs score metadata
  const results = await pipelineDB.findFiltered({ repository, limit, columns: 'summary' });
  const history = results.map((r) => ({
    runId: r.runId,
    commitSha: r.commitSha,
    branch: r.branch,
    score: r.devpulseScore?.score ?? null,
    status: r.devpulseScore?.status ?? null,
    overallStatus: r.overallStatus,
    timestamp: r.timestamp,
    commitMessage: r.commitMessage,
    event: r.event,
  }));

  return res.status(200).json({ repository, count: history.length, history });
};

const getLatestScore = async (req, res) => {
  const repository = req.params.repository;
  const { branch } = req.query;

  // Only need the 2 most recent rows:
  //   filtered[0] — latest (returned in full)
  //   filtered[1] — previous (for score trend diff only)
  // Previously loaded 50 full rows including heavy JSONB on every call.
  const filtered = await pipelineDB.findFiltered({ repository, branch, limit: 2, columns: 'full' });

  if (filtered.length === 0) {
    return res.status(404).json({
      message: `No pipeline results found for repository: ${repository}`,
      repository,
    });
  }

  const latest = filtered[0];

  return res.status(200).json({
    repository,
    branch: latest.branch,
    commit: latest.commitSha,
    runUrl: latest.runUrl,
    overallStatus: latest.overallStatus,
    devpulseScore: latest.devpulseScore,
    insights: latest.insights,
    stages: latest.stages,
    timestamp: latest.timestamp,
    receivedAt: latest.receivedAt,
    historyCount: filtered.length,
    trend:
      filtered.length >= 2 ? latest.devpulseScore.score - filtered[1].devpulseScore.score : null,
  });
};

const getPipelineHealth = async (req, res) => {
  const { total, successes, avgScore, latest } = await pipelineDB.getHealth();

  return res.status(200).json({
    service: 'devpulse-pipeline',
    status: 'ok',
    totalRuns: total,
    successRate: total > 0 ? `${Math.round((successes / total) * 100)}%` : 'N/A',
    averageScore: avgScore,
    latestRun: latest
      ? {
          repository: latest.repository,
          commit: latest.commitSha,
          status: latest.overallStatus,
          devpulseScore: latest.devpulseScore?.score ?? null,
          scoreStatus: latest.devpulseScore?.status ?? null,
          timestamp: latest.timestamp,
        }
      : null,
  });
};

const deleteResultById = async (req, res) => {
  const { id } = req.params;
  const result = await pipelineDB.deleteById(id);
  if (result.changes === 0) {
    return res.status(404).json({ message: `Record ${id} not found` });
  }
  return res.status(200).json({ deleted: 1, id });
};

const deleteResultsBulk = async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'Provide a non-empty ids array in the request body' });
  }
  await pipelineDB.deleteByIds(ids);
  return res.status(200).json({ deleted: ids.length, ids });
};

module.exports = {
  ingestResult,
  simulateScan,
  getSimulationStatus,
  getResultsList,
  getResultById,
  getScoreHistory,
  getLatestScore,
  getPipelineHealth,
  deleteResultById,
  deleteResultsBulk,
};
