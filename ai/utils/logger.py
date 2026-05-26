import json
import logging
import os
from datetime import datetime, timezone
from models.config import settings

# ── Optional OTel trace context injection ─────────────────────────────────────
try:
    from opentelemetry import trace as otel_trace

    def _get_trace_context() -> dict:
        span = otel_trace.get_current_span()
        ctx  = span.get_span_context() if span else None
        if ctx and ctx.is_valid:
            return {
                "trace_id": format(ctx.trace_id, "032x"),
                "span_id":  format(ctx.span_id,  "016x"),
            }
        return {}
except ImportError:
    def _get_trace_context() -> dict:
        return {}

_SENSITIVE_KEYS = frozenset([
    "authorization", "x-api-key", "x-internal-secret",
    "cookie", "token", "password", "secret",
])

class _JsonFormatter(logging.Formatter):
    """Emit one JSON object per log line — matches backend winston format.
    Automatically injects OTel trace_id / span_id when a span is active.
    """

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

        # Inject OTel trace context (no-op if no active span)
        entry.update(_get_trace_context())

        return json.dumps(entry)

def _build_logger() -> logging.Logger:
    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())
    log = logging.getLogger("devpulse_ai")
    log.setLevel(logging.DEBUG if settings.NODE_ENV != "production" else logging.INFO)
    log.propagate = False
    if not log.handlers:
        log.addHandler(handler)
    return log

log = _build_logger()
