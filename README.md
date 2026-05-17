<div align="center">
  <img src="./assets/logo.png" width="120" alt="DevPulse Logo" />
  <h1>DevPulse</h1>
  <p><strong>Intelligent DevSecOps Platform & AI Pipeline Copilot</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/react-18.x-blue.svg" alt="React" />
    <img src="https://img.shields.io/badge/node.js-20%2B-green.svg" alt="Node" />
    <img src="https://img.shields.io/badge/python-3.11-yellow.svg" alt="Python" />
    <img src="https://img.shields.io/badge/ai-Groq-orange.svg" alt="Groq" />
  </p>
</div>

---

## 📖 Overview

**DevPulse** is a production-grade DevSecOps platform that analyzes your GitHub repositories, calculates a comprehensive "DevPulse Score," and provides an intelligent, action-oriented AI Copilot to help you fix vulnerabilities, improve test stability, and prevent deployment failures.

By merging CI/CD heuristics, Trivy container security scanning, and Predictive ML modeling, DevPulse surfaces exactly what matters, when it matters.

---

## ✨ Key Features

- 🔒 **Secure GitHub OAuth**: Direct authentication using GitHub OAuth Apps with encrypted, server-side JWT session management.
- 📊 **The DevPulse Score**: A proprietary 0-100 metric calculated from security vulnerabilities, test results, and ML-driven predictive failure analysis.
- 🤖 **Action-First AI Copilot**: A context-aware chat widget powered by `llama-3.3-70b-versatile` (via Groq). Automatically references pipeline data, cites CVEs, and provides one-click action buttons to solve issues fast.
- 🛡️ **Intelligent Fallback**: Even if the LLM API is unavailable, DevPulse falls back to a deterministic, data-driven reasoning engine to guide you.
- 🔗 **Shareable Reports**: Generate unique, publicly accessible report links to share pipeline health with your team.

---

## 🛠️ Tech Stack

**Frontend**
- React 18 & Vite
- Tailwind CSS (Glassmorphism design, Dark Mode)
- Recharts (Data Visualization)
- Lucide React (Icons)

**Backend (Node.js)**
- Express.js
- Custom JWT Authentication & GitHub OAuth
- Axios (GitHub API, LLM API calls)
- Cryptography for token encryption
- Nodemon (Development)

**AI Microservice (Python)**
- FastAPI & Uvicorn
- Scikit-learn (RandomForestClassifier for predictive failure analysis)
- Pandas & NumPy

---

## 🏗️ Architecture

```text
devpulse/
├── ai/                     # Python FastAPI Predictive ML microservice
├── backend/                # Node.js/Express API & Orchestration Server
├── frontend/               # React / Vite Web Dashboard
├── render.yaml             # Render blueprint for backend and AI services
└── .github/workflows/      # GitHub Actions CI/CD pipelines
```

---

## 📸 Screenshots

### Dashboard & Analysis Panel
![Dashboard](./assets/dashboard.png)

### AI Copilot & Suggested Actions
![AI Copilot](./assets/copilot.png)

---

## 🚀 Local Setup & Installation

### Prerequisites
- Node.js (v20+)
- Python (v3.11+)
- Groq API Key
- GitHub OAuth App (created via Developer Settings in your GitHub account)

### 1. Environment Configuration

You will need to set up environment variables in **two** places. 

**Backend (`backend/.env`):**
```env
PORT=4000
FRONTEND_URL=http://localhost:5174
BACKEND_URL=http://localhost:4000

# GitHub OAuth App credentials
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Secrets (min 32 characters)
TOKEN_ENCRYPTION_SECRET=12345678901234567890123456789012
JWT_SECRET=your_secure_jwt_secret_string

# LLM integration
GROQ_API_KEY=your-groq-api-key
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:4000
```

*Note: Make sure your GitHub OAuth App's Authorization callback URL is set to `http://localhost:4000/auth/github/callback`.*

### 2. Start the AI Microservice (Terminal 1)

The AI engine runs on Python/FastAPI.

```bash
cd ai
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### 3. Start the Backend (Terminal 2)

The Node orchestrator connects the frontend, GitHub, and the AI microservice.

```bash
cd backend
npm install
npm run dev
```

### 4. Start the Frontend (Terminal 3)

```bash
cd frontend
npm install
npm run dev
```

> **The application will now be running at [http://localhost:5174](http://localhost:5174)**

---

## 🕹️ Usage Workflow

1. Navigate to `http://localhost:5174` and log in via GitHub.
2. The dashboard will automatically fetch your GitHub repositories.
3. Click on a repository to initiate an analysis.
4. The system will simulate a CI/CD run, fetch a Trivy security scan, and request predictive failure metrics from the Python microservice.
5. Review your **DevPulse Score**.
6. Open the floating **AI Copilot** widget in the bottom right corner to discuss vulnerabilities, view root causes, and get specific patching instructions.
7. Click "Share Report" to generate a public dashboard URL.

---

## ☁️ Cloud Deployment

DevPulse is ready for a split deployment:

- **Backend API**: Render Docker service using `backend/Dockerfile`
- **AI service**: Render Docker service using `ai/Dockerfile`
- **Frontend**: Vercel Vite app using `frontend/vercel.json`

The Render blueprint in `render.yaml` defines the backend and AI services. The backend uses a 1 GB persistent disk at `/app/.data` so SQLite-backed sessions, scan jobs, and reports survive redeploys. Configure the backend environment variables in Render, then set `VITE_API_URL` in Vercel to the deployed backend URL.

> Render persistent disks require a paid web service plan; the backend blueprint uses `starter` for that reason.

Required backend variables:

```env
NODE_ENV=production
BACKEND_URL=https://your-backend.onrender.com
FRONTEND_URL=https://your-frontend.vercel.app
AI_SERVICE_URL=https://your-ai-service.onrender.com
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
TOKEN_ENCRYPTION_SECRET=generate-a-64-char-secret
JWT_SECRET=generate-a-secure-random-string-min-32-chars
DATABASE_PATH=/app/.data/devpulse.db
GITHUB_REPO_PAGE_LIMIT=10
GROQ_API_KEY=your-groq-api-key
```

In the GitHub OAuth App, set the production callback URL to:

```text
https://your-backend.onrender.com/auth/github/callback
```

---

## 📝 License
MIT License.
