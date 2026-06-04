const { pool, migrate } = require('./postgres');
const logger = require('../utils/logger');

// ─── Pipeline Results Helpers ─────────────────────────────────────────────────

/**
 * Column sets for pipeline_results queries.
 *
 * 'summary' — lightweight list/history view. Omits the three heavy JSONB columns
 *             (stages, insights) that are not needed for list endpoints.
 *             devpulse_score is kept because scores are always shown in lists.
 *
 * 'full'    — complete row including all JSONB columns. Used for detail views
 *             and wherever stages/insights are needed.
 */
const PIPELINE_COLUMNS = {
  summary: `
    id, repository, commit_sha, commit_message, branch, triggered_by,
    run_id, run_url, event, timestamp, received_at, overall_status, devpulse_score
  `,
  full: `
    id, repository, commit_sha, commit_message, branch, triggered_by,
    run_id, run_url, event, timestamp, received_at, overall_status,
    stages, devpulse_score, insights
  `,
};

const pipelineDB = {
  async insert(record) {
    const query = `
      INSERT INTO pipeline_results
        (id, repository, commit_sha, commit_message, branch, triggered_by,
         run_id, run_url, event, timestamp, received_at, overall_status,
         stages, devpulse_score, insights)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `;
    await pool.query(query, [
      record.id,
      record.repository,
      record.commitSha,
      record.commitMessage,
      record.branch,
      record.triggeredBy,
      record.runId,
      record.runUrl,
      record.event,
      record.timestamp,
      record.receivedAt,
      record.overallStatus,
      record.stages,
      record.devpulseScore,
      record.insights,
    ]);
  },

  /**
   * Find pipeline results with optional repo/branch filtering.
   *
   * @param {object} opts
   * @param {string} [opts.repository]         - filter by repository full name
   * @param {string} [opts.branch]             - filter by branch name
   * @param {number} [opts.limit=20]           - max rows to return (enforced ≤ 100)
   * @param {number} [opts.offset=0]           - pagination offset
   * @param {'full'|'summary'} [opts.columns='full'] - column set to select
   */
  async findFiltered({ repository, branch, limit = 20, offset = 0, columns = 'full' }) {
    // Defensive caps: callers should not bypass the controller's own limit cap
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);
    const cols = PIPELINE_COLUMNS[columns] || PIPELINE_COLUMNS.full;

    let query, params;
    if (repository && branch) {
      // Uses 3-column composite index idx_pipeline_repo_branch_received
      query = `SELECT ${cols} FROM pipeline_results WHERE repository = $1 AND branch = $2 ORDER BY received_at DESC LIMIT $3 OFFSET $4`;
      params = [repository, branch, safeLimit, safeOffset];
    } else if (repository) {
      // Uses composite index idx_pipeline_repo_received
      query = `SELECT ${cols} FROM pipeline_results WHERE repository = $1 ORDER BY received_at DESC LIMIT $2 OFFSET $3`;
      params = [repository, safeLimit, safeOffset];
    } else {
      // Full table scan intentional here (admin/dashboard view — no filter)
      query = `SELECT ${cols} FROM pipeline_results ORDER BY received_at DESC LIMIT $1 OFFSET $2`;
      params = [safeLimit, safeOffset];
    }

    const { rows } = await pool.query(query, params);
    return rows.map(parsePipelineRow);
  },

  /**
   * Same as findFiltered but also returns the true total count matching the
   * filter — done in a SINGLE query using COUNT(*) OVER () window function.
   * This avoids the N+1 pattern of running a separate COUNT query for pagination.
   *
   * Returns: { rows: PipelineRow[], total: number }
   *
   * @param {object} opts - Same options as findFiltered
   */
  async findFilteredWithCount({ repository, branch, limit = 20, offset = 0, columns = 'full' }) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);
    const cols = PIPELINE_COLUMNS[columns] || PIPELINE_COLUMNS.full;

    // Wrap query in a CTE and add COUNT(*) OVER () as a window function.
    // Postgres computes the count without a second seq-scan — the planner
    // reuses the same execution node for both the window agg and the data fetch.
    let innerWhere, params;
    if (repository && branch) {
      innerWhere = `WHERE repository = $1 AND branch = $2`;
      params = [repository, branch, safeLimit, safeOffset];
    } else if (repository) {
      innerWhere = `WHERE repository = $1`;
      params = [repository, safeLimit, safeOffset];
    } else {
      innerWhere = ``;
      params = [safeLimit, safeOffset];
    }

    // $N for limit/offset depends on how many filter params came before
    const limitIdx = params.length - 1; // e.g. 3 if repo+branch
    const offsetIdx = params.length; // e.g. 4 if repo+branch

    const query = `
      SELECT ${cols}, COUNT(*) OVER () AS _total_count
      FROM   pipeline_results
      ${innerWhere}
      ORDER  BY received_at DESC
      LIMIT  $${limitIdx} OFFSET $${offsetIdx}
    `;

    const { rows } = await pool.query(query, params);
    const total = rows.length > 0 ? parseInt(rows[0]._total_count, 10) : 0;

    // Strip the internal _total_count column before returning parsed rows
    return {
      rows: rows.map((r) => {
        const { _total_count, ...rest } = r;
        return parsePipelineRow(rest);
      }),
      total,
    };
  },

  /**
   * Look up a single pipeline result by its GitHub Actions run_id.
   * Uses idx_pipeline_run_id — previously a full table scan.
   */
  async findByRunId(runId) {
    const { rows } = await pool.query(
      `SELECT ${PIPELINE_COLUMNS.full} FROM pipeline_results WHERE run_id = $1 LIMIT 1`,
      [runId],
    );
    return rows.length ? parsePipelineRow(rows[0]) : null;
  },

  async deleteById(id) {
    const { rowCount } = await pool.query(`DELETE FROM pipeline_results WHERE id = $1`, [id]);
    return { changes: rowCount };
  },

  async deleteByIds(ids) {
    await pool.query(`DELETE FROM pipeline_results WHERE id = ANY($1)`, [ids]);
  },

  /**
   * Aggregate health stats for the /health endpoint.
   *
   * Previously fired 4 separate queries sequentially.
   * Now uses a single CTE → 1 round-trip instead of 4.
   *
   * Uses:
   *   - idx_pipeline_overall_status  (for the FILTER count)
   *   - idx_pipeline_received        (for the ORDER BY LIMIT 1)
   */
  async getHealth() {
    const { rows } = await pool.query(`
      WITH
        counts AS (
          SELECT
            COUNT(*)                                                  AS total,
            COUNT(*) FILTER (WHERE overall_status = 'success')       AS successes,
            AVG((devpulse_score->>'score')::numeric)                  AS avg_score
          FROM pipeline_results
        ),
        latest_row AS (
          SELECT
            id, repository, commit_sha, commit_message, branch, triggered_by,
            run_id, run_url, event, timestamp, received_at, overall_status,
            stages, devpulse_score, insights
          FROM pipeline_results
          ORDER BY received_at DESC
          LIMIT 1
        )
      SELECT
        c.total,
        c.successes,
        c.avg_score,
        l.id, l.repository, l.commit_sha, l.commit_message, l.branch,
        l.triggered_by, l.run_id, l.run_url, l.event, l.timestamp,
        l.received_at, l.overall_status, l.stages, l.devpulse_score, l.insights
      FROM counts c
      LEFT JOIN latest_row l ON true
    `);

    if (!rows.length) {
      return { total: 0, successes: 0, avgScore: null, latest: null };
    }

    const row = rows[0];
    const total = parseInt(row.total, 10);

    // Extract the latest pipeline row (columns prefixed from the CTE join)
    const latestRaw = row.id
      ? {
          id: row.id,
          repository: row.repository,
          commit_sha: row.commit_sha,
          commit_message: row.commit_message,
          branch: row.branch,
          triggered_by: row.triggered_by,
          run_id: row.run_id,
          run_url: row.run_url,
          event: row.event,
          timestamp: row.timestamp,
          received_at: row.received_at,
          overall_status: row.overall_status,
          stages: row.stages,
          devpulse_score: row.devpulse_score,
          insights: row.insights,
        }
      : null;

    return {
      total,
      successes: parseInt(row.successes, 10),
      avgScore: total > 0 ? Math.round(parseFloat(row.avg_score) || 0) : null,
      latest: latestRaw ? parsePipelineRow(latestRaw) : null,
    };
  },
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
    stages: row.stages,
    devpulseScore: row.devpulse_score,
    insights: row.insights,
  };
}

