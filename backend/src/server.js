// ─── OpenTelemetry must be initialised FIRST before any other require ─────────
require('./instrumentation');

const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const { db } = require('./db/database');

const server = app.listen(config.port, () => {
  logger.info(`DevPulse backend listening on http://localhost:${config.port}`);
});

const { initSocket } = require('./socket');
initSocket(server);

// ─── Start Remediation Worker ─────────────────────────────────────────────────
const { remediationWorker, shutdownRemediationWorker } = require('./workers/remediationWorker');
logger.info('[Server] Remediation worker started.');

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
