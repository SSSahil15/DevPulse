/**
 * db-stats.routes.js — Database Observability Endpoint
 *
 * GET /api/admin/db-stats
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns a snapshot of PostgreSQL internals useful for monitoring query
 * performance, index effectiveness, and connection health.
 *
 * Data sources (all read-only, zero performance impact):
 *   pg_stat_user_tables   — row counts, seq-scans, index-scans per table
 *   pg_stat_user_indexes  — index usage (scans, tuples fetched)
 *   pg_statio_user_tables — buffer cache hit rate per table
 *   pg_stat_statements    — top slow queries (if extension is enabled)
 *   pg Pool internal stats — connection pool utilisation
 *
 * Access: authenticated users only (ensureAuthenticated middleware).
 * In production, add an additional admin-role check before exposing this.
 */

const { Router } = require('express');
const { pool } = require('../db/database');
const ensureAuthenticated = require('../middleware/ensureAuthenticated');
const logger = require('../utils/logger');

const router = Router();

// ─── Helper: run a query and return rows (or [] on error) ─────────────────────
async function safeQuery(sql, params = []) {
  try {
    const { rows } = await pool.query(sql, params);
    return rows;
  } catch (err) {
    logger.warn('[DB Stats] Query failed', { error: err.message, sql: sql.slice(0, 80) });
    return [];
  }
}

// ─── GET /api/admin/db-stats ──────────────────────────────────────────────────
router.get('/', ensureAuthenticated, async (req, res) => {
  const log = logger.withContext(req);
  log.debug('[DB Stats] Request received');

  // 1. Connection pool health
  const poolStats = {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };

  // 2. Table statistics — row counts, seq-scan vs index-scan ratio, dead tuples
  const tableStats = await safeQuery(`
    SELECT
      relname                                       AS table_name,
      n_live_tup                                    AS live_rows,
      n_dead_tup                                    AS dead_rows,
      seq_scan                                      AS seq_scans,
      idx_scan                                      AS index_scans,
      pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
      last_vacuum,
      last_autovacuum,
      last_analyze,
      last_autoanalyze
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC
  `);

  // 3. Index usage — which indexes are being used vs unused (wasted write overhead)
  const indexStats = await safeQuery(`
    SELECT
      i.relname                                    AS index_name,
      t.relname                                    AS table_name,
      s.idx_scan                                   AS scans,
      s.idx_tup_read                               AS tuples_read,
      s.idx_tup_fetch                              AS tuples_fetched,
      pg_size_pretty(pg_relation_size(i.oid))      AS index_size
    FROM pg_stat_user_indexes s
    JOIN pg_class i ON i.oid = s.indexrelid
    JOIN pg_class t ON t.oid = s.relid
    ORDER BY s.idx_scan DESC
  `);

  // 4. Buffer cache hit rate — should be >99% for a well-warmed DB
  const cacheStats = await safeQuery(`
    SELECT
      relname                                                       AS table_name,
      CASE WHEN (heap_blks_hit + heap_blks_read) > 0
           THEN round(100.0 * heap_blks_hit / (heap_blks_hit + heap_blks_read), 2)
           ELSE NULL
      END                                                           AS cache_hit_pct
    FROM pg_statio_user_tables
    WHERE (heap_blks_hit + heap_blks_read) > 0
    ORDER BY cache_hit_pct DESC
  `);

  // 5. Slow queries via pg_stat_statements (if extension is enabled)
  const slowQueries = await safeQuery(`
    SELECT
      left(query, 150)                    AS query_preview,
      calls,
      round(mean_exec_time::numeric, 2)   AS avg_ms,
      round(max_exec_time::numeric, 2)    AS max_ms,
      round(total_exec_time::numeric, 2)  AS total_ms,
      rows
    FROM pg_stat_statements
    WHERE mean_exec_time > 50            -- only queries averaging >50ms
    ORDER BY mean_exec_time DESC
    LIMIT 10
  `);

  // 6. Unused indexes (zero scans) — candidates for removal to reduce write overhead
  const unusedIndexes = indexStats.filter(
    (idx) => Number(idx.scans) === 0 && !idx.index_name.endsWith('_pkey'),
  );

  return res.status(200).json({
    generated_at: new Date().toISOString(),
    pool: poolStats,
    tables: tableStats,
    indexes: indexStats,
    cache: cacheStats,
    slow_queries: slowQueries.length > 0 ? slowQueries : null,
    unused_indexes: unusedIndexes,
    tips: {
      cache_hit: 'Aim for >99%. Low values mean too much disk I/O — increase shared_buffers.',
      unused_indexes: 'Indexes with 0 scans add write overhead. Review before dropping.',
      dead_rows: "High dead_row counts mean VACUUM hasn't run. Check autovacuum settings.",
      seq_scans: 'High seq_scan on large tables often means a missing index.',
    },
  });
});

module.exports = router;
