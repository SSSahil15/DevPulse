import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import List, Optional
from contextlib import asynccontextmanager

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.predictor import FailurePredictor

# ─── Structured JSON Logger ──────────────────────────────────────────────────────────────────────────

_SENSITIVE_KEYS = frozenset([
    "authorization", "x-api-key", "x-internal-secret",
    "cookie", "token", "password", "secret",
])


class _JsonFormatter(logging.Formatter):
    """Emit one JSON object per log line — matches backend winston format."""

    def format(self, record: logging.LogRecord) -> str:
        entry: dict = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level":     record.levelname,
            "service":   "devpulse-ai",
            "logger":    record.name,
            "message":   record.getMessage(),
        }
        # Attach any extra fields passed via the `extra` kwarg
        for key, val in record.__dict__.items():
            if key not in (
                "args", "asctime", "created", "exc_info", "exc_text",
                "filename", "funcName", "id", "levelname", "levelno",
                "lineno", "message", "module", "msecs", "msg", "name",
                "pathname", "process", "processName", "relativeCreated",
                "stack_info", "thread", "threadName",
            ) and not key.startswith("_"):
                # Mask sensitive fields
                entry[key] = "[REDACTED]" if key.lower() in _SENSITIVE_KEYS else val
        if record.exc_info:
            entry["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(entry)


def _build_logger() -> logging.Logger:
    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())
    log = logging.getLogger("devpulse_ai")
    log.setLevel(logging.DEBUG if os.getenv("NODE_ENV") != "production" else logging.INFO)
    log.propagate = False
    if not log.handlers:
        log.addHandler(handler)
    return log


log = _build_logger()

# ─── Sentry ───────────────────────────────────────────────────────────────────
# Initialise BEFORE the FastAPI app is created so the integrations can
# instrument the ASGI middleware chain from the start.

_SENTRY_DSN = os.getenv("SENTRY_DSN", "")
_ENV        = os.getenv("SENTRY_ENVIRONMENT", os.getenv("ENV", "development"))
_RELEASE    = os.getenv("SENTRY_RELEASE", "devpulse-ai@dev")
_IS_PROD    = _ENV == "production"

# Sensitive request fields that must never reach Sentry
_REDACT_KEYS = {"authorization", "x-api-key", "x-internal-secret", "cookie"}

def _before_send(event, hint):
    """Strip auth headers and any PII before the event is sent to Sentry."""
    req = event.get("request", {})

    # Remove sensitive headers
    headers = req.get("headers", {})
    for key in list(headers.keys()):
        if key.lower() in _REDACT_KEYS:
            headers[key] = "[REDACTED]"

    return event

sentry_sdk.init(
    dsn=_SENTRY_DSN or None,          # None disables Sentry gracefully (no dummy DSN needed)
    integrations=[
        # Order matters: Starlette must come before FastAPI
        StarletteIntegration(transaction_style="endpoint"),
        FastApiIntegration(transaction_style="endpoint"),
    ],
    traces_sample_rate=0.1 if _IS_PROD else 1.0,
    profiles_sample_rate=0.1 if _IS_PROD else 0.0,
    environment=_ENV,
    release=_RELEASE,
    before_send=_before_send,
    # Forward incoming sentry-trace headers from the backend so
    # AI requests appear as child spans on the backend transaction.
    propagate_traces=True,
)

# ─── App ──────────────────────────────────────────────────────────────────────

startup_complete = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    global startup_complete
    startup_complete = True
    log.info(
        "AI service startup complete",
        extra={"env": _ENV, "sentry": "on" if _SENTRY_DSN else "off"},
    )
    yield
    log.info("AI service shutting down gracefully")

app = FastAPI(title="DevPulse AI Service", lifespan=lifespan)
predictor = FailurePredictor()

