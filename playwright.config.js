// playwright.config.js
import { defineConfig, devices } from "@playwright/test";

/**
 * DevPulse Playwright E2E Configuration
 *
 * By default runs against a locally-running frontend dev server.
 * Override via:  E2E_BASE_URL=https://staging.devpulse.app npx playwright test
 *
 * CI behaviour:
 *   - retries: 1 per test (handles flaky CI network / cold start)
 *   - Only Chromium to keep CI fast
 *   - Reporter: html + github (shows annotations in PR)
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.js",

  // Max time one test can run (includes retries)
  timeout: 30 * 1000,

  // Retry once in CI; no retries locally
  retries: process.env.CI ? 1 : 0,

  // Run tests in parallel in CI; sequential locally for easier debugging
  workers: process.env.CI ? 2 : 1,

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],

  use: {
    // Base URL — override with E2E_BASE_URL env var in CI
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",

    // Collect trace on first retry to diagnose failures
    trace: "on-first-retry",

    // Take screenshot on failure
    screenshot: "only-on-failure",

    // Headless always (even locally, override with PWDEBUG=1)
    headless: true,
  },

  projects: [
    {
      name:  "chromium",
      use:   { ...devices["Desktop Chrome"] },
    },
  ],

  // Start the frontend dev server automatically when running locally
  // In CI, the server must already be running (handled by the workflow)
  ...(process.env.CI
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          cwd:     "./frontend",
          url:     "http://localhost:5173",
          reuseExistingServer: true,
          timeout: 30 * 1000,
        },
      }),
});