// ─── Scan Job Helpers ─────────────────────────────────────────────────────────

const scanJobDB = {
  async create(id, repository) {
    const now = new Date().toISOString();
    await pool.query(
      `
      INSERT INTO scan_jobs (id, repository, status, created_at, updated_at)
      VALUES ($1, $2, 'pending', $3, $3)
    `,
      [id, repository, now],
    );
  },

  /**
   * Fetch a scan job by ID.
   *
   * @param {string} id
   * @param {object} [opts]
   * @param {boolean} [opts.lite=false] - When true, omits the heavy `result` JSONB column.
   *   Use lite=true for status-polling endpoints that only need status/repository/timestamps.
   *   Use lite=false (default) when the caller needs the full result payload.
   */
  async getById(id, { lite = false } = {}) {
    const cols = lite
      ? 'id, repository, status, created_at, updated_at, error'
      : 'id, repository, status, created_at, updated_at, result, error';

    const { rows } = await pool.query(`SELECT ${cols} FROM scan_jobs WHERE id = $1 LIMIT 1`, [id]);
    if (!rows.length) return null;
    const row = rows[0];
    return {
      ...row,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      result: row.result ?? null,
    };
  },

  async markProcessing(id) {
    await pool.query(`UPDATE scan_jobs SET status = 'processing', updated_at = $1 WHERE id = $2`, [
      new Date().toISOString(),
      id,
    ]);
  },

  async markDone(id, result) {
    await pool.query(
      `UPDATE scan_jobs SET status = 'done', result = $1, updated_at = $2 WHERE id = $3`,
      [result, new Date().toISOString(), id],
    );
  },

  async markFailed(id, errorMsg) {
    await pool.query(
      `UPDATE scan_jobs SET status = 'failed', error = $1, updated_at = $2 WHERE id = $3`,
      [errorMsg, new Date().toISOString(), id],
    );
  },

  /**
   * Delete scan jobs older than `days` days.
   * Uses idx_scanjob_created — no seq-scan.
   * Called from the hourly cleanup interval alongside pipeline_results and reports.
   *
   * @param {number} [days=7] - Retention window in days
   * @returns {number} Number of rows deleted
   */
  async cleanupOld(days = 7) {
    const { rowCount } = await pool.query(
      `DELETE FROM scan_jobs WHERE created_at < NOW() - ($1 || ' days')::INTERVAL`,
      [days],
    );
    return rowCount;
  },
};