# ─── CORS ──────────────────────────────────────────────────────────────────────────
#
# The AI service is an INTERNAL service — it should only be called by the
# backend. In production we lock CORS to the backend URL only, completely
# preventing any browser (or external script) from calling AI endpoints directly.
#
# In development we allow all origins so curl / Swagger UI / frontend dev
# servers can reach the AI without extra config.
#
_BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000")
_CORS_ORIGINS = (
    [_BACKEND_URL]
    if _IS_PROD
    else ["*"]   # permissive in dev / test
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=False,    # AI service doesn’t use cookies
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "X-Request-ID",         # forwarded from backend for distributed tracing
        "X-Internal-Secret",    # service-to-service auth header
        "sentry-trace",         # Sentry distributed tracing
        "baggage",              # Sentry distributed tracing
    ],
)

# ─── HTTP Access Log Middleware ────────────────────────────────────────────────────────────
# Logs every request as a JSON line matching the backend's http_access format.
@app.middleware("http")
async def http_access_log(request: Request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        log.error(
            "http",
            extra={
                "type":        "http_access",
                "method":      request.method,
                "url":         str(request.url.path),
                "status":      500,
                "duration_ms": round((time.perf_counter() - start) * 1000),
                "requestId":   request.headers.get("x-request-id", ""),
                "error":       str(exc),
            },
        )
        raise
    duration_ms = round((time.perf_counter() - start) * 1000)
    status = response.status_code
    level = "error" if status >= 500 else "warning" if status >= 400 else "info"
    getattr(log, level)(
        "http",
        extra={
            "type":        "http_access",
            "method":      request.method,
            "url":         str(request.url.path),
            "status":      status,
            "duration_ms": duration_ms,
            "requestId":   request.headers.get("x-request-id", ""),
            "userAgent":   request.headers.get("user-agent", ""),
        },
    )
    return response

# ─── Models ───────────────────────────────────────────────────────────────────

class RepositoryMetadata(BaseModel):
    id: int
    name: str
    fullName: str
    language: Optional[str] = None
    openIssuesCount: int
    stargazersCount: int
    updatedAt: str
    size: int

class AnalysisRequest(BaseModel):
    repository: RepositoryMetadata
    securityScan: Optional[dict] = None

class SecuritySummary(BaseModel):
    critical: int
    high: int
    medium: int
    low: int
    unknown: int

class SecurityScan(BaseModel):
    status: str
    severityScore: float
    summary: SecuritySummary
    vulnerabilities: List[dict]

class PredictionResult(BaseModel):
    probability: float
    label: str
    rationale: str

class AnalysisResponse(BaseModel):
    riskScore: int
    decision: str
    failurePrediction: PredictionResult
    securityScan: SecurityScan
    suggestions: List[str]
    generatedAt: str
    source: str

# ─── Health Endpoints ─────────────────────────────────────────────────────────

@app.get("/health/startup")
async def health_startup():
    if startup_complete:
        return {"status": "started"}
    raise HTTPException(status_code=503, detail="starting")

@app.get("/health")
async def health():
    return {
        "service": "devpulse-ai",
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health/live")
async def health_live():
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}

@app.get("/health/ready")
async def health_ready():
    return {
        "status": "ready",
        "checks": {"model": "ok"},
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/model-info")
async def model_info():
    """Returns metadata about the predictor for transparency and debugging."""
    return predictor.model_info()

# ─── Core Endpoint ────────────────────────────────────────────────────────────

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest, http_request: Request):
    # Attach the upstream request ID to the Sentry scope so AI errors can
    # be correlated with backend log entries.
    upstream_request_id = http_request.headers.get("x-request-id", "no-id")
    with sentry_sdk.new_scope() as scope:
        scope.set_tag("upstream_request_id", upstream_request_id)
        scope.set_context("repository", {
            "id":       request.repository.id,
            "fullName": request.repository.fullName,
            "language": request.repository.language,
        })

        try:
            result = predictor.predict(request.repository, request.securityScan)
            return {
                **result,
                "generatedAt": datetime.utcnow().isoformat(),
                "source": "devpulse-ai-v1"
            }
        except Exception as e:
            # Explicitly capture so Sentry records the full traceback,
            # not just the HTTPException wrapper that would hide it.
            sentry_sdk.capture_exception(e)
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
