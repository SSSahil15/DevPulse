<div align="center">
  <img src="./assets/logo.png" width="120" alt="DevPulse Logo" />
  <h1>DevPulse</h1>
  <p><strong>Intelligent DevSecOps Platform & AI Pipeline Copilot</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/react-18.x-blue.svg" alt="React" />
    <img src="https://img.shields.io/badge/node.js-20%2B-green.svg" alt="Node" />
    <img src="https://img.shields.io/badge/python-3.11-yellow.svg" alt="Python" />
    <img src="https://img.shields.io/badge/ai-Groq-orange.svg" alt="Groq" />
    <img src="https://img.shields.io/badge/docker-compose-2496ED.svg" alt="Docker" />
  </p>
</div>

---

## 📖 Overview

**DevPulse** is a production-grade DevSecOps platform that analyzes your GitHub repositories, calculates a comprehensive "DevPulse Score," and provides an intelligent, action-oriented AI Copilot to help you fix vulnerabilities, improve test stability, and prevent deployment failures.

By merging CI/CD heuristics, Trivy security scanning, repository health signals, and AI-assisted guidance, DevPulse surfaces exactly what matters, when it matters.

---

## ✨ Key Features

- 🔒 **Secure GitHub OAuth**: Direct authentication using GitHub OAuth Apps with encrypted, server-side JWT session management.
- ⚡ **Asynchronous Scanning Engine**: Powered by **Redis & BullMQ**. Repository analysis jobs are offloaded to dedicated background workers, ensuring zero UI blocking.
- 📡 **Real-Time WebSockets**: Instant bidirectional communication via Socket.io. The frontend receives live progress updates as scans progress through stages (Cloning, Trivy Scan, AI Analysis).
- 📊 **The DevPulse Score**: A proprietary metric calculated from security vulnerabilities, test results, and ML-driven predictive failure analysis.
- 🤖 **Action-First AI Copilot**: A context-aware chat widget powered by `llama-3.3-70b-versatile`. Automatically references pipeline data, cites CVEs, and provides one-click action buttons. Includes a built-in **AI Evaluation Framework** for continuous benchmark testing.
- 🛡️ **Intelligent Fallback**: Even if the LLM API is unavailable, DevPulse falls back to a deterministic reasoning engine to guide you.
- 👁️ **Full-Stack Observability**: Built-in integration with the **Grafana LGTM Stack** (Loki, Grafana, Tempo, Mimir/Prometheus) using OpenTelemetry for distributed tracing and centralized logging.

---

## 🛡️ Hardening, Observability & Quality Engineering

DevPulse has been heavily audited, refactored, and hardened:

### 🔒 Security & Rate Limiting
- **Strict Input Validation**: Zod schemas enforce query validation across all API endpoints, mitigating SSRF, XSS, and SQLi.
- **Redis-Backed Rate Limiting**: Wired rate limiters to critical endpoints (analysis submissions, AI chat) using `express-rate-limit` and `rate-limit-redis` to guard against scraping, bot abuse, and DoS.
- **HTTP Security Headers**: Enforced using `helmet` with strict CSP rules.
- **CORS Lockdowns**: Dynamic origin checking for secure local testing and production domains.

### 📊 Database Optimizations
- **PostgreSQL Migration**: Fully migrated to Postgres with a robust connection pool.
- **Windowed Pagination**: Employs `COUNT(*) OVER()` window functions to retrieve listings and total counts in a single database round-trip.

### 📝 Observability & Distributed Tracing
- **Grafana Dashboards**: Includes pre-provisioned Grafana dashboards tracking backend latency, AI inference duration, worker queue depths, and PostgreSQL stats.
- **OpenTelemetry**: Spans propagate across the Node.js backend and the Python AI microservice. Traces are exported directly to Tempo.
- **Prometheus Metrics**: `prom-client` in Node and Python exposes robust API tracking metrics.
- **Loki Logging**: Complete central log aggregation via Docker's Promtail scraper.

