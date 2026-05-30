const { Queue } = require('bullmq');
const { redisConnection } = require('../config/redis');

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000, // 2s, 4s, 8s
  },
  removeOnComplete: 100, // Keep last 100 successful jobs
  removeOnFail: 1000, // Keep last 1000 failed jobs for DLQ
};

const scanQueue = new Queue('scanQueue', { connection: redisConnection, defaultJobOptions });
const aiQueue = new Queue('aiQueue', { connection: redisConnection, defaultJobOptions });
const reportQueue = new Queue('reportQueue', { connection: redisConnection, defaultJobOptions });
const remediationQueue = new Queue('remediationQueue', {
  connection: redisConnection,
  defaultJobOptions,
});

module.exports = {
  scanQueue,
  aiQueue,
  reportQueue,
  remediationQueue,
};
