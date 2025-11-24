"""Common dependency utilities for the FastAPI backend."""
from __future__ import annotations

from functools import lru_cache
from typing import Optional
import os

from fastapi import Header, HTTPException, status

from .config import settings
from .services.supabase import SupabaseClient
from pii.pii import ContactModerationSystem


@lru_cache
def _build_default_detector() -> ContactModerationSystem:
    return ContactModerationSystem(sensitivity=settings.default_sensitivity)


def get_default_detector() -> ContactModerationSystem:
    """Return a cached ContactModerationSystem using default sensitivity."""

    return _build_default_detector()


def get_bearer_token(authorization: Optional[str] = Header(default=None)) -> str:
    """Extract Bearer token from the Authorization header."""

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "missing_token", "message": "Authorization Bearer token required"},
        )

    return authorization.split(" ", 1)[1].strip()


@lru_cache
def _build_supabase_client() -> Optional[SupabaseClient]:
    url = settings.supabase_url or os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = settings.supabase_anon_key or os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
    if not (url and key):
        return None
    return SupabaseClient(url, key)


def get_supabase_client() -> SupabaseClient:
    client = _build_supabase_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "supabase_unconfigured",
                "message": "Supabase credentials not found in environment (.env). Please set SUPABASE_URL/SUPABASE_ANON_KEY or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.",
            },
        )
    return client


@lru_cache
def _build_service_role_client() -> Optional[SupabaseClient]:
    url = settings.supabase_url
    key = settings.supabase_service_role_key
    if not (url and key):
        return None
    return SupabaseClient(url, key)


def get_service_role_client() -> SupabaseClient:
    """Return a Supabase client with SERVICE ROLE privileges (bypasses RLS)."""
    client = _build_service_role_client()
    if client is None:
        # Fallback to anon client if service role not configured, but warn
        print("[WARNING] Service role key not configured. Falling back to anon client (RLS may block access).")
        return get_supabase_client()
    return client
