import * as Sentry from "@sentry/react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "devpulse_token";

// ─── Token Helpers ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name   = "ApiError";
    this.status = status;
  }
}

export function getStoredToken()    { return localStorage.getItem(TOKEN_KEY); }
export function storeToken(token)   { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken()        { localStorage.removeItem(TOKEN_KEY); }

export function decodeJWTPayload(token) {
  try {
    let base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = decodeJWTPayload(token);
  if (!payload?.exp) return true;
  return Date.now() / 1000 > payload.exp;
}

// ─── Request ID ───────────────────────────────────────────────────────────────
// Generate a short client-side request ID so frontend API calls can be
// correlated with backend log entries via the X-Request-ID header.
function generateRequestId() {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return "clt-" + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Retry with Exponential Back-off ─────────────────────────────────────────
/**
 * Retries an async function with exponential back-off.
 *
 * Only retries on transient failures:
 *   - Network errors (fetch throws)
 *   - 5xx server errors (Render cold start, temporary outage)
 *
 * Does NOT retry:
 *   - 4xx client errors (bad request, unauthorized) — user must fix input
 *   - Non-idempotent methods (POST, DELETE, PATCH) — callers opt-in explicitly
 *
 * @param {() => Promise<T>} fn           - The async operation to retry
 * @param {object}           opts
 * @param {number}           opts.maxAttempts  - Max total attempts (default: 3)
 * @param {number}           opts.baseDelayMs  - First retry delay in ms (default: 600)
 * @param {string}           opts.label        - Label for Sentry breadcrumbs
 * @returns {Promise<T>}
 */
async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 600, label = "request" } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Do not retry client errors (4xx) — they won't succeed on retry
      const isClientError = err instanceof ApiError && err.status >= 400 && err.status < 500;
      if (isClientError) throw err;

      // Do not retry if we've exhausted attempts
      if (attempt === maxAttempts) break;

      const delayMs = baseDelayMs * 2 ** (attempt - 1); // 600ms, 1200ms, ...
      Sentry.addBreadcrumb({
        category: "api",
        message:  `[Retry] ${label} attempt ${attempt} failed — retrying in ${delayMs}ms`,
        level:    "warning",
        data:     { attempt, maxAttempts, delayMs, error: err.message },
      });

      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}

// ─── Core API request ─────────────────────────────────────────────────────────
/**
 * Make an authenticated API request.
 *
 * Automatically:
 *   - Attaches the Bearer token from localStorage (or explicit accessToken)
 *   - Adds X-Request-ID header for backend log correlation
 *   - Retries GET requests up to 3× on transient 5xx / network errors
 *   - Throws ApiError with status + data for non-2xx responses
 *
 * @param {string} path                  - API path (e.g. '/api/pipeline/results')
 * @param {object} opts
 * @param {string} [opts.accessToken]    - Override stored token
 * @param {string} [opts.method='GET']   - HTTP method
 * @param {string} [opts.body]           - Serialised JSON body
 * @param {boolean} [opts.retry=true]    - Set false to skip retry (for non-idempotent calls)
 * @returns {Promise<unknown>}           - Parsed JSON response
 */
export async function apiRequest(path, { accessToken, method = "GET", body, retry = true } = {}) {
  const token     = accessToken || getStoredToken();
  const requestId = generateRequestId();

  const headers = {
    "Content-Type":  "application/json",
    "X-Request-ID":  requestId,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const doFetch = async () => {
    const res = await fetch(`${API_BASE}${path}`, { method, headers, body });

    if (!res.ok) {
      const data  = await res.json().catch(() => ({ message: res.statusText }));
      const error = new ApiError(data.message || "Request failed", res.status);
      error.data      = data;
      error.url       = `${API_BASE}${path}`;
      error.requestId = res.headers.get("X-Request-ID") || requestId;
      throw error;
    }

    return res.json();
  };

  // Only auto-retry safe, idempotent methods
  const isIdempotent = method === "GET" || method === "HEAD" || method === "OPTIONS";
  if (retry && isIdempotent) {
    return withRetry(doFetch, { label: `${method} ${path}` });
  }

  return doFetch();
}

// ─── Scan Job Poller ──────────────────────────────────────────────────────────
/**
 * Poll a scan job until it's done or failed.
 * Resolves with the final job object.
 * Rejects after maxAttempts (default: 60 × 2s = 2 minutes).
 */
export async function pollScanJob(jobId, accessToken, { intervalMs = 2000, maxAttempts = 60 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, intervalMs));
    // Polling is idempotent GET — retry is enabled by default
    const job = await apiRequest(`/api/pipeline/simulate/status/${jobId}`, { accessToken });
    if (job.status === "done" || job.status === "failed") return job;
  }
  throw new ApiError("Scan job timed out after 2 minutes.", 504);
}
