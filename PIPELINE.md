# DevPulse CI/CD Pipeline Guide

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Push/PR    │────▶│  GitHub     │────▶│  DevPulse   │
│  to repo    │     │  Actions    │     │  Backend    │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                    │
                    ┌──────┴──────┐      ┌──────┴──────┐
                    │  6 Stages:  │      │ POST /api/  │
                    │  1. Backend │      │ pipeline/   │
                    │  2. Frontend│      │ results     │
                    │  3. Security│      └─────────────┘
                    │  4. Docker  │
                    │  5. Report  │
                    │  6. Deploy  │
                    └─────────────┘
```

## Pipeline Stages

| # | Stage | What it does | Blocks deploy? |
|---|-------|-------------|----------------|
| 1 | **Backend** | `npm ci` → syntax check → `npm test` | ✅ Yes if tests fail |
| 2 | **Frontend** | `npm ci` → `vite build` → `npm test` | ✅ Yes if build fails |
| 3 | **Security** | Trivy filesystem scan (CRITICAL/HIGH/MEDIUM) | ✅ Yes if critical CVEs |
| 4 | **Docker** | Build image → Trivy image scan | ✅ Yes if build fails |
| 5 | **Report** | POST results to DevPulse API | ❌ Never blocks |
| 6 | **Deploy** | Gate check: only runs on `main` push | N/A |

## Setup Instructions

### 1. Push the workflow to GitHub

```bash
git add .github/workflows/devpulse-ci.yml
git add backend/Dockerfile backend/.dockerignore
git add backend/src/routes/pipeline.routes.js
git add backend/src/app.test.js
git commit -m "feat: add CI/CD pipeline with GitHub Actions"
git push origin main
```

The pipeline will trigger automatically on the push.

### 2. Configure GitHub Secrets (optional)

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value | Required? |
|--------|-------|-----------|
| `DEVPULSE_API_URL` | Your deployed backend URL (e.g. `https://devpulse-api.example.com`) | Optional — if not set, the report step is skipped |
| `DEVPULSE_API_TOKEN` | A Bearer token for the pipeline API | Optional |

> **For local development**, you don't need these secrets. The pipeline will still run all stages and save logs as artifacts.

### 3. View Results

After a pipeline run:
1. Go to your repo → **Actions** tab
2. Click the latest run
3. Download artifacts:
   - `backend-logs` — install, syntax check, and test output
   - `frontend-logs` — install, build, and test output
   - `security-reports` — Trivy scan JSON + human-readable summary
   - `docker-reports` — Docker build log + image scan results

### 4. Pipeline API Endpoints

Once your backend is deployed, the pipeline sends data to:

```
POST /api/pipeline/results     — Receive CI run data
GET  /api/pipeline/results     — List all results (supports ?repository=, ?branch=, ?limit=)
GET  /api/pipeline/results/:id — Get single result by run ID
GET  /api/pipeline/health      — Pipeline service health + success rate
```

#### Example: Query results locally

```bash
# Get all results
curl http://localhost:4000/api/pipeline/results

# Filter by repo
curl http://localhost:4000/api/pipeline/results?repository=SSSahil15/DevPulse

# Pipeline health
curl http://localhost:4000/api/pipeline/health
```

## Docker

### Build locally

```bash
cd backend
docker build -t devpulse-backend .
docker run -p 4000:4000 --env-file .env devpulse-backend
```

### Image details

- Base: `node:20-alpine` (multi-stage, ~120MB)
- Runs as non-root user `devpulse`
- Built-in healthcheck at `/health`
- Only production dependencies included

## Integration with DevPulse AI

The pipeline results feed directly into the AI risk engine:

1. Each pipeline run generates a structured JSON payload
2. The payload includes test results, security findings, and build status
3. The AI predictor at `http://localhost:8000/analyze` can consume this data
4. Future: auto-trigger analysis after each pipeline run

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Pipeline fails on `npm ci` | Ensure `package-lock.json` is committed |
| Trivy scan times out | First run downloads vulnerability DB (~30s) |
| Docker build fails | Check the `backend/Dockerfile` paths |
| Report step shows "skipping" | Set `DEVPULSE_API_URL` in GitHub Secrets |
| Deploy stage doesn't run | Only triggers on `push` to `main` branch |
