# DevPulse Observability Stack

Full observability for DevPulse using the **Grafana LGTM stack** (Loki, Grafana, Tempo, Mimir/Prometheus).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DevPulse Services                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌────────┐  │
│  │   Backend    │  │    Worker    │  │ AI Svc   │  │ Redis  │  │
│  │  :4000       │  │  (BullMQ)   │  │ :8000    │  │ :6379  │  │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  └───┬────┘  │
│         │ OTLP traces     │               │ OTLP       │       │
│         │ /metrics scrape  │               │ /metrics   │       │
└─────────┼──────────────────┼───────────────┼────────────┼───────┘
          │                  │               │            │
          ▼                  ▼               ▼            ▼
   ┌─────────────┐    ┌────────────┐   ┌──────────┐  ┌──────────────┐
   │    OTel     │    │ Prometheus │   │  Redis   │  │  Postgres    │
   │  Collector  │───▶│  :9090     │   │ Exporter │  │  Exporter   │
   │  :4317/4318 │    └─────┬──────┘   │  :9121   │  │  :9187      │
   └──────┬──────┘          │          └────┬─────┘  └──────┬──────┘
          │                 │ scrapes        │               │
          │ traces          │───────────────────────────────▶│
          ▼                 ▼
   ┌─────────────┐    ┌───────────────────────────────────────┐
   │    Tempo    │    │               Grafana :3001            │
   │  :3200      │◀───│  Dashboards / Alerts / Explore        │
   └─────────────┘    │  Data Sources: Prometheus+Loki+Tempo  │
                      └───────────────────────────────────────┘
                                        ▲
   ┌─────────────┐    ┌─────────────┐   │
   │   Promtail  │───▶│    Loki     │───┘
   │ (log agent) │    │  :3100      │
   └─────────────┘    └─────────────┘
```

## Quick Start

### Start everything together (recommended)
```bash
# From the /DevPulse root directory:
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

### Start only the observability stack (against an already running app)
```bash
docker compose -f docker-compose.observability.yml up -d
```

### Stop the observability stack only
```bash
docker compose -f docker-compose.observability.yml down
```

## Access Points

| Service    | URL                        | Credentials      |
|------------|----------------------------|------------------|
| Grafana    | http://localhost:3001       | admin / devpulse |
| Prometheus | http://localhost:9090       | —                |
| Loki API   | http://localhost:3100       | —                |
| Tempo API  | http://localhost:3200       | —                |

## Grafana Dashboards

The **DevPulse — System Overview** dashboard is auto-provisioned at startup. It includes:

- **API Request Rate** — req/s with route breakdown
- **API Latency** — p50 / p95 / p99 histograms
- **Error Rate** — 4xx and 5xx percentages
- **Scan Queue Depth** — BullMQ waiting/active job counts
- **AI Inference Duration** — p50/p95/p99 for LLM analysis calls
- **AI Analysis Success/Error Rate** — per-request outcomes
- **Redis Memory & Hit Rate** — cache efficiency
- **PostgreSQL Connections & Query Rate** — database health
- **Live Application Logs** — filtered Loki error/warn stream with trace correlation

## Trace → Log Correlation

All logs from the Node.js backend and the Python AI service automatically include `trace_id` and `span_id` fields. In Grafana:

1. Open **Explore → Tempo** and find a trace.
2. Click any span → **Logs for this span** → jumps directly to Loki.

Or:

1. Open **Explore → Loki** and find a log line.
2. Click the `TraceID` link in the log → opens the full distributed trace in Tempo.

## Alerting Rules

Alerting rules are defined in `observability/alerting_rules.yml`:

| Alert                 | Threshold              | Severity |
|-----------------------|------------------------|----------|
| HighErrorRate         | 5xx > 5% for 5m        | critical |
| HighLatency           | p99 > 2s for 5m        | warning  |
| QueueDepthHigh        | > 50 waiting jobs      | warning  |
| AIInferenceErrors     | > 10% error rate       | critical |
| AIInferenceSlow       | p95 > 10s              | warning  |
| RedisHighMemory       | > 80% max memory       | warning  |
| RedisDown             | Unreachable for 1m     | critical |
| PostgresDown          | Unreachable for 1m     | critical |
| PostgresHighConnections | > 80% max_connections | warning  |

## Metrics Exposed

### Backend (`:4000/metrics`)
- `http_requests_total` — by method, route, status_code
- `http_request_duration_seconds` — histogram with buckets
- `bullmq_queue_waiting` / `bullmq_queue_active` — queue depth gauges
- `bullmq_jobs_total` — completed/failed counters
- `bullmq_job_duration_seconds` — job processing time
- `nodejs_*` — default Node.js process metrics (heap, GC, event loop lag)

### AI Service (`:8000/metrics`)
- `ai_analysis_requests_total` — by status (success/error)
- `ai_analysis_duration_seconds` — end-to-end pipeline timing
- `http_requests_total` — by method, route, status_code
- `http_request_duration_seconds` — histogram

### Infrastructure
- **Redis** — via `redis_exporter` at `:9121`
- **PostgreSQL** — via `postgres_exporter` at `:9187`

## Files

```
observability/
├── prometheus.yml              # Scrape configuration
├── alerting_rules.yml          # Prometheus alert rules
├── loki.yml                    # Loki config
├── promtail.yml                # Promtail (Docker log scraper)
├── tempo.yml                   # Grafana Tempo config
├── otel-collector.yml          # OTel Collector pipelines
└── grafana/
    ├── provisioning/
    │   ├── datasources/
    │   │   └── datasources.yml  # Auto-wires Prometheus, Loki, Tempo
    │   └── dashboards/
    │       └── dashboards.yml   # Points Grafana to dashboard folder
    └── dashboards/
        └── devpulse-overview.json  # Main system dashboard
```
