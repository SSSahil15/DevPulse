const { Queue } = require('bullmq');
const { redisConnection } = require('../config/redis');

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 3000, // 3s, 6s, 12s
  },
  removeOnComplete: 50,
  removeOnFail: 500,
};

const remediationQueue = new Queue('remediationQueue', {
  connection: redisConnection,
  defaultJobOptions,
});

/**
 * Enqueue a remediation job.
 *
 * @param {object} data
 * @param {string} data.repositoryFullName  - e.g. "owner/repo"
 * @param {string} data.githubAccessToken   - user's GitHub OAuth token
 * @param {object} data.scanData            - parsed Trivy scan output
 * @param {string[]} [data.targetVulnIds]   - optional subset of CVEs to fix
 * @param {string} data.room                - WebSocket room for progress events
 * @param {string} data.userId              - authenticated user ID for audit log
 */
async function enqueueRemediation(data) {
  const job = await remediationQueue.add('remediation', data, {
    jobId: `remediation-${data.repositoryFullName.replace('/', '-')}-${Date.now()}`,
  });
  return job;
}

module.exports = {
  remediationQueue,
  enqueueRemediation,
};
