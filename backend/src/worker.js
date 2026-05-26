const { Worker, Queue } = require("bullmq");
const { redisConnection, pubClient } = require("./config/redis");
const { buildInitialAnalysis } = require("./services/analyze.service");
const { fetchRepository, mapRepository } = require("./services/github.service");
const logger = require("./utils/logger");
const Sentry = require("@sentry/node");
const {
  bullmqQueueWaiting,
  bullmqQueueActive,
  bullmqJobsTotal,
  bullmqJobDurationSeconds,
} = require("./utils/metrics");

// Minimal mock of Socket.IO Emitter (so worker can broadcast without full Socket server)
const { Emitter } = require("@socket.io/redis-emitter");
const io = new Emitter(pubClient);

// Queue instance for depth polling
const scanQueue = new Queue("scanQueue", { connection: redisConnection });

logger.info("[Worker] Starting background workers...");

const scanWorker = new Worker(
  "scanQueue",
  async (job) => {
    const { repositoryFullName, githubAccessToken, room } = job.data;
    const jobStartNs = process.hrtime.bigint();
    logger.info(`[Worker] Processing scan job ${job.id} for ${repositoryFullName}`);

    // Wait 1 second to allow frontend WebSocket to subscribe to the room
    await new Promise(r => setTimeout(r, 1000));

    // Emit progress
    io.to(room).emit("scan:progress", { status: "Fetching repository data...", progress: 20 });
    
    // 1. Fetch & Map Repo
    const repository = await fetchRepository(githubAccessToken, repositoryFullName);
    const mappedRepository = mapRepository(repository);
    
    io.to(room).emit("scan:progress", { status: "Running AI analysis...", progress: 50 });

    // 2. Build Analysis (calls Python AI service)
    const analysis = await buildInitialAnalysis(mappedRepository, githubAccessToken);

    io.to(room).emit("scan:progress", { status: "Generating final report...", progress: 90 });

    const result = {
      analysis,
      repository: mappedRepository
    };

    io.to(room).emit("scan:complete", result);

    // Record job duration
    const durationSec = Number(process.hrtime.bigint() - jobStartNs) / 1e9;
    bullmqJobDurationSeconds.observe({ queue: "scanQueue" }, durationSec);

    return result;
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

scanWorker.on("completed", (job) => {
  logger.info(`[Worker] Job ${job.id} completed successfully`);
  bullmqJobsTotal.inc({ queue: "scanQueue", status: "completed" });
});

scanWorker.on("failed", (job, err) => {
  logger.error(`[Worker] Job ${job.id} failed: ${err.message}`);
  Sentry.captureException(err);
  bullmqJobsTotal.inc({ queue: "scanQueue", status: "failed" });
  if (job.data.room) {
    io.to(job.data.room).emit("scan:error", { message: err.message });
  }
});

// ── Poll queue depth every 15s for Prometheus gauge ─────────────────────────
setInterval(async () => {
  try {
    const [waiting, active] = await Promise.all([
      scanQueue.getWaitingCount(),
      scanQueue.getActiveCount(),
    ]);
    bullmqQueueWaiting.set({ queue: "scanQueue" }, waiting);
    bullmqQueueActive.set({ queue: "scanQueue" }, active);
  } catch (_) { /* Redis may be briefly unavailable during startup */ }
}, 15_000);

// Graceful shutdown
async function shutdown() {
  logger.info("[Worker] Shutting down workers gracefully...");
  await scanWorker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
