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

## 💔 The Problem

Modern development teams rely on dozens of disconnected tools:
- GitHub for source control
- CI/CD systems for deployments
- Security scanners for vulnerabilities
- Monitoring tools for observability

The result is fragmented visibility, delayed issue detection, and slow decision-making. Teams spend more time understanding problems than solving them.

---

## 💡 The Solution

**DevPulse** is a production-grade, AI-native DevSecOps platform that analyzes repositories, security posture, deployment readiness, and engineering health from a single dashboard. 

Instead of digging through logs, reports, and alerts, DevPulse answers:
- Is this repository healthy?
- Is it safe to deploy?
- What security issues should be fixed first?
- Where are the highest engineering risks?
- What actions should the team take next?

By merging CI/CD heuristics, Trivy security scanning, repository health signals, and AI-assisted guidance, DevPulse surfaces exactly what matters, when it matters. All powered by real-time analysis and an intelligent AI Copilot.

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

Since DevPulse is entirely containerized, deployment to any VPS (AWS EC2, DigitalOcean, Hetzner) or container platform (Render, Railway) is extremely straightforward.

If you are deploying the **Frontend** to Vercel and the **Backend/AI** to Render (using their Docker support):

1. Set `VITE_API_URL` in Vercel to your deployed backend URL.
2. In your GitHub OAuth App, set the production callback URL to:
   ```text
   https://your-backend.onrender.com/auth/github/callback
   ```

**Required Production Backend Variables:**

```env
NODE_ENV=production
BACKEND_URL=https://your-backend.onrender.com
FRONTEND_URL=https://your-frontend.vercel.app
AI_SERVICE_URL=https://your-ai-service.onrender.com

# Managed Database Connections
DATABASE_URL=postgresql://user:password@host:5432/devpulse
REDIS_URL=redis://default:password@host:6379

# GitHub OAuth App credentials
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Secrets
TOKEN_ENCRYPTION_SECRET=generate-a-64-char-secret
JWT_SECRET=generate-a-secure-random-string-min-32-chars

# AI Integration
GROQ_API_KEY=your-groq-api-key
```

---

## 📝 License

MIT License.
