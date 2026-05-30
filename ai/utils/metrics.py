"""
metrics.py — Prometheus Metrics for DevPulse AI Service

Centralised prometheus-client registry.
Exposed at GET /metrics (Prometheus text format).
"""

from prometheus_client import (
    CollectorRegistry,
    Counter,
    Histogram,
    generate_latest,
)

# ─── Registry ─────────────────────────────────────────────────────────────────
# Use the default global registry (works fine for a single-process uvicorn service)
registry = CollectorRegistry(auto_describe=True)

# ─── AI Analysis Metrics ──────────────────────────────────────────────────────

ai_analysis_requests_total = Counter(
    "ai_analysis_requests_total",
    "Total number of AI analysis requests",
    ["status"],  # status: success | error | fallback
    registry=registry,
)

ai_analysis_duration_seconds = Histogram(
    "ai_analysis_duration_seconds",
    "Duration of AI analysis pipeline in seconds",
    buckets=[0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 30, 60],
    registry=registry,
)

ai_llm_calls_total = Counter(
    "ai_llm_calls_total",
    "Total LLM API calls made by the AI service",
    ["model", "status"],  # status: success | error | ratelimited
    registry=registry,
)

ai_llm_duration_seconds = Histogram(
    "ai_llm_duration_seconds",
    "Duration of individual LLM API calls in seconds",
    ["model"],
    buckets=[0.5, 1, 2, 5, 10, 20, 30],
    registry=registry,
)

# ─── HTTP Metrics (supplementing OTel) ────────────────────────────────────────

http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests handled by AI service",
    ["method", "route", "status_code"],
    registry=registry,
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "route", "status_code"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registry=registry,
)


def get_metrics_output() -> bytes:
    """Return Prometheus text format bytes for /metrics endpoint."""
    return generate_latest(registry)
