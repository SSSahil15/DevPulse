from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """
    Environment variable configuration and validation for the AI service.
    """

    NODE_ENV: str = "development"
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "development"
    SENTRY_RELEASE: str = "devpulse-ai@dev"
    BACKEND_URL: str = "http://localhost:4000"
    OPENAI_API_KEY: str = ""
    OPENAI_API_BASE: Optional[str] = None
    MODEL_NAME: str = "gpt-4o-mini"
    EVAL_MODEL_NAME: str = "gpt-4o"
    DATABASE_URL: str = "postgresql://devpulse:devpulse@postgres:5432/devpulse"

    # Using pydantic_settings to read from .env if present
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
