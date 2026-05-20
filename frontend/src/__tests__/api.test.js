/**
 * api.test.js
 * ===========
 * Tests for frontend/src/api.js — covers apiRequest(), withRetry(),
 * and pollScanJob(). MSW intercepts all fetch() calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { apiRequest, pollScanJob, ApiError } from "../api";

const API_BASE = "http://localhost:4000";

// ─── apiRequest — happy path ──────────────────────────────────────────────────

describe("apiRequest — success", () => {
  it("returns parsed JSON on a 200 GET", async () => {
    server.use(
      http.get(`${API_BASE}/api/pipeline/health`, () =>
        HttpResponse.json({ totalRuns: 5 })
      )
    );
    const data = await apiRequest("/api/pipeline/health");
    expect(data.totalRuns).toBe(5);
  });

  it("sends Authorization header when token is provided", async () => {
    let capturedAuth;
    server.use(
      http.get(`${API_BASE}/api/pipeline/health`, ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json({ ok: true });
      })
    );
    await apiRequest("/api/pipeline/health", { accessToken: "test-token" });
    expect(capturedAuth).toBe("Bearer test-token");
  });

  it("sends X-Request-ID header on every request", async () => {
    let capturedId;
    server.use(
      http.get(`${API_BASE}/api/pipeline/health`, ({ request }) => {
        capturedId = request.headers.get("X-Request-ID");
        return HttpResponse.json({ ok: true });
      })
    );
    await apiRequest("/api/pipeline/health");
    expect(capturedId).toBeTruthy();
    expect(capturedId).toMatch(/^clt-[a-f0-9]{8}$/);
  });

  it("generates different X-Request-ID for each call", async () => {
    const ids = new Set();
    server.use(
      http.get(`${API_BASE}/api/pipeline/health`, ({ request }) => {
        ids.add(request.headers.get("X-Request-ID"));
        return HttpResponse.json({ ok: true });
      })
    );
    for (let i = 0; i < 3; i++) {
      await apiRequest("/api/pipeline/health");
    }
    expect(ids.size).toBe(3);
  });
});

// ─── apiRequest — error handling ──────────────────────────────────────────────

describe("apiRequest — errors", () => {
  it("throws ApiError with correct status on 4xx", async () => {
    server.use(
      http.get(`${API_BASE}/api/pipeline/health`, () =>
        HttpResponse.json({ message: "Unauthorized" }, { status: 401 })
      )
    );
    await expect(apiRequest("/api/pipeline/health")).rejects.toMatchObject({
      status: 401,
      message: "Unauthorized",
    });
  });

  it("throws ApiError instance (not plain Error)", async () => {
    server.use(
      http.get(`${API_BASE}/api/pipeline/health`, () =>
        HttpResponse.json({ message: "Not found" }, { status: 404 })
      )
    );
    try {
      await apiRequest("/api/pipeline/health");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it("includes status code on thrown ApiError", async () => {
    server.use(
      http.get(`${API_BASE}/api/pipeline/health`, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 })
      )
    );
    let caught;
    try {
      await apiRequest("/api/pipeline/health", { retry: false });
    } catch (err) {
      caught = err;
    }
    expect(caught?.status).toBe(500);
  });
});

// ─── apiRequest — retry logic ─────────────────────────────────────────────────

describe("apiRequest — retry logic", () => {
  it("retries GET requests on 5xx and eventually succeeds", async () => {
    let callCount = 0;
    server.use(
      http.get(`${API_BASE}/api/pipeline/health`, () => {
        callCount++;
        if (callCount < 3) {
          return HttpResponse.json({ message: "Service unavailable" }, { status: 503 });
        }
        return HttpResponse.json({ totalRuns: 5 });
      })
    );
    const data = await apiRequest("/api/pipeline/health");
    expect(data.totalRuns).toBe(5);
    expect(callCount).toBe(3);
  }, 15000);

  it("does NOT retry 4xx errors (client errors)", async () => {
    let callCount = 0;
    server.use(
      http.get(`${API_BASE}/api/pipeline/health`, () => {
        callCount++;
        return HttpResponse.json({ message: "Forbidden" }, { status: 403 });
      })
    );
    await expect(apiRequest("/api/pipeline/health")).rejects.toMatchObject({ status: 403 });
    expect(callCount).toBe(1); // No retry
  }, 10000);

  it("does NOT retry POST requests (non-idempotent)", async () => {
    let callCount = 0;
    server.use(
      http.post(`${API_BASE}/api/pipeline/simulate`, () => {
        callCount++;
        return HttpResponse.json({ message: "Error" }, { status: 500 });
      })
    );
    await expect(
      apiRequest("/api/pipeline/simulate", { method: "POST", body: JSON.stringify({ repositoryFullName: "a/b" }) })
    ).rejects.toMatchObject({ status: 500 });
    expect(callCount).toBe(1); // No retry
  }, 10000);

  it("throws after exhausting all retry attempts", async () => {
    server.use(
      http.get(`${API_BASE}/api/pipeline/health`, () =>
        HttpResponse.json({ message: "Gateway timeout" }, { status: 504 })
      )
    );
    await expect(apiRequest("/api/pipeline/health")).rejects.toMatchObject({ status: 504 });
  }, 15000);
});

// ─── pollScanJob ──────────────────────────────────────────────────────────────

describe("pollScanJob", () => {
  it("resolves when job status is 'done'", async () => {
    server.use(
      http.get(`${API_BASE}/api/pipeline/simulate/status/job_abc`, () =>
        HttpResponse.json({ jobId: "job_abc", status: "done", repository: "owner/repo" })
      )
    );
    const result = await pollScanJob("job_abc", "test-token", { intervalMs: 50, maxAttempts: 5 });
    expect(result.status).toBe("done");
  }, 10000);

  it("resolves when job status is 'failed'", async () => {
    server.use(
      http.get(`${API_BASE}/api/pipeline/simulate/status/job_fail`, () =>
        HttpResponse.json({ jobId: "job_fail", status: "failed", error: "Trivy not found" })
      )
    );
    const result = await pollScanJob("job_fail", "test-token", { intervalMs: 50, maxAttempts: 5 });
    expect(result.status).toBe("failed");
  }, 10000);

  it("throws ApiError with 504 after maxAttempts", async () => {
    server.use(
      http.get(`${API_BASE}/api/pipeline/simulate/status/job_timeout`, () =>
        HttpResponse.json({ jobId: "job_timeout", status: "processing" })
      )
    );
    await expect(
      pollScanJob("job_timeout", "test-token", { intervalMs: 10, maxAttempts: 3 })
    ).rejects.toMatchObject({ status: 504 });
  }, 10000);
});
