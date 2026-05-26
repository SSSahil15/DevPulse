# Installation Guide

Setting up DevPulse is straightforward using containerized virtualization via **Docker Compose**, or manually installing the dependencies on your host system.

---

## 1. Prerequisites

Before installing, ensure your machine has the following tools installed:

| Dependency | Minimum Version | Purpose |
|------------|-----------------|---------|
| **Docker** | `24.0.0+` | Container virtualization |
| **Docker Compose** | `v2.20.0+` | Multicontainer services management |
| **Node.js** | `v20.0.0+` | Standalone backend & frontend runtime |
| **Python** | `v3.10.0+` | Standalone AI service runtime |

---

## 2. Quick Installation (Docker Compose)

The easiest and recommended way to launch the entire DevPulse ecosystem is using the pre-configured `docker-compose.yml` file.

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-org/devpulse.git
cd devpulse
```

### Step 2: Configure Environment Files
1. Copy the backend environment template:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Open `backend/.env` and fill in your credential values (such as `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GROQ_API_KEY`).

### Step 3: Run Containers
Run the following command from the root directory:
```bash
docker-compose up --build -d
```

This will download, build, and boot all 4 vital components in the background:
- **`devpulse_postgres`**: Database service (Port `5432`)
- **`devpulse_redis`**: High-performance caching (Port `6379`)
- **`devpulse_ai`**: Python machine learning microservice (Port `8000`)
- **`devpulse_backend`**: Express API server orchestrator (Port `4000`)

---

## 3. Post-Installation Health Checks

You can verify if all elements initialized successfully by querying their health endpoints:

```bash
# Check Backend API Server
curl http://localhost:4000/health/live

# Check AI Service Status
curl http://localhost:8000/health/live
```

> [!TIP]
> If any service reports a failure or port is occupied, refer to our [Troubleshooting Guide](file:///Users/sssa15/DevPulse/docs/troubleshooting.md) for immediate remediation.
