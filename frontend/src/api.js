const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const TOKEN_KEY = "devpulse_token";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function decodeJWTPayload(token) {
  try {
    let base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
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

export async function apiRequest(path, { accessToken, method = "GET", body } = {}) {
  const token = accessToken || getStoredToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: res.statusText }));
    const error = new ApiError(data.message || "Request failed", res.status);
    error.data = data;
    error.url = `${API_BASE}${path}`;
    throw error;
  }

  return res.json();
}

/**
 * Poll a scan job until it's done or failed.
 * Resolves with the final job object.
 * Rejects after maxAttempts.
 */
export async function pollScanJob(jobId, accessToken, { intervalMs = 2000, maxAttempts = 60 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const job = await apiRequest(`/api/pipeline/simulate/status/${jobId}`, { accessToken });
    if (job.status === "done" || job.status === "failed") return job;
  }
  throw new ApiError("Scan job timed out after 2 minutes.", 504);
}
