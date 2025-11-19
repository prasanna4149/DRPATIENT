"""FastAPI routers for the backend service."""

from .assistant import router as assistant_router
from .health import router as health_router
from .pii import router as pii_router

__all__ = [
    "assistant_router",
    "health_router",
    "pii_router",
]
