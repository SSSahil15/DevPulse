# Project Directory Structure

DevPulse is organized in a highly structured, clean-cut, three-tier mono-repository format to keep dependencies completely isolated.

---

## Workspace Directory Tree

Below is the directory architecture detailing critical routing, components, and service configurations:

```text
/Users/sssa15/DevPulse
├── .github/                 # Git Actions workflows & dependabot configs
│   └── workflows/
│       └── devpulse-ci.yml  # Main parallel CI/CD matrix pipeline
├── ai/                      # Python FastAPI microservice
│   ├── app.py               # FastAPI server and health endpoints
│   ├── services/            # AI scoring / failure prediction
│   ├── Dockerfile
│   └── requirements.txt
├── backend/                 # Node/Express backend core
│   ├── src/
│   │   ├── config/          # Zod-validated environment config
│   │   ├── controllers/     # API controller logic (MVC)
│   │   ├── db/              # Database pool & postgres transactions
│   │   ├── routes/          # REST Endpoint router paths
│   │   ├── services/        # Core business services (Redis, GitHub, workers)
│   │   └── app.js           # Server application initialization
│   ├── Dockerfile
│   ├── package.json
│   └── jest.config.js
├── docs/                    # Structural documentation system (Markdown)
├── frontend/                # React (Vite) frontend application
│   ├── src/
│   │   ├── components/      # Modular, semantic UI elements
│   │   ├── context/         # Dashboard central state hooks
│   │   ├── pages/           # Pages (Dashboard, Reports, Auth, Callback)
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── e2e/                     # Playwright end-to-end spec suite
├── docker-compose.yml       # DevSecOps multi-container layout
└── render.yaml              # Production cloud infrastructure deployment blueprint
```

---

## Architectural Guardrails

To preserve this modular structure:

1. **Never Import Cross-Directories**: Node modules or packages inside `backend` should never import from `frontend` or `ai`.
2. **Decoupled API Routing**: All backend routers (`src/routes/*`) must delegate business execution logic completely to controllers (`src/controllers/*`), keeping routing files thin and readable.
3. **No Direct SQLite calls**: The database abstraction has been migrated to standard `postgres.js`. Query operations must flow strictly through the pool APIs.
