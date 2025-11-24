"""Application configuration helpers."""
from __future__ import annotations

from dataclasses import dataclass
import os
import pathlib


@dataclass(slots=True)
class Settings:
    """Simple settings object that reads from environment variables."""

    app_name: str = os.getenv("APP_NAME", "PII Detection API")
    version: str = os.getenv("APP_VERSION", "1.0.0")
    environment: str = os.getenv("ENVIRONMENT", "development")
    default_sensitivity: str = os.getenv("PII_DEFAULT_SENSITIVITY", "high")
    supabase_url: str | None = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    supabase_anon_key: str | None = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
    supabase_service_role_key: str | None = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    groq_api_key: str | None = os.getenv("GROQ_API_KEY")
    groq_model: str = os.getenv("GROQ_MODEL", "llama3-70b-8192")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    allow_origins: list[str] = None

    def __post_init__(self) -> None:
        origins = os.getenv("CORS_ALLOW_ORIGINS", "*")
        if origins.strip() == "*":
            self.allow_origins = ["*"]
        else:
            self.allow_origins = [origin.strip() for origin in origins.split(",") if origin.strip()]

        if self.default_sensitivity not in {"low", "medium", "high"}:
            self.default_sensitivity = "high"

        # Ensure Supabase credentials are read after .env is loaded
        self.supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or self.supabase_url
        self.supabase_anon_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY") or self.supabase_anon_key
        self.supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or self.supabase_service_role_key
        
        # Ensure Groq credentials are read after .env is loaded
        self.groq_api_key = os.getenv("GROQ_API_KEY") or self.groq_api_key
        self.groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    @property
    def supabase_configured(self) -> bool:
        url = self.supabase_url or os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
        key = self.supabase_anon_key or os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
        return bool(url and key)


try:
    def _load_env_from_file():
        base = pathlib.Path(__file__).resolve()
        parents = [base.parents[i] for i in range(min(5, len(base.parents)))]
        candidates = [*(p / ".env" for p in parents), pathlib.Path.cwd() / ".env"]
        for p in candidates:
            if p.exists():
                try:
                    content = p.read_text(encoding="utf-8")
                except Exception:
                    content = p.read_text(encoding="latin-1")
                for line in content.splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        os.environ.setdefault(k, v)
                break
    _load_env_from_file()
except Exception:
    pass

settings = Settings()
