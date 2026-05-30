# DevPulse — Performance Baselines

This directory captures point-in-time performance snapshots used for regression
detection. Record a new snapshot after each significant release or infrastructure
change.

---

## How to Capture a Baseline

### 1. Backend Metrics (p50 / p95 / p99)

After deploying to Render, wait 5–10 minutes for warm traffic, then:

```bash
# Replace <BACKEND_URL> with your Render service URL
curl -s https://<BACKEND_URL>/metrics | jq '.' > performance-baselines/backend-$(date +%Y-%m-%d).json
```

The response looks like:

```json
{
  "uptime_seconds": 3600,
  "requests": {
    "total": 1500,
    "by_route": {
      "POST /api/pipeline/results": { "count": 200, "p50": 45, "p95": 180, "p99": 890 },
      "GET /repos": { "count": 300, "p50": 120, "p95": 340, "p99": 980 }
    }
  },
  "slow_requests": 12,
  "errors": { "4xx": 45, "5xx": 3 }
}
```

> **Note:** `/metrics` is only accessible from localhost in production.
> On Render, use the Shell tab in the dashboard or an internal health check.

---

### 2. Frontend Web Vitals (Core Web Vitals)

Open the deployed Vercel URL in Chrome, then:

1. Open DevTools → Console
2. Look for lines starting with `[Web Vitals]` — these log automatically in dev
3. In production, open **Sentry → Performance → Web Vitals** tab

Target baselines:

| Metric | Target   | Current Baseline |
| ------ | -------- | ---------------- |
| LCP    | < 2500ms | _record here_    |
| INP    | < 200ms  | _record here_    |
| CLS    | < 0.1    | _record here_    |
| FCP    | < 1800ms | _record here_    |
| TTFB   | < 800ms  | _record here_    |

---

### 3. Bundle Size

Run locally after every significant dependency change:

```bash
cd frontend && npm run build
# Check the Vite build output — look for "gzip:" column
# Also open dist/stats.html in a browser for the interactive treemap
```

Target: **Total JS < 200 KB gzip** (enforced in CI via `performance.yml`)

---

### 4. Database Slow Queries

Slow queries (> 100ms by default) are logged automatically via winston with
the tag `[DB] Slow query`. To find them in Render logs:

```
[DB] Slow query | query="SELECT * FROM pipeline_results..." | duration_ms=340
```

Tune the threshold via `SLOW_QUERY_THRESHOLD_MS` environment variable (default: 100).

---

### 5. External API Latency

GitHub API and Groq LLM calls are tracked via structured logs:

```
[GitHub] API call | endpoint="/user/repos" | duration_ms=280 | rate_limit_remaining=59
[Groq] LLM call succeeded | model="llama-3.3-70b-versatile" | duration_ms=1240 | tokens_used=480
```

Filter logs by `[GitHub]` or `[Groq]` in Render's log viewer.

---

## Alert Thresholds

| Metric                | Warning          | Critical               | Action                                  |
| --------------------- | ---------------- | ---------------------- | --------------------------------------- |
| Backend p99           | > 1000ms         | > 2000ms               | Check slow query log, DB connections    |
| Database query time   | > 100ms          | > 500ms                | Add index, optimize query               |
| GitHub API latency    | > 2000ms         | 3 consecutive failures | Circuit breaker triggers automatically  |
| Groq LLM latency      | > 5000ms         | timeout (8s)           | Fallback engine activates automatically |
| Frontend LCP          | > 2500ms         | > 4000ms               | Check bundle size, server response time |
| Bundle size (JS gzip) | > 180KB          | > 200KB (CI fails)     | Analyze dist/stats.html treemap         |
| Error rate (5xx)      | > 1% of requests | > 5%                   | Check Sentry for stack traces           |

---

## Performance Optimization Checklist

### Frontend

- [ ] Check `dist/stats.html` treemap — identify the largest modules
- [ ] Lazy-load page-level components with `React.lazy()` + `Suspense`
- [ ] Verify `recharts` is not imported in routes that don't use charts
- [ ] Enable HTTP/2 on Vercel (enabled by default — verify headers)
- [ ] Set long-lived cache headers for hashed static assets

### Backend

- [ ] Ensure PostgreSQL indexes exist for all filtered columns (done: see `postgres.js`)
- [ ] Set `Pool.max` connections appropriate for Render's CPU count
- [ ] Check Redis cache HIT rate in logs — low hit rate → increase TTL
- [ ] Profile with `clinic.js` on a staging clone for CPU bottlenecks

### Database

- [ ] Run `EXPLAIN ANALYZE` on any query appearing in the slow query log
- [ ] Check `pg_stat_user_indexes` for unused indexes (waste of write cost)
- [ ] Archive pipeline_results older than 7 days (auto-cleanup job exists in `database.js`)

---

## Load Testing (Manual — not in CI)

Use [k6](https://k6.io/) to simulate 100 concurrent users:

```javascript
// k6-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // ramp up
    { duration: '60s', target: 100 }, // hold at 100 concurrent users
    { duration: '20s', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'], // p99 < 2s
    http_req_failed: ['rate<0.01'], // < 1% errors
  },
};

export default function () {
  const r = http.get('https://<BACKEND_URL>/health/live');
  check(r, { 'status 200': (s) => s.status === 200 });
  sleep(1);
}
```

Run: `k6 run k6-load-test.js`

---

## Tracking Performance Over Time

1. After each release: run the baseline capture commands above
2. Commit the JSON snapshot to this directory with a date suffix
3. Compare against the previous snapshot using `jq`:

```bash
# Compare p99 for a specific route between two snapshots
jq '
  .requests.by_route["GET /repos"].p99 as $current |
  "Current p99: \($current)ms"
' performance-baselines/backend-$(date +%Y-%m-%d).json
```

4. The CI `performance.yml` workflow enforces bundle and Lighthouse budgets
   automatically on every PR — no manual check needed for frontend.
