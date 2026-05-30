// ─── OpenTelemetry must be initialised FIRST before any other require ─────────
require('./instrumentation');

const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const { db, initDb } = require('./db/database');

async function startServer() {
  try {
    await initDb();
    logger.info('[Server] Database initialized successfully.');
  } catch (err) {
    logger.error('[Server] Failed to initialize database on startup. Exiting.');
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    logger.info(`DevPulse backend listening on http://localhost:${config.port}`);
  });

  const { initSocket } = require('./socket');
  initSocket(server);

  return server;
}

startServer().then((server) => {
  // ─── Start Remediation Worker ─────────────────────────────────────────────────
  const { shutdownRemediationWorker } = require('./workers/remediationWorker');
  logger.info('[Server] Remediation worker started.');

  // ─── Start Scan + Scheduled Workers (inline — no separate worker service needed)
  const { shutdownWorkers } = require('./worker');
  logger.info('[Server] Scan and scheduled-scan workers started.');

  async function shutdown() {
    logger.info('[Server] Received kill signal, shutting down gracefully...');

    server.close(async () => {
      logger.info('[Server] Closed out remaining HTTP connections.');
      try {
        await shutdownRemediationWorker();
        logger.info('[Server] Remediation worker shut down.');
      } catch (err) {
        logger.warn('[Server] Error shutting down remediation worker:', { error: err.message });
      }
      try {
        await shutdownWorkers();
      } catch (err) {
        logger.warn('[Server] Error shutting down scan workers:', { error: err.message });
      }
      try {
        await db.close();
        logger.info('[DB] PostgreSQL pool closed successfully.');
      } catch (err) {
        logger.error('[DB] Error closing database pool:', { error: err.message });
      }
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('[Server] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000).unref();
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}).catch(err => {
  logger.error('Fatal start failure:', err);
  process.exit(1);
});
