# Staging Deployments

The **Staging Environment** acts as our secondary pre-production playground, strictly matching production limits to run final verification before deployment.

---

## 1. Automated Staging Pipeline

The staging pipeline executes automatically via **GitHub Actions** upon merging any pull request to the `develop` or `main` branches:

1. **Trigger**: Code push/merge.
2. **Quality Check**: Matrix unit tests and E2E Playwright tests must pass.
3. **Build**: Builds optimized staging Docker containers.
4. **Deploy**: Automatically deploys the backend container to a pre-production Render cluster and the frontend to a Vercel staging deployment.
5. **Validation**: Executes post-deployment smoke tests checking authentication redirect gates and `/health` API responses.

---

## 2. Environment Configurations

Staging environments utilize dedicated pre-production API keys to prevent pollution:

- **GitHub OAuth App**: `DevPulse-Staging` (Callback points strictly to staging API server)
- **PostgreSQL**: Hosted pre-prod database instances.
- **Redis Cache**: Standalone testing cluster.
- **Error Tracking**: Unique Sentry environment target (`staging`).

---

## 3. Smoke Testing Checklist

Following a staging deployment, verify the following critical pathways:

- [ ] Connect with GitHub redirects safely without auth failures.
- [ ] Trigger V8-vulnerable dependency simulation and verify score drops cleanly on Recharts widget.
- [ ] Verify that shared report exports generate valid `dp_rpt_...` links.
