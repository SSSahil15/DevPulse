# Production Deployment Guide

This guide outlines requirements and operations for deploying DevPulse to production-grade cloud environments.

---

## 1. Hosting Architecture

DevPulse is split geographically across top-tier cloud infrastructures to ensure zero downtime and optimal CDN load-times:

- **Frontend (React)**: Hosted globally on **Vercel** with integrated Edge Network caching.
- **Backend & AI Service**: Standard multi-instance containers deployed via **Render** (or AWS Elastic Container Service) connected to high-availability load balancers.
- **Database (PostgreSQL)**: Deployed via managed instance (e.g. AWS RDS or Supabase) utilizing SSD storage and automated failover replicas.
- **Cache (Redis)**: Deployed using managed Redis cluster (e.g. AWS ElastiCache) with TLS protection enabled.

---

## 2. Production Environment Checklist

Ensure the following variables are strictly populated inside your cloud control panel:

```text
# Node / Core
NODE_ENV=production
JWT_SECRET=super_secure_32_char_cryptographic_secret
TOKEN_ENCRYPTION_SECRET=super_secure_32_char_encryption_secret

# Database & Cache
DATABASE_URL=postgresql://<user>:<pass>@<prod_host>:5432/<dbname>?ssl=true
REDIS_URL=rediss://default:<pass>@<prod_host>:6379   # Note secure 'rediss://' scheme

# OAuth & LLM
GITHUB_CLIENT_ID=prod_client_id_from_github
GITHUB_CLIENT_SECRET=prod_client_secret_from_github
GROQ_API_KEY=prod_groq_api_key
```

---

## 3. Database Backups & Maintenance

To prevent catastrophic data loss:

1. **Automated Snapshots**: Enforce daily automated snapshots of the production PostgreSQL cluster with a 30-day retention window.
2. **Maintenance Mode**: Schedule heavy table migrations during low-traffic windows (e.g. Sundays 02:00 UTC) using transaction wrappers:
   ```sql
   BEGIN;
   -- Perform schema alterations here
   COMMIT;
   ```
3. **Failover DRI**: Test database recovery scripts monthly on staging to verify that restore times remain below the target RTO (Recovery Time Objective) of 15 minutes.
