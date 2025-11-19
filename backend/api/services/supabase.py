"""Supabase REST helper for the FastAPI backend."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

import requests


@dataclass
class SupabaseResponse:
    data: Any
    error: Optional[Dict[str, Any]]
    status_code: int


class SupabaseClient:
    """Thin wrapper over Supabase REST endpoints."""

    def __init__(self, url: str, anon_key: str) -> None:
        self.base_url = url.rstrip("/")
        self.anon_key = anon_key

    def request(self, method: str, path: str, token: str, **kwargs) -> SupabaseResponse:
        url = f"{self.base_url}{path}"
        headers = kwargs.pop("headers", {})
        headers.update(
            {
                "apikey": self.anon_key,
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }
        )

        response = requests.request(method, url, headers=headers, timeout=15, **kwargs)
        try:
            data = response.json()
        except ValueError:
            data = None

        error = None if response.ok else {"status": response.status_code, "error": data}
        return SupabaseResponse(data=data, error=error, status_code=response.status_code)
