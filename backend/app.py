"""FastAPI application entrypoint for the PII Detection System."""

from __future__ import annotations

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
from api.routers import assistant_router, health_router, pii_router

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("pii_api")


def _allowed_origins() -> list[str]:
    if not settings.allow_origins:
        return ["*"]
    return settings.allow_origins


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        description="PII Detection and Health Assistant API",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(pii_router)
    app.include_router(assistant_router)

    @app.get("/", tags=["Health"], summary="Root health check")
    async def root() -> dict:
        return {
            "status": "healthy",
            "service": settings.app_name,
            "version": settings.version,
            "environment": settings.environment,
            "supabase_configured": settings.supabase_configured,
        }

    return app


app = create_app()
