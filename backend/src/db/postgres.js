const { Pool } = require('pg');
const { performance } = require('perf_hooks');
const config = require('../config/env');
const logger = require('../utils/logger');

const SLOW_THRESHOLD_MS = config.slowQueryThresholdMs || 100;

const pool = new Pool({
  connectionString: config.databaseUrl || 'postgresql://devpulse:devpulse@localhost:5432/devpulse',
  // Explicit pool tuning — safe defaults for Render's free tier (1 CPU)
  max: 10, // max concurrent connections
  idleTimeoutMillis: 30000, // release idle connections after 30s
  connectionTimeoutMillis: 2000, // fail fast if no connection available in 2s
});

// ─── Slow Query Instrumentation ───────────────────────────────────────────────
// Wrap pool.query so every DB call is timed and slow queries are logged.
const _originalQuery = pool.query.bind(pool);
pool.query = async function instrumentedQuery(textOrConfig, values) {
  const start = performance.now();
  let result;
  try {
    result =
      values !== undefined
        ? await _originalQuery(textOrConfig, values)
        : await _originalQuery(textOrConfig);
  } finally {
    const durationMs = performance.now() - start;
    if (durationMs > SLOW_THRESHOLD_MS) {
      // Extract query text safely — never log parameter values
      const queryText =
        typeof textOrConfig === 'string' ? textOrConfig : textOrConfig?.text || 'unknown';
      logger.warn('[DB] Slow query', {
        query: queryText.replace(/\s+/g, ' ').trim().slice(0, 200),
        duration_ms: Math.round(durationMs),
        threshold_ms: SLOW_THRESHOLD_MS,
        rows: result?.rowCount ?? null,
      });
    }
  }
  return result;
};

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable per-query statistics tracking (available on managed PG; no-op if already on)
    // Allows pg_stat_statements view for slow query analysis.
    // Must be superuser or pg_monitor role — wrapping in try/catch so it never
    // blocks migration if the DB user lacks that privilege (e.g. Render's free tier).
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS pg_stat_statements;`);
    } catch (_) {
      /* superuser not available — skip silently */
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS pipeline_results (
        id VARCHAR(255) PRIMARY KEY,
        repository VARCHAR(255) NOT NULL,
        commit_sha VARCHAR(255),
        commit_message TEXT,
        branch VARCHAR(255),
        triggered_by VARCHAR(255),
        run_id VARCHAR(255),
        run_url TEXT,
        event VARCHAR(255),
        timestamp TIMESTAMPTZ,
        received_at TIMESTAMPTZ NOT NULL,
        overall_status VARCHAR(50),
        stages JSONB NOT NULL,
        devpulse_score JSONB NOT NULL,
        insights JSONB NOT NULL
      );
    `);

    // ── Existing indexes (kept for backwards compatibility) ──────────────────
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_pipeline_repository ON pipeline_results(repository);`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_pipeline_branch ON pipeline_results(branch);`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_pipeline_received ON pipeline_results(received_at DESC);`,
    );

    // ── New indexes (v2 — fixes full table scans) ─────────────────────────────
    // Fixes findByRunId() which previously did a full seq-scan on every webhook
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_pipeline_run_id ON pipeline_results(run_id);`,
    );
    // Composite index: covers all filtered+sorted queries (repo+branch+received_at)
    // Supersedes separate idx_pipeline_repository for queries that also ORDER BY received_at
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_pipeline_repo_received ON pipeline_results(repository, received_at DESC);`,
    );
    // 3-column composite for WHERE repository=$1 AND branch=$2 ORDER BY received_at DESC
    // Allows a single index scan instead of two index scans merged via BitmapAnd.
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_pipeline_repo_branch_received ON pipeline_results(repository, branch, received_at DESC);`,
    );
    // Covers the COUNT(*) FILTER (WHERE overall_status = 'success') in getHealth()
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_pipeline_overall_status ON pipeline_results(overall_status);`,
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS scan_jobs (
        id VARCHAR(255) PRIMARY KEY,
        repository VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        result JSONB,
        error TEXT
      );
    `);

    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_scanjob_repository ON scan_jobs(repository);`,
    );
    await client.query(`CREATE INDEX IF NOT EXISTS idx_scanjob_status ON scan_jobs(status);`);
    // Age-based cleanup queries filter by created_at — without this index they seq-scan
    await client.query(`CREATE INDEX IF NOT EXISTS idx_scanjob_created ON scan_jobs(created_at);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        token VARCHAR(255) PRIMARY KEY,
        repository VARCHAR(255) NOT NULL,
        repo_meta JSONB,
        devpulse_score JSONB,
        stages JSONB,
        insights JSONB,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_report_repository ON reports(repository);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_report_expires ON reports(expires_at);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_tokens (
        user_id VARCHAR(255) PRIMARY KEY,
        encrypted_token TEXT NOT NULL,
        github_login VARCHAR(255),
        profile_url TEXT,
        synced_at TIMESTAMPTZ NOT NULL
      );
    `);

    // ── Scan Schedules (recurring scans via BullMQ) ──────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS scan_schedules (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        repository VARCHAR(255) NOT NULL,
        cron_expr VARCHAR(100) NOT NULL,
        label VARCHAR(100),
        enabled BOOLEAN NOT NULL DEFAULT true,
        last_run_at TIMESTAMPTZ,
        next_run_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_schedule_user ON scan_schedules(user_id);`);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_schedule_repo ON scan_schedules(repository);`,
    );
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_user_repo ON scan_schedules(user_id, repository);`,
    );

    await client.query('COMMIT');
    logger.info('[DB] PostgreSQL database ready and migrated.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('[DB] PostgreSQL migration failed', { error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

pool.on('error', (err) => {
  logger.error('[DB] Unexpected error on idle client', { error: err.message, stack: err.stack });
  process.exit(-1);
});

module.exports = { pool, migrate };
