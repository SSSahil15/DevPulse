<div align="center">
  <img src="./assets/logo.jpeg" width="120" alt="DevPulse Logo" />

  <h1>DevPulse</h1>

  <p><strong>The Intelligent DevSecOps Platform that turns raw engineering signals into action.</strong></p>

  <p>
    <a href="#-demo">Live Demo</a> ·
    <a href="#-quick-start">Quick Start</a> ·
    <a href="#-features">Features</a> ·
    <a href="#%EF%B8%8F-architecture">Architecture</a> ·
    <a href="#-roadmap">Roadmap</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white" alt="Node" />
    <img src="https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/AI-Groq%20LLaMA%203.3-FF6F00" alt="Groq" />
    <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker" />
    <img src="https://img.shields.io/badge/Observability-Grafana%20LGTM-F46800?logo=grafana&logoColor=white" alt="Grafana" />
    <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
  </p>
</div>

---

## 🖼️ Screenshots

<div align="center">
  <img src="./assets/Devpulse12.png" alt="DevPulse Landing Page" width="800" />
  <p><em>DevPulse Landing Page — Ship faster with zero deployment fear</em></p>
</div>

<br/>

<div align="center">
  <img src="./assets/Devpulse1.png" alt="Dashboard Pipeline Analysis" width="800" />
  <p><em>Dashboard — Real-time CI/CD Pipeline Analysis</em></p>
</div>

<br/>

<div align="center">
  <img src="./assets/Devpulse10.png" alt="AI Repository Analyzer" width="800" />
  <p><em>AI Repository Analyzer — Predictive Risk Scoring & Intelligence</em></p>
</div>

---

## 💔 The Problem

Modern development teams rely on dozens of disconnected tools:

- GitHub for source control
- CI/CD systems for deployments
- Security scanners for vulnerabilities
- Monitoring tools for observability
- Documentation platforms for knowledge sharing

The result is fragmented visibility, delayed issue detection, and slow decision-making.

Teams spend more time understanding problems than solving them.

---

## 💡 The Solution

**DevPulse** is an AI-native DevSecOps platform that analyzes repositories, security posture, deployment readiness, and engineering health from a single dashboard.

Instead of digging through logs, reports, and alerts, DevPulse answers:

- Is this repository healthy?
- Is it safe to deploy?
- What security issues should be fixed first?
- Where are the highest engineering risks?
- What actions should the team take next?

All powered by real-time analysis and an intelligent AI Copilot.

---

## ✨ Features

### 📊 The DevPulse Score
A proprietary, composite health metric calculated from security vulnerabilities, test suite reliability, CI/CD stability, and ML-driven predictive risk. One number. Zero ambiguity.

### 🤖 Action-First AI Copilot
Powered by **LLaMA 3.3-70B via Groq**, the Copilot is not a generic chatbot. It knows your pipeline, references your CVEs by ID, explains failures in plain language, and offers one-click remediation paths. Even if the LLM is unreachable, a deterministic fallback engine keeps the Copilot useful.

### ⚡ Real-Time Async Scanning
Repository analysis is offloaded to **BullMQ workers backed by Redis**. Your UI never blocks. Live progress stages — Cloning → Trivy Scan → AI Analysis — stream to your browser via **Socket.io WebSockets** in real time.

### 🔒 Security-First by Design
- Trivy filesystem and container image scanning with CRITICAL/HIGH/MEDIUM severity gates
- Zod-validated inputs on every API endpoint — SSRF, XSS, SQLi mitigated by default
- Redis-backed rate limiting on all sensitive endpoints
- Strict CSP enforcement via `helmet`
- OAuth tokens never exposed to the client — encrypted server-side JWT sessions only

### 👁️ Full-Stack Observability
One command adds the complete **Grafana LGTM stack** (Loki, Grafana, Tempo, Mimir/Prometheus). Pre-provisioned dashboards track backend latency, AI inference duration, BullMQ worker queue depth, and PostgreSQL performance. OpenTelemetry traces span from your Node.js API into the Python microservice.

### 📤 Shareable Reports
Generate a clean, public-read-only report link for any analyzed repository. Share repository health with your team, stakeholders, or reviewers in one click.

### 📸 Platform Features & Previews

