# ─── DevPulse AI Microservice ────────────────────────────
# Multi-stage build for the FastAPI/Python prediction service.
# ─────────────────────────────────────────────────────────

FROM python:3.11-slim AS builder

WORKDIR /app

# Install dependencies in a separate layer for caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ─── Production stage ───────────────────────────────────
FROM python:3.11-slim AS production

# Security: run as non-root
RUN addgroup --system devpulse && adduser --system --ingroup devpulse devpulse

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application source
COPY --chown=devpulse:devpulse . .

USER devpulse

ENV PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
