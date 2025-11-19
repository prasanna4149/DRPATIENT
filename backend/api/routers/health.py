"""Health and metadata endpoints."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter

from ..config import settings

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health check")
async def health_check() -> dict:
    """Return service health metadata."""

    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
        "supabase_configured": settings.supabase_configured,
        "timestamp": datetime.utcnow().isoformat(),
    }
