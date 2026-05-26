# Testing Guide

Testing is the bedrock of quality on the DevPulse platform. We maintain a high-confidence test suite with **Jest**, **Vitest**, and **Playwright**.

---

## 1. Test Architecture

We enforce complete separation of testing technologies across the workspace:

| Tier | Tool | Folder | Command |
|------|------|--------|---------|
| **Backend Core** | **Jest + Supertest** | `backend/src/__tests__` | `npm run test` |
| **Frontend UI** | **Vitest + RTL** | `frontend/src/__tests__` | `npm run test` |
| **End-to-End** | **Playwright** | `e2e/` | `npx playwright test` |

---

## 2. Mocking Database & Redis

To run unit tests quickly without spinning up actual cluster containers:

### Jest Database Mocking (`backend/src/db/database.js`)
- The startup migration block explicitly checks `process.env.NODE_ENV !== "test"`.
- If running in tests, DevPulse skips physical PostgreSQL migrations and uses Jest mocks around database operations where needed, avoiding `ECONNREFUSED` exceptions.

### Redis Mocking (`backend/src/services/redis.service.js`)
- The Redis connection client skips initialization during unit tests (`process.env.NODE_ENV !== "test"`).
- Redis wrappers (`get`, `set`, `del`) gracefully degrade to returning `null` during testing, ensuring tests are independent of Redis server uptime.

---

## 3. Coverage Gates

We require focused coverage for new work and enforce the current Jest/Vitest coverage gates in CI.

- **Check Coverage Locally**:
  ```bash
  # Backend
  cd backend && npm run test:coverage

  # Frontend
  cd frontend && npm run test:coverage
  ```
- Coverage results (HTML metrics) are written to local `coverage/` folders. Open `coverage/lcov-report/index.html` in your browser to inspect line-by-line coverage details.

---

> [!WARNING]
> Do not use `page.waitForTimeout()` in Playwright E2E tests! This causes pipeline flakiness. Rely strictly on Playwright's auto-waiting locators (`toBeVisible()`, `waitForLoadState()`).
