# Local Development Setup

This guide details how to set up each standalone component of DevPulse locally on your development machine for active code modifications.

---

## 1. Setup Backend (Express.js)

1. Navigate to backend:
   ```bash
   cd backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` configuration:
   ```bash
   cp .env.example .env
   ```
4. Start development server with live reload:
   ```bash
   npm run dev
   ```
   _The backend will boot on `http://localhost:4000`._

---

## 2. Setup Frontend (React + Vite)

1. Navigate to frontend:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Boot Vitest or the Vite development server:
   ```bash
   npm run dev
   ```
   _The frontend UI will boot on `http://localhost:5174`._

---

## 3. Setup AI Service (FastAPI)

1. Navigate to AI:
   ```bash
   cd ../ai
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI development server:
   ```bash
   uvicorn app:app --reload --port 8000
   ```
   _The AI service will boot on `http://localhost:8000`._

---

## 4. Spin Up PostgreSQL and Redis

Instead of manually installing Postgres and Redis on your machine, simply spin them up using Docker Compose:

```bash
docker-compose up -d postgres redis
```

This starts our lightweight Postgres database (Port `5432`) and Redis cluster (Port `6379`) instantly.

---

> [!TIP]
> Use the command `npm run test` inside either the `/frontend` or `/backend` directories to verify that your local environment setup passes all integrated unit tests!