### 🧹 Codebase Clarity
- DevPulse has been surgically cleaned. All obsolete test suites, unused legacy custom metric wrappers, dead AI RAG integrations, and abandoned scripts have been entirely removed to ensure a 100% lean, production-only footprint.

---

## 🛠️ Tech Stack

**Frontend**
- React 18 & Vite (Tailwind CSS, Glassmorphism, Recharts, Lucide React)
- Socket.io Client (Real-time updates)

**Backend (Node.js)**
- Express.js (API & WebSockets)
- PostgreSQL (Primary DB)
- Redis & BullMQ (Message broker & Job queues)
- Custom JWT Authentication & GitHub OAuth

**AI Microservice (Python)**
- FastAPI & Uvicorn
- LangChain & OpenAI / Groq SDKs
- Dedicated Evaluation Framework

**Observability & Infrastructure**
- Docker & Docker Compose
- Grafana, Prometheus, Loki, Tempo, OpenTelemetry Collector

---

## 🏗️ Architecture

```text
devpulse/
├── ai/                     # Python FastAPI Predictive ML microservice & Eval Framework
├── backend/                # Node.js Express API, BullMQ Workers, WebSockets
├── frontend/               # React / Vite Web Dashboard
├── observability/          # Grafana Dashboards, Prometheus Configs, Loki/Tempo
├── docker-compose.yml      # Core application stack (App, DB, Redis)
└── docker-compose.observability.yml # LGTM Monitoring Stack
```

---

## 🚀 Local Setup & Installation

DevPulse is fully Dockerized for a seamless one-click local setup!

### Prerequisites
- **Docker** and **Docker Compose** installed.
- **Groq API Key**
- **GitHub OAuth App** (Authorization callback URL set to `http://localhost:4000/auth/github/callback`)

### 1. Environment Configuration

Create a `.env` file in the `backend/` directory:
```env
NODE_ENV=production
PORT=4000
FRONTEND_URL=http://localhost:5174
BACKEND_URL=http://localhost:4000

# PostgreSQL and Redis (Docker internal hostnames)
DATABASE_URL=postgresql://devpulse:devpulse@postgres:5432/devpulse
REDIS_URL=redis://redis:6379

# GitHub OAuth App credentials
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Secrets
TOKEN_ENCRYPTION_SECRET=12345678901234567890123456789012
JWT_SECRET=your_secure_jwt_secret_string

# LLM integration
GROQ_API_KEY=your-groq-api-key
```

Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:4000
```

### 2. Start the Application

You can launch the core application alone, or with the full observability stack attached:

**Start Core Stack (Frontend, Backend, Worker, AI, Postgres, Redis):**
```bash
docker compose up -d
```

**Start Core + Full Observability Stack (Grafana, Loki, Tempo, Prometheus):**
```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

> **The application will be running at [http://localhost:5174](http://localhost:5174)**
> **Grafana Dashboards will be available at [http://localhost:3001](http://localhost:3001)** (default login: admin / devpulse)

---

## 🕹️ Usage Workflow

1. Navigate to `http://localhost:5174` and log in via GitHub.
2. The dashboard fetches your GitHub repositories.
3. Click a repository to initiate an async analysis. The BullMQ worker processes it, pushing real-time progress via WebSockets to your UI!
4. The system simulates a CI/CD run, fetches security scans, and runs predictive ML.
5. Review your **DevPulse Score**.
6. Open the **AI Copilot** widget in the bottom right corner to discuss vulnerabilities and patch instructions.

---

## ☁️ Cloud Deployment

Since DevPulse is entirely containerized via Docker Compose, deployment to any VPS (AWS EC2, DigitalOcean Droplet, Hetzner) is extremely straightforward.

1. Provision a Linux server with Docker installed.
2. Clone the repository and configure your `.env` files with production secrets.
3. Start the containers using `docker compose up -d`.
4. (Optional) Set up an NGINX reverse proxy or Traefik container to handle SSL/TLS termination and route traffic to the respective internal Docker ports (`4000` for backend, `5174` for frontend, `3001` for Grafana).

---

## 📝 License
MIT License.
