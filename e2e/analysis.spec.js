import { test, expect } from "@playwright/test";

/**
 * DevPulse E2E — Analysis & Core User Flows
 * ==========================================
 * These tests run against a real (or staging) frontend instance.
 * Auth state is injected via localStorage to bypass the OAuth flow.
 *
 * Scenarios covered:
 *   1. Unauthenticated redirect → login page
 *   2. Login page renders GitHub OAuth button
 *   3. Dashboard loads when valid JWT is in localStorage
 *   4. Dashboard shows DevPulse branding
 *   5. Login error param shows error message on login page
 *   6. Navigation to unknown route redirects correctly
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Inject a mock JWT into localStorage so the app bootstraps as authenticated.
 * The payload mirrors the shape the frontend reads in App.jsx bootstrap().
 */
async function injectMockAuth(page) {
  // Build a structurally valid (but unsigned) JWT with the correct payload shape
  const header  = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    sub:          "123456",
    username:     "e2e-testuser",
    displayName:  "E2E Test User",
    avatarUrl:    "https://avatars.githubusercontent.com/u/123456",
    profileUrl:   "https://github.com/e2e-testuser",
    email:        "e2e@example.com",
    followers:    10,
    following:    5,
    publicRepos:  20,
    privateRepos: 2,
    // exp: far future
    exp:          Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    iss:          "devpulse",
  }));
  const mockToken = `${header}.${payload}.mock-signature`;

  await page.addInitScript((token) => {
    localStorage.setItem("devpulse_token", token);
  }, mockToken);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Unauthenticated flows", () => {
  test("redirects to /login when no token is present", async ({ page }) => {
    // Clear any stored token before navigating
    await page.addInitScript(() => localStorage.removeItem("devpulse_token"));
    await page.goto("/");
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("login page renders the GitHub OAuth sign-in button", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("devpulse_token"));
    await page.goto("/login");

    // Button text should include "GitHub" in some form
    const githubButton = page.getByRole("button", { name: /github/i })
      .or(page.getByRole("link", { name: /github/i }))
      .or(page.locator("[data-testid='github-signin']"));

    await expect(githubButton.first()).toBeVisible({ timeout: 8000 });
  });

  test("login page shows error message when ?error=github_denied is present", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("devpulse_token"));
    await page.goto("/login?error=github_denied");

    // Some error text should appear on the page
    const errorText = page.getByText(/denied|failed|error|try again/i);
    await expect(errorText.first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Authenticated flows", () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAuth(page);
  });

  test("dashboard loads and shows DevPulse branding", async ({ page }) => {
    await page.goto("/dashboard");
    // Should NOT redirect to login
    await expect(page).not.toHaveURL(/\/login/);
    // DevPulse branding should be visible
    const branding = page.getByText(/DevPulse/i).first();
    await expect(branding).toBeVisible({ timeout: 10000 });
  });

  test("navigating to / redirects authenticated user to /dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/.*\/dashboard/);
  });
});

test.describe("Navigation", () => {
  test("unknown route redirects to login when unauthenticated", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("devpulse_token"));
    await page.goto("/this-route-does-not-exist");
    await expect(page).toHaveURL(/.*\/login/);
  });
});