#### Security & AI Remediation
<div align="center">
  <img src="./assets/Devpulse4.png" width="400" alt="Security Findings & Vulnerabilities" />
  <img src="./assets/Devpulse6.png" width="400" alt="AI Remediation Dashboard" />
</div>
<div align="center">
  <img src="./assets/Devpulse7.png" width="400" alt="Remediation Analysis" />
  <img src="./assets/Devpulse8.png" width="400" alt="Automated PR Generation Preview" />
</div>

#### Actionable Intelligence & Reporting
<div align="center">
  <img src="./assets/Devpulse5.png" width="400" alt="Action-First AI Copilot" />
  <img src="./assets/Devpulse9.png" width="400" alt="PDF Scan Report Generation" />
</div>

#### Deep Pipeline Insights
<div align="center">
  <img src="./assets/Devpulse11.png" width="400" alt="CI/CD Pipeline Live Logs" />
  <img src="./assets/Devpulse3.png" width="400" alt="Pipeline Telemetry Node Graph" />
</div>

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts, Lucide React, Socket.io Client |
| **Backend** | Node.js, Express.js, PostgreSQL, Redis, BullMQ, JWT, GitHub OAuth |
| **AI Service** | Python, FastAPI, LangChain, Groq SDK, Custom Eval Framework |
| **Security** | Trivy, Zod, Helmet, express-rate-limit, rate-limit-redis |
| **Observability** | Grafana, Prometheus, Loki, Tempo, OpenTelemetry Collector, Promtail |
| **Infrastructure** | Docker, Docker Compose, GitHub Actions CI/CD |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser                              │
│              React + Vite  ←──── Socket.io ────┐            │
└──────────────────────┬──────────────────────────┼────────────┘
                       │ REST                      │ WebSocket
              ┌────────▼────────┐        ┌─────────┴──────────┐
              │  Node.js API    │        │   BullMQ Worker     │
              │  (Express)      │        │   (Redis-backed)    │
              └───┬─────┬───────┘        └──────────┬──────────┘
                  │     │                            │
         ┌────────▼┐  ┌─▼──────────┐   ┌────────────▼─────────┐
         │ GitHub  │  │ PostgreSQL  │   │  Python AI Service   │
         │  OAuth  │  │    (DB)     │   │  (FastAPI + LangChain)│
         └─────────┘  └────────────┘   └──────────────────────┘
                                                    │
                                           ┌────────▼──────────┐
                                           │   Groq LLaMA 3.3  │
                                           │   (LLM Inference) │
                                           └───────────────────┘
              │
   ┌──────────▼──────────────────────────────────┐
   │        Observability Stack (optional)        │
   │  Grafana · Prometheus · Loki · Tempo · OTEL  │
   └─────────────────────────────────────────────┘
```

**Repository structure:**

```
devpulse/
├── ai/                     # Python FastAPI AI microservice & Eval Framework
├── backend/                # Node.js Express API, BullMQ Workers, WebSockets
├── frontend/               # React / Vite Web Dashboard
├── observability/          # Grafana Dashboards, Prometheus, Loki, Tempo configs
├── .github/workflows/      # GitHub Actions CI/CD pipelines
├── docker-compose.yml                    # Core application stack
└── docker-compose.observability.yml      # LGTM monitoring stack
```

---

## ⚡ Quick Start

DevPulse is fully Dockerized. The entire platform — frontend, backend, AI service, database, and cache — starts with a single command.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A [Groq API Key](https://console.groq.com/) (free tier available)
- A [GitHub OAuth App](https://github.com/settings/developers) with callback URL set to `http://localhost:4000/auth/github/callback`

### 1. Clone the repository

```bash
git clone https://github.com/SSSahil15/DevPulse.git
cd DevPulse
```

### 2. Configure environment variables

**`backend/.env`**
```env
NODE_ENV=production
PORT=4000
FRONTEND_URL=http://localhost:5174
BACKEND_URL=http://localhost:4000

DATABASE_URL=postgresql://devpulse:devpulse@postgres:5432/devpulse
REDIS_URL=redis://redis:6379

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

TOKEN_ENCRYPTION_SECRET=your_32_character_secret_here
JWT_SECRET=your_secure_jwt_secret_string

GROQ_API_KEY=your_groq_api_key
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:4000
```

### 3. Launch

**Core stack (App + DB + Redis + AI):**
```bash
docker compose up -d
```

