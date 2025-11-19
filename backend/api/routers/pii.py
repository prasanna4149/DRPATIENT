"""PII detection endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..config import settings
from ..dependencies import get_default_detector
from ..services.pii_service import calculate_detection_threshold, mask_pii_text
from pii.pii import ContactModerationSystem, ModerationResult

router = APIRouter(prefix="/api/pii", tags=["PII Detection"])


class DetectPIIRequest(BaseModel):
    text: str = Field(..., description="Text to analyze for PII")
    user_id: Optional[str] = Field(default=None, description="Optional user identifier for rate limiting")
    sensitivity: Literal["low", "medium", "high"] = Field(
        default=settings.default_sensitivity,
        description="Detection sensitivity level",
    )


class Violation(BaseModel):
    type: str
    pattern: Optional[str]


class DetectPIIResponse(BaseModel):
    is_blocked: bool
    confidence: str
    violation_type: Optional[str]
    detected_pattern: Optional[str]
    original_text: str
    normalized_text: str
    severity_score: int
    all_violations: list[Violation]
    masked_text: str
    detection_threshold_met: bool
    processing_time_ms: float


@router.post("/detect", response_model=DetectPIIResponse)
async def detect_pii(payload: DetectPIIRequest) -> DetectPIIResponse:
    """Detect PII in the provided payload text."""

    if payload.sensitivity not in {"low", "medium", "high"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_sensitivity", "message": "Sensitivity must be low, medium, or high"},
        )

    start_time = datetime.utcnow()
    detector = ContactModerationSystem(sensitivity=payload.sensitivity)
    result = detector.moderate_message(payload.text, user_id=payload.user_id)

    masked_text = mask_pii_text(payload.text, result)
    detection_threshold_met = calculate_detection_threshold(payload.text, result)

    processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000

    return DetectPIIResponse(
        is_blocked=result.is_blocked,
        confidence=result.confidence,
        violation_type=result.violation_type,
        detected_pattern=result.detected_pattern,
        original_text=result.original_text,
        normalized_text=result.normalized_text,
        severity_score=result.severity_score,
        all_violations=[Violation(type=v_type, pattern=pattern) for v_type, pattern in result.all_violations or []],
        masked_text=masked_text,
        detection_threshold_met=detection_threshold_met,
        processing_time_ms=round(processing_time, 2),
    )


@router.get("/stats")
async def get_stats(detector: ContactModerationSystem = Depends(get_default_detector)) -> dict:
    """Return meta information about the PII detection system."""

    return {
        "system_info": {
            "sensitivity": detector.sensitivity,
            "patterns_loaded": len(vars(detector.detector)),
            "version": settings.version,
        },
        "rate_limiting": {
            "window_minutes": detector.rate_limiter.window_minutes,
            "max_violations": detector.rate_limiter.max_violations,
        },
    }


@router.get("/user-violations/{user_id}")
async def get_user_violations(user_id: str, detector: ContactModerationSystem = Depends(get_default_detector)) -> dict:
    """Return rate-limiting status for a given user."""

    violation_count = detector.rate_limiter.get_violation_count(user_id)
    is_rate_limited = detector.rate_limiter.is_rate_limited(user_id)

    return {
        "user_id": user_id,
        "violation_count": violation_count,
        "is_rate_limited": is_rate_limited,
        "window_minutes": detector.rate_limiter.window_minutes,
    }