// ─── Report Helpers ───────────────────────────────────────────────────────────

const reportDB = {
  async insert(report) {
    await pool.query(
      `
      INSERT INTO reports
        (token, repository, repo_meta, devpulse_score, stages, insights, created_by, created_at, expires_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
      [
        report.token,
        report.repository,
        report.repoMeta,
        report.devpulseScore,
        report.stages,
        report.insights,
        report.createdBy,
        report.createdAt,
        report.expiresAt,
      ],
    );
  },

  async getByToken(token) {
    const { rows } = await pool.query(
      `SELECT token, repository, repo_meta, devpulse_score, stages, insights,
              created_by, created_at, expires_at
       FROM reports WHERE token = $1 LIMIT 1`,
      [token],
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      token: row.token,
      repository: row.repository,
      repoMeta: row.repo_meta || {},
      devpulseScore: row.devpulse_score || null,
      stages: row.stages || null,
      insights: row.insights || null,
      createdBy: row.created_by,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  },

  async cleanupExpired() {
    const { rowCount } = await pool.query(`DELETE FROM reports WHERE expires_at < $1`, [
      new Date().toISOString(),
    ]);
    if (rowCount > 0) {
      logger.info(`[DB] Cleaned up ${rowCount} expired report(s).`);
    }
  },
};

// ─── Provider Token Helpers ───────────────────────────────────────────────────

const providerTokenDB = {
  async upsert({ userId, encryptedToken, githubLogin, profileUrl }) {
    await pool.query(
      `
      INSERT INTO provider_tokens (user_id, encrypted_token, github_login, profile_url, synced_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT(user_id) DO UPDATE SET
        encrypted_token = EXCLUDED.encrypted_token,
        github_login    = EXCLUDED.github_login,
        profile_url     = EXCLUDED.profile_url,
        synced_at      = EXCLUDED.synced_at
    `,
      [userId, encryptedToken, githubLogin || null, profileUrl || null, new Date().toISOString()],
    );
  },

  async getByUserId(userId) {
    // user_id is the primary key — always an index seek, no full scan
    const { rows } = await pool.query(
      `SELECT user_id, encrypted_token, github_login, profile_url, synced_at FROM provider_tokens WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    return rows.length ? rows[0] : null;
  },

  async deleteByUserId(userId) {
    await pool.query(`DELETE FROM provider_tokens WHERE user_id = $1`, [userId]);
  },

  /**
   * Wipe the encrypted token WITHOUT deleting the row.
   * Used on ban: keeps the user visible in the admin panel
   * (so you can see who is banned and unban them), while
   * making their GitHub token permanently unusable.
   * The ban middleware already blocks all API access anyway.
   */
  async wipeTokenByUserId(userId) {
    await pool.query(
      `UPDATE provider_tokens SET encrypted_token = NULL, synced_at = NOW() WHERE user_id = $1`,
      [userId],
    );
  },
};

async function initDb() {
  if (process.env.NODE_ENV === 'test') return;
  try {
    await migrate();

    // Hourly cleanup job — runs in background, does not block startup
    const cleanupInterval = setInterval(
      async () => {
        try {
          await reportDB.cleanupExpired();

          const { rowCount: pipelineDeleted } = await pool.query(
            `DELETE FROM pipeline_results WHERE received_at < NOW() - INTERVAL '7 days'`,
          );
          if (pipelineDeleted > 0) {
            logger.info(
              `[DB] Cleaned up ${pipelineDeleted} pipeline result(s) older than 7 days.`,
            );
          }

          const scanDeleted = await scanJobDB.cleanupOld(7);
          if (scanDeleted > 0) {
            logger.info(`[DB] Cleaned up ${scanDeleted} scan job(s) older than 7 days.`);
          }
        } catch (err) {
          logger.error('[DB] Cleanup job error', { error: err.message });
        }
      },
      60 * 60 * 1000,
    );

    cleanupInterval.unref?.();
  } catch (err) {
    logger.error('Failed to initialize database', { error: err.message });
    throw err; // crash the startup if database can't be initialized
  }
}

// ─── Schedule Helpers ─────────────────────────────────────────────────────────

const scheduleDB = {
  async create({
    id,
    userId,
    repository,
    cronExpr,
    label,
    enabled,
    lastRunAt,
    nextRunAt,
    createdAt,
  }) {
    await pool.query(
      `
      INSERT INTO scan_schedules
        (id, user_id, repository, cron_expr, label, enabled, last_run_at, next_run_at, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `,
      [
        id,
        userId,
        repository,
        cronExpr,
        label || null,
        enabled,
        lastRunAt || null,
        nextRunAt || null,
        createdAt,
      ],
    );
  },

  async findByUser(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM scan_schedules WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(`SELECT * FROM scan_schedules WHERE id = $1 LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async findByUserAndRepo(userId, repository) {
    const { rows } = await pool.query(
      `SELECT * FROM scan_schedules WHERE user_id = $1 AND repository = $2 LIMIT 1`,
      [userId, repository],
    );
    return rows[0] || null;
  },

  async update(id, { cronExpr, label, enabled, nextRunAt }) {
    await pool.query(
      `
      UPDATE scan_schedules
      SET cron_expr = $1, label = $2, enabled = $3, next_run_at = $4
      WHERE id = $5
    `,
      [cronExpr, label, enabled, nextRunAt, id],
    );
  },

  async markLastRun(id) {
    await pool.query(`UPDATE scan_schedules SET last_run_at = NOW() WHERE id = $1`, [id]);
  },

  async delete(id) {
    await pool.query(`DELETE FROM scan_schedules WHERE id = $1`, [id]);
  },
};

// Compatibility shim: server.js and health/ready use `db.open` / `db.close()`
// Pool is the actual pg connection pool — expose a thin wrapper.
const db = {
  get open() {
    // pool.totalCount > 0 or pool hasn't errored means it's open
    try {
      return pool.totalCount >= 0;
    } catch {
      return false;
    }
  },
  close() {
    return pool.end();
  },
};

// ─── Banned Users Helpers ─────────────────────────────────────────────────────

const bannedUserDB = {
  /**
   * Ban a user. Idempotent — re-banning updates reason + banned_by.
   */
  async ban({ userId, githubLogin, reason, bannedBy }) {
    await pool.query(
      `
      INSERT INTO banned_users (user_id, github_login, reason, banned_at, banned_by)
      VALUES ($1, $2, $3, NOW(), $4)
      ON CONFLICT (user_id) DO UPDATE SET
        github_login = EXCLUDED.github_login,
        reason       = EXCLUDED.reason,
        banned_at    = NOW(),
        banned_by    = EXCLUDED.banned_by
      `,
      [userId, githubLogin || null, reason, bannedBy],
    );
  },

  /** Remove a ban — returns true if a row was actually deleted. */
  async unban(userId) {
    const { rowCount } = await pool.query(
      `DELETE FROM banned_users WHERE user_id = $1`,
      [userId],
    );
    return rowCount > 0;
  },

  /**
   * Fast ban check — called on every authenticated request.
   * Uses the PRIMARY KEY (user_id) so it's always an index seek.
   */
  async isBanned(userId) {
    const { rows } = await pool.query(
      `SELECT reason FROM banned_users WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    return rows.length > 0 ? rows[0].reason : null; // null = not banned
  },

  /** List all banned users for the admin panel. */
  async list() {
    const { rows } = await pool.query(
      `SELECT user_id, github_login, reason, banned_at, banned_by
       FROM banned_users ORDER BY banned_at DESC`,
    );
    return rows;
  },
};

module.exports = { db, initDb, pool, pipelineDB, scanJobDB, reportDB, providerTokenDB, scheduleDB, bannedUserDB };
