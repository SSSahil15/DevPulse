/**
 * smoke-test.js — Backend Health Endpoint Latency Smoke Test
 *
 * Starts the Express app in test mode, fires 40 requests at the health
 * endpoints, and asserts that p99 stays under the configured budget.
 *
 * Usage: node smoke-test.js [<p99-budget-ms>]
 * Default budget: 500ms
 */

const http = require('http');
const P99_BUDGET_MS = parseInt(process.argv[2] || '500', 10);
const BACKEND_PORT = 4099; // high port — unlikely to conflict
const ITERATIONS = 20; // 20 × 2 endpoints = 40 requests total

// ─── Helpers ──────────────────────────────────────────────────────────────────

function measure(port, path) {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();
    const req = http.get(`http://localhost:${port}${path}`, (res) => {
      res.resume();
      res.on('end', () => {
        const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
        resolve({ path, status: res.statusCode, ms });
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`Timeout on ${path}`));
    });
  });
}

function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  const app = require('./src/app');
  const server = app.listen(BACKEND_PORT, () => {
    console.log(`[Smoke] Backend listening on :${BACKEND_PORT}`);
  });

  // Give the server 500ms to fully initialise
  await new Promise((r) => setTimeout(r, 500));

  // Warm-up (discard result)
  await measure(BACKEND_PORT, '/health/live').catch(() => {});

  const results = [];
  for (let i = 0; i < ITERATIONS; i++) {
    results.push(await measure(BACKEND_PORT, '/health/live'));
    results.push(await measure(BACKEND_PORT, '/health/startup'));
  }

  server.close();

  const durations = results.map((r) => r.ms).sort((a, b) => a - b);
  const p50 = percentile(durations, 50).toFixed(1);
  const p95 = percentile(durations, 95).toFixed(1);
  const p99 = percentile(durations, 99).toFixed(1);
  const max = durations[durations.length - 1].toFixed(1);

  console.log(`[Smoke] Requests : ${results.length}`);
  console.log(`[Smoke] p50      : ${p50}ms`);
  console.log(`[Smoke] p95      : ${p95}ms`);
  console.log(`[Smoke] p99      : ${p99}ms`);
  console.log(`[Smoke] max      : ${max}ms`);
  console.log(`[Smoke] budget   : ${P99_BUDGET_MS}ms`);

  if (parseFloat(p99) > P99_BUDGET_MS) {
    console.error(`[Smoke] ❌ FAIL — p99 (${p99}ms) exceeds budget (${P99_BUDGET_MS}ms)`);
    process.exit(1);
  }

  console.log(`[Smoke] ✅ PASS — p99 (${p99}ms) within budget (${P99_BUDGET_MS}ms)`);
})().catch((err) => {
  console.error('[Smoke] Fatal:', err.message);
  process.exit(1);
});