**With full observability (adds Grafana, Loki, Tempo, Prometheus):**
```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

| Service | URL |
|---|---|
| DevPulse App | http://localhost:5174 |
| Grafana Dashboards | http://localhost:3001 (admin / devpulse) |
| Backend API | http://localhost:4000 |
| Swagger Docs | http://localhost:4000/api-docs |

---

## 🕹️ Usage

1. **Log in** at `http://localhost:5174` via GitHub OAuth
2. **Select a repository** from your GitHub account
3. **Watch the analysis run live** — BullMQ processes the job, WebSockets push stage-by-stage progress to your dashboard
4. **Review your DevPulse Score** — security findings, test reliability, and predictive risk in one place
5. **Open the AI Copilot** — ask about any vulnerability, failed stage, or score breakdown and get actionable remediation steps
6. **Share your report** — generate a public read-only link for stakeholders or teammates

---

## 🔬 AI Evaluation Framework

DevPulse includes a dedicated benchmarking system for the AI service under `ai/evaluators/`. It runs the LLM against curated security and pipeline datasets, scoring responses on accuracy and relevance. This enables continuous quality measurement as models or prompts change.

```bash
# Run evaluations inside the AI container
docker compose exec ai python scripts/evaluate.py
```

---

## ☁️ Cloud Deployment

DevPulse is fully containerized and deploys cleanly to any VPS (AWS EC2, DigitalOcean, Hetzner) or managed platform (Render, Railway).

**Recommended split:**
- **Frontend** → Vercel (set `VITE_API_URL` to your backend URL)
- **Backend + AI** → Render (Docker support, free tier available)

Update your GitHub OAuth App's callback URL to your production backend domain before deploying.

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full cloud configuration guide.

---

## 🧪 CI/CD Pipeline

DevPulse ships with a production-grade GitHub Actions pipeline across **6 automated stages**:

| Stage | What it does | Blocks deploy? |
|---|---|---|
| **Backend** | `npm ci` → lint → test | ✅ Yes |
| **Frontend** | `npm ci` → Vite build → test | ✅ Yes |
| **Security** | Trivy filesystem scan (CRITICAL/HIGH) | ✅ Yes |
| **Docker** | Build image → Trivy image scan | ✅ Yes |

Additional workflows: CodeQL static analysis, Dependabot auto-merge, Lighthouse performance auditing, pip-audit for Python dependencies.

---

## 🗺️ Roadmap

| Status | Feature | Category |
| :---: | :--- | :--- |
| ✅ | **GitHub OAuth & repository analysis** | Core Platform |
| ✅ | **DevPulse Score engine** | Intelligence |
| ✅ | **Real-time WebSocket updates** | Infrastructure |
| ✅ | **AI Copilot (LLaMA 3.3 + fallback)** | Copilot |
| ✅ | **Trivy security scanning integration** | Security |
| ✅ | **Grafana LGTM observability stack** | Infrastructure |
| ✅ | **Shareable reports** | Reporting |
| ✅ | **Swagger / OpenAPI documentation** | Docs |
| 🔄 | **Historical trend analysis across multiple scans** | Intelligence |
| 📅 | **Team dashboards and multi-user collaboration** | Enterprise |
| 📅 | **Scheduled automatic analysis & notifications** | Automation |
| 📅 | **Multi-repository aggregated health view** | Enterprise |
| 📅 | **Support for GitLab and Bitbucket** | Integrations |
| 📅 | **Code-level remediation suggestions in AI Copilot** | Copilot |

<br>
<p align="center">
  <em><b>Legend:</b> &nbsp; ✅ Completed &nbsp; | &nbsp; 🔄 In Progress &nbsp; | &nbsp; 📅 Planned</em>
</p>

---

## 🤝 Contributing

Contributions are welcome! Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) for guidelines on opening issues, submitting pull requests, and the local development workflow.

---

## 📄 License

[MIT](./LICENSE) — free to use, fork, and build on.

---

<div align="center">
  <p>Built with ❤️ by <strong>Sahil Ansari</strong></p>
  <p>
    <a href="https://github.com/SSSahil15/DevPulse">⭐ Star on GitHub</a> ·
    <a href="https://github.com/SSSahil15/DevPulse/issues">🐛 Report a Bug</a> ·
    <a href="https://github.com/SSSahil15/DevPulse/issues">💡 Request a Feature</a>
  </p>
</div>
