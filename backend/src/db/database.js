/**
 * DevPulse SQLite Database Layer
 * ================================
 * Uses `better-sqlite3` (synchronous, zero-config, embedded).
 * All tables are auto-created on startup via the `migrate()` call.
 *
 * Tables:
 *   pipeline_results  — Stores every CI/CD pipeline run record
 *   scan_jobs         — Tracks async Trivy scan job status
 *   reports           — Shareable report snapshots (7-day TTL)
 *   provider_tokens   — Encrypted GitHub OAuth tokens (replaces JSON file)
 */

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const config = require("../config/env");

const DB_PATH = config.databasePath;

// Ensure the data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Schema Migration ─────────────────────────────────────────────────────────

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_results (
      id            TEXT PRIMARY KEY,
      repository    TEXT NOT NULL,
      commit_sha    TEXT,
      commit_message TEXT,
      branch        TEXT,
      triggered_by  TEXT,
      run_id        TEXT,
      run_url       TEXT,
      event         TEXT,
      timestamp     TEXT,
      received_at   TEXT NOT NULL,
      overall_status TEXT,
      stages        TEXT NOT NULL,
      devpulse_score TEXT NOT NULL,
      insights      TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pipeline_repository ON pipeline_results(repository);
    CREATE INDEX IF NOT EXISTS idx_pipeline_branch     ON pipeline_results(branch);
    CREATE INDEX IF NOT EXISTS idx_pipeline_received   ON pipeline_results(received_at DESC);

    CREATE TABLE IF NOT EXISTS scan_jobs (
      id          TEXT PRIMARY KEY,
      repository  TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      result      TEXT,
      error       TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_scanjob_repository ON scan_jobs(repository);
    CREATE INDEX IF NOT EXISTS idx_scanjob_status     ON scan_jobs(status);

    CREATE TABLE IF NOT EXISTS reports (
      token        TEXT PRIMARY KEY,
      repository   TEXT NOT NULL,
      repo_meta    TEXT,
      devpulse_score TEXT,
      stages       TEXT,
      insights     TEXT,
      created_by   TEXT,
      created_at   TEXT NOT NULL,
      expires_at   TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_report_repository ON reports(repository);
    CREATE INDEX IF NOT EXISTS idx_report_expires    ON reports(expires_at);

    CREATE TABLE IF NOT EXISTS provider_tokens (
      user_id          TEXT PRIMARY KEY,
      encrypted_token  TEXT NOT NULL,
      github_login     TEXT,
      profile_url      TEXT,
      synced_at        TEXT NOT NULL
    );
  `);

  console.log(`[DB] SQLite database ready at ${DB_PATH}`);
}

// Run migration on module load
migrate();

// ─── Pipeline Results Helpers ─────────────────────────────────────────────────

const pipelineStmts = {
  insert: db.prepare(`
    INSERT INTO pipeline_results
      (id, repository, commit_sha, commit_message, branch, triggered_by,
       run_id, run_url, event, timestamp, received_at, overall_status,
       stages, devpulse_score, insights)
    VALUES
      (@id, @repository, @commitSha, @commitMessage, @branch, @triggeredBy,
       @runId, @runUrl, @event, @timestamp, @receivedAt, @overallStatus,
       @stages, @devpulseScore, @insights)
  `),

  findAll: db.prepare(`
    SELECT * FROM pipeline_results
    ORDER BY received_at DESC
    LIMIT ?
  `),

  findByRepo: db.prepare(`
    SELECT * FROM pipeline_results
    WHERE repository = ?
    ORDER BY received_at DESC
    LIMIT ?
  `),

  findByRepoAndBranch: db.prepare(`
    SELECT * FROM pipeline_results
    WHERE repository = ? AND branch = ?
    ORDER BY received_at DESC
    LIMIT ?
  `),

  findByRunId: db.prepare(`
    SELECT * FROM pipeline_results WHERE run_id = ? LIMIT 1
  `),

  count: db.prepare(`SELECT COUNT(*) as total FROM pipeline_results`),

  countByStatus: db.prepare(`
    SELECT COUNT(*) as total FROM pipeline_results WHERE overall_status = ?
  `),

  avgScore: db.prepare(`
    SELECT AVG(CAST(json_extract(devpulse_score, '$.score') AS REAL)) as avg
    FROM pipeline_results
  `),

  latest: db.prepare(`
    SELECT * FROM pipeline_results ORDER BY received_at DESC LIMIT 1
  `),

  deleteById: db.prepare(`DELETE FROM pipeline_results WHERE id = ?`),
};

function parsePipelineRow(row) {
  if (!row) return null;
  return {
    ...row,
    commitSha: row.commit_sha,
    commitMessage: row.commit_message,
    triggeredBy: row.triggered_by,
    runId: row.run_id,
    runUrl: row.run_url,
    receivedAt: row.received_at,
    overallStatus: row.overall_status,
    stages: JSON.parse(row.stages),
    devpulseScore: JSON.parse(row.devpulse_score),
    insights: JSON.parse(row.insights),
  };
}

const pipelineDB = {
  insert(record) {
    pipelineStmts.insert.run({
      id: record.id,
      repository: record.repository,
      commitSha: record.commitSha,
      commitMessage: record.commitMessage,
      branch: record.branch,
      triggeredBy: record.triggeredBy,
      runId: record.runId,
      runUrl: record.runUrl,
      event: record.event,
      timestamp: record.timestamp,
      receivedAt: record.receivedAt,
      overallStatus: record.overallStatus,
      stages: JSON.stringify(record.stages),
      devpulseScore: JSON.stringify(record.devpulseScore),
      insights: JSON.stringify(record.insights),
    });
  },

  findFiltered({ repository, branch, limit = 20 }) {
    let rows;
    if (repository && branch) {
      rows = pipelineStmts.findByRepoAndBranch.all(repository, branch, limit);
    } else if (repository) {
      rows = pipelineStmts.findByRepo.all(repository, limit);
    } else {
      rows = pipelineStmts.findAll.all(limit);
    }
    return rows.map(parsePipelineRow);
  },

  findByRunId(runId) {
    return parsePipelineRow(pipelineStmts.findByRunId.get(runId));
  },

  deleteById(id) {
    return pipelineStmts.deleteById.run(id);
  },

  deleteByIds(ids) {
    const del = db.transaction((idList) => {
      for (const id of idList) pipelineStmts.deleteById.run(id);
    });
    del(ids);
  },

  getHealth() {
    const total = pipelineStmts.count.get().total;
    const successes = pipelineStmts.countByStatus.get("success").total;
    const avgScore = total > 0 ? Math.round(pipelineStmts.avgScore.get().avg || 0) : null;
    const latest = parsePipelineRow(pipelineStmts.latest.get());
    return { total, successes, avgScore, latest };
  },
};

// ─── Scan Job Helpers ─────────────────────────────────────────────────────────

const scanJobStmts = {
  insert: db.prepare(`
    INSERT INTO scan_jobs (id, repository, status, created_at, updated_at)
    VALUES (@id, @repository, 'pending', @createdAt, @createdAt)
  `),

  getById: db.prepare(`SELECT * FROM scan_jobs WHERE id = ? LIMIT 1`),

  updateDone: db.prepare(`
    UPDATE scan_jobs SET status = 'done', result = ?, updated_at = ? WHERE id = ?
  `),

  updateFailed: db.prepare(`
    UPDATE scan_jobs SET status = 'failed', error = ?, updated_at = ? WHERE id = ?
  `),

  updateProcessing: db.prepare(`
    UPDATE scan_jobs SET status = 'processing', updated_at = ? WHERE id = ?
  `),
};

const scanJobDB = {
  create(id, repository) {
    const now = new Date().toISOString();
    scanJobStmts.insert.run({ id, repository, createdAt: now });
  },

  getById(id) {
    const row = scanJobStmts.getById.get(id);
    if (!row) return null;
    return {
      ...row,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      result: row.result ? JSON.parse(row.result) : null,
    };
  },

  markProcessing(id) {
    scanJobStmts.updateProcessing.run(new Date().toISOString(), id);
  },

  markDone(id, result) {
    scanJobStmts.updateDone.run(JSON.stringify(result), new Date().toISOString(), id);
  },

  markFailed(id, errorMsg) {
    scanJobStmts.updateFailed.run(errorMsg, new Date().toISOString(), id);
  },
};

// ─── Report Helpers ───────────────────────────────────────────────────────────

const reportStmts = {
  insert: db.prepare(`
    INSERT INTO reports
      (token, repository, repo_meta, devpulse_score, stages, insights, created_by, created_at, expires_at)
    VALUES
      (@token, @repository, @repoMeta, @devpulseScore, @stages, @insights, @createdBy, @createdAt, @expiresAt)
  `),

  getByToken: db.prepare(`SELECT * FROM reports WHERE token = ? LIMIT 1`),

  deleteExpired: db.prepare(`DELETE FROM reports WHERE expires_at < ?`),
};

const reportDB = {
  insert(report) {
    reportStmts.insert.run({
      token: report.token,
      repository: report.repository,
      repoMeta: JSON.stringify(report.repoMeta),
      devpulseScore: JSON.stringify(report.devpulseScore),
      stages: JSON.stringify(report.stages),
      insights: JSON.stringify(report.insights),
      createdBy: report.createdBy,
      createdAt: report.createdAt,
      expiresAt: report.expiresAt,
    });
  },

  getByToken(token) {
    const row = reportStmts.getByToken.get(token);
    if (!row) return null;
    return {
      token: row.token,
      repository: row.repository,
      repoMeta: JSON.parse(row.repo_meta || "{}"),
      devpulseScore: JSON.parse(row.devpulse_score || "null"),
      stages: JSON.parse(row.stages || "null"),
      insights: JSON.parse(row.insights || "null"),
      createdBy: row.created_by,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  },

  cleanupExpired() {
    const result = reportStmts.deleteExpired.run(new Date().toISOString());
    if (result.changes > 0) {
      console.log(`[DB] Cleaned up ${result.changes} expired report(s).`);
    }
  },
};

// ─── Provider Token Helpers ───────────────────────────────────────────────────

const tokenStmts = {
  upsert: db.prepare(`
    INSERT INTO provider_tokens (user_id, encrypted_token, github_login, profile_url, synced_at)
    VALUES (@userId, @encryptedToken, @githubLogin, @profileUrl, @syncedAt)
    ON CONFLICT(user_id) DO UPDATE SET
      encrypted_token = excluded.encrypted_token,
      github_login    = excluded.github_login,
      profile_url     = excluded.profile_url,
      synced_at       = excluded.synced_at
  `),

  getByUserId: db.prepare(`SELECT * FROM provider_tokens WHERE user_id = ? LIMIT 1`),

  deleteByUserId: db.prepare(`DELETE FROM provider_tokens WHERE user_id = ?`),
};

const providerTokenDB = {
  upsert({ userId, encryptedToken, githubLogin, profileUrl }) {
    tokenStmts.upsert.run({
      userId,
      encryptedToken,
      githubLogin: githubLogin || null,
      profileUrl: profileUrl || null,
      syncedAt: new Date().toISOString(),
    });
  },

  getByUserId(userId) {
    return tokenStmts.getByUserId.get(userId) || null;
  },

  deleteByUserId(userId) {
    tokenStmts.deleteByUserId.run(userId);
  },
};

// ─── Cleanup job: run once per hour ──────────────────────────────────────────
const pipelineCleanupStmt = db.prepare(
  `DELETE FROM pipeline_results WHERE datetime(received_at) < datetime('now', '-7 days')`
);

const cleanupInterval = setInterval(() => {
  reportDB.cleanupExpired();
  const r = pipelineCleanupStmt.run();
  if (r.changes > 0) console.log(`[DB] Cleaned up ${r.changes} pipeline result(s) older than 7 days.`);
}, 60 * 60 * 1000);
cleanupInterval.unref?.();

module.exports = { db, pipelineDB, scanJobDB, reportDB, providerTokenDB };
