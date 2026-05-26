import time
import os
from datetime import datetime
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST

# ── OpenTelemetry ─────────────────────────────────────────────────────────────
try:
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

    _OTEL_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://devpulse_otel_collector:4318")
    _provider = TracerProvider()
    _provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=f"{_OTEL_ENDPOINT}/v1/traces"))
    )
    trace.set_tracer_provider(_provider)
    _OTEL_ENABLED = True
except Exception:
    _OTEL_ENABLED = False

from models.config import settings
from models.api import AnalysisRequest, AnalysisResponse, IngestRequest, RAGQueryRequest
from pipelines.analysis import AnalysisPipeline
from pipelines.analysis import AnalysisPipeline
from inference.llm import AdvancedLLMPredictor
from utils.logger import log
from utils.sentry import init_sentry
from utils.metrics import (
    ai_analysis_requests_total,
    ai_analysis_duration_seconds,
    get_metrics_output,
)

# ─── Initialization ───────────────────────────────────────────────────────────

if settings.SENTRY_DSN:
    init_sentry()

startup_complete = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    global startup_complete
    startup_complete = True
    log.info(
        "AI service startup complete",
        extra={"env": settings.NODE_ENV, "sentry": "on" if settings.SENTRY_DSN else "off"},
    )
    yield
    log.info("AI service shutting down gracefully")

app = FastAPI(title="DevPulse AI Service", lifespan=lifespan)

# ── Instrument FastAPI with OTel (auto-creates spans for every route) ─────────
if _OTEL_ENABLED:
    FastAPIInstrumentor.instrument_app(app, excluded_urls="health.*")

# Global pipeline instances
analysis_pipeline = AnalysisPipeline(predictor=AdvancedLLMPredictor())

# ─── CORS & Middleware ────────────────────────────────────────────────────────
_CORS_ORIGINS = (
    [settings.BACKEND_URL]
    if settings.NODE_ENV == "production"
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "X-Request-ID",
        "X-Internal-Secret",
        "sentry-trace",
        "baggage",
    ],
)

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
        "checks": {"pipeline": "ok"},
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/model-info")
async def model_info():
    """Returns metadata about the predictor for transparency and debugging."""
    return pipeline.predictor.model_info()

# ─── Prometheus Metrics Endpoint ─────────────────────────────────────────────

@app.get("/metrics")
async def metrics():
    """Exposes Prometheus metrics in text format for scraping."""
    return Response(content=get_metrics_output(), media_type=CONTENT_TYPE_LATEST)

# ─── Core Endpoint ────────────────────────────────────────────────────────────

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest, http_request: Request):
    upstream_request_id = http_request.headers.get("x-request-id", "no-id")
    start_time = time.perf_counter()
    with sentry_sdk.new_scope() as scope:
        scope.set_tag("upstream_request_id", upstream_request_id)
        scope.set_context("repository", {
            "id":       request.repository.id,
            "fullName": request.repository.fullName,
            "language": request.repository.language,
        })

        try:
            result = analysis_pipeline.run(request)
            duration = time.perf_counter() - start_time
            ai_analysis_duration_seconds.observe(duration)
            ai_analysis_requests_total.labels(status="success").inc()
            return result
        except Exception as e:
            duration = time.perf_counter() - start_time
            ai_analysis_duration_seconds.observe(duration)
            ai_analysis_requests_total.labels(status="error").inc()
            sentry_sdk.capture_exception(e)
            raise HTTPException(status_code=500, detail=str(e))



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
