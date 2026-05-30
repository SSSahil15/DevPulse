import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from models.config import settings

_IS_PROD = settings.NODE_ENV == "production"

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


def init_sentry():
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN or None,
        integrations=[
            # Order matters: Starlette must come before FastAPI
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        traces_sample_rate=0.1 if _IS_PROD else 1.0,
        profiles_sample_rate=0.1 if _IS_PROD else 0.0,
        environment=settings.SENTRY_ENVIRONMENT,
        release=settings.SENTRY_RELEASE,
        before_send=_before_send,
        propagate_traces=True,
    )
