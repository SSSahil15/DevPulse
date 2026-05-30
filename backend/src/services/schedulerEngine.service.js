/**
 * Scheduler Engine Service
 * Manages BullMQ repeatable jobs for scheduled repository scans.
 */

const { Queue } = require('bullmq');
const { redisConnection } = require('../config/redis');
const logger = require('../utils/logger');

// Separate queue for scheduled scans so they don't compete with on-demand scans
const scheduledScanQueue = new Queue('scheduledScanQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 200,
  },
});

/**
 * Register a BullMQ repeatable job for a schedule.
 * Uses the scheduleId as the job name so it can be identified and removed.
 */
async function scheduleScan({ scheduleId, userId, repository, cronExpr }) {
  try {
    await scheduledScanQueue.add(
      `scheduled:${scheduleId}`,
      { scheduleId, userId, repository },
      {
        repeat: { pattern: cronExpr, tz: 'UTC' },
        jobId: `scheduled:${scheduleId}`, // stable ID for deduplication
      },
    );
    logger.info(`[Scheduler] Registered repeatable scan for ${repository} (${cronExpr})`);
  } catch (err) {
    logger.error(`[Scheduler] Failed to register repeatable job: ${err.message}`);
    throw err;
  }
}

/**
 * Remove a repeatable job by scheduleId.
 */
async function removeScheduledScan(scheduleId) {
  try {
    const repeatableJobs = await scheduledScanQueue.getRepeatableJobs();
    const job = repeatableJobs.find((j) => j.name === `scheduled:${scheduleId}`);
    if (job) {
      await scheduledScanQueue.removeRepeatableByKey(job.key);
      logger.info(`[Scheduler] Removed repeatable scan for scheduleId=${scheduleId}`);
    }
  } catch (err) {
    logger.warn(`[Scheduler] Failed to remove repeatable job: ${err.message}`);
  }
}

module.exports = { scheduledScanQueue, scheduleScan, removeScheduledScan };
