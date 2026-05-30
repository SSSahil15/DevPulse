# Local Development Deployments

For local testing of the multi-container configuration, DevPulse provides a robust **Docker Compose** infrastructure.

---

## 1. Local Compose Topology

The local `docker-compose.yml` configures 4 services communicating over a private bridge network (`devpulse_local_net`):

```text
               ┌──────────────────────┐
               │    Local Browser     │
               └──────────┬───────────┘
                          │ (Port 5174 / 4000)
                          ▼
               ┌──────────────────────┐
               │   devpulse_backend   │
               └──────┬────────┬──────┘
                      │        │
            ┌─────────┘        └─────────┐
            ▼                            ▼
┌──────────────────────┐      ┌──────────────────────┐
│  devpulse_postgres   │      │    devpulse_redis    │
└──────────────────────┘      └──────────────────────┘
            │                            │
            └─────────┐        ┌─────────┘
                      ▼        ▼
               ┌──────────────────────┐
               │     devpulse_ai      │
               └──────────────────────┘
```

---

## 2. Booting the Infrastructure

To launch the entire development environment:

```bash
# Build and launch all services in detached mode
docker-compose up --build -d
```

To view real-time log aggregates from all active containers:

```bash
docker-compose logs -f
```

To gracefully shut down and destroy container layouts:

```bash
docker-compose down -v
```

---

## 3. Persistent Volumes

DevPulse creates a dedicated Docker volume named `devpulse_postgres_data` to ensure PostgreSQL transactions are persisted between docker restarts:

- Mount Location: `/var/lib/postgresql/data`
- To completely wipe database states and trigger clean migrations on boot, destroy the volume during shutdown:
  ```bash
  docker-compose down -v
  ```
