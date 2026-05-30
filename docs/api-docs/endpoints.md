# REST Endpoints API Reference

This document catalogs all core RESTful API endpoints exposed by the DevPulse API server.

---

## 1. Authentication Endpoints

### `GET /auth/github`

- **Description**: Initiates the GitHub OAuth redirect flow.
- **Authentication**: None.

### `GET /auth/github/callback`

- **Description**: Receives authorization codes from GitHub and redirects to `/auth/callback?token=...`.
- **Authentication**: None.

### `GET /auth/me`

- **Description**: Returns details of the currently authenticated session.
- **Headers**: `Authorization: Bearer <JWT>`
- **Response `200 OK`**:
  ```json
  {
    "authenticated": true,
    "githubTokenSynced": true,
    "user": {
      "id": "123456",
      "username": "sahil_developer",
      "avatarUrl": "https://avatars.githubusercontent.com/u/123",
      "email": "sahil@devpulse.com"
    }
  }
  ```

---

## 2. Repository & Analysis Endpoints

### `GET /repos`

- **Description**: Lists repositories accessible to the authenticated GitHub user.
- **Headers**: `Authorization: Bearer <JWT>`

### `POST /analyze`

- **Description**: Runs the fast AI repository metadata analysis.
- **Headers**: `Authorization: Bearer <JWT>`
- **Request Body**:
  ```json
  {
    "repositoryFullName": "SSSahil15/DevPulse"
  }
  ```

---

## 3. Pipeline & Simulation Endpoints

### `POST /api/pipeline/simulate`

- **Description**: Triggers an async CI/CD simulation with a real Trivy scan.
- **Headers**: `Authorization: Bearer <JWT>`
- **Request Body**:
  ```json
  {
    "repositoryFullName": "SSSahil15/DevPulse"
  }
  ```
- **Response `202 Accepted`**:
  ```json
  {
    "message": "Scan job accepted. Poll the status endpoint for results.",
    "jobId": "job_9a2f1c8e0b4d2a6f",
    "statusUrl": "/api/pipeline/simulate/status/job_9a2f1c8e0b4d2a6f"
  }
  ```

### `GET /api/pipeline/simulate/status/:jobId`

- **Description**: Fetches the current status and final record for an async simulation job.
- **Headers**: `Authorization: Bearer <JWT>`
- **Response `200 OK`**:
  ```json
  {
    "jobId": "job_9a2f1c8e0b4d2a6f",
    "status": "processing",
    "repository": "SSSahil15/DevPulse"
  }
  ```

### `GET /api/pipeline/results`

- **Description**: Lists stored pipeline results. Supports `repository`, `branch`, `limit`, and `offset` query params.

### `GET /api/pipeline/results/:runId`

- **Description**: Fetches one pipeline result by numeric GitHub Actions run ID.

---

## 4. AI Copilot Endpoint

### `POST /api/ai/chat`

- **Description**: Sends a contextual question to the AI Copilot. Falls back to heuristic responses if Groq is unavailable.
- **Headers**: `Authorization: Bearer <JWT>`
- **Request Body**:
  ```json
  {
    "query": "Explain the top vulnerability",
    "context": {
      "pipelineData": {}
    },
    "history": []
  }
  ```

---

## 5. Public Sharing Endpoints

### `POST /api/reports`

- **Description**: Exports a static, read-only report snapshot and issues a shareable token.
- **Headers**: `Authorization: Bearer <JWT>`
- **Request Body**:
  ```json
  {
    "repository": "SSSahil15/DevPulse",
    "repoMeta": {
      "description": "AI-powered DevSecOps dashboard",
      "language": "JavaScript"
    }
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "token": "dp_rpt_5f8a2e1d7c3b9a0f...",
    "shareUrl": "http://localhost:5174/report/dp_rpt_5f8a2e1d7c3b9a0f...",
    "expiresAt": "2026-05-31T00:00:00.000Z"
  }
  ```

### `GET /api/reports/:token`

- **Description**: Fetches a public, static report snapshot.
- **Authentication**: None (Public Access).
- **Response `200 OK`**:
  ```json
  {
    "token": "dp_rpt_5f8a2e...",
    "repository": "SSSahil15/devpulse",
    "score": 92,
    "stages": {
      "security": { "critical": 0, "high": 2 }
    },
    "expired": false
  }
  ```
