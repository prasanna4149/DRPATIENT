"""Helper utilities related to the PII detection module."""
from __future__ import annotations

from typing import Iterable

from pii.pii import ModerationResult


def mask_pii_text(original_text: str, result: ModerationResult) -> str:
    """Mask detected PII patterns in the provided text."""

    if not result.all_violations:
        return original_text

    masked_text = original_text

    violations = sorted(result.all_violations, key=lambda item: len(item[1] or ""), reverse=True)

    import re

    for violation_type, pattern in violations:
        if not pattern:
            continue

        violation_type = violation_type or "generic"
        mask = _mask_for_violation(violation_type)
        masked_text = re.sub(re.escape(pattern), mask, masked_text, flags=re.IGNORECASE)

    return masked_text


def _mask_for_violation(violation_type: str) -> str:
    mapping = {
        "phone_number": "[PHONE_REDACTED]",
        "email_address": "[EMAIL_REDACTED]",
        "upi_id": "[UPI_REDACTED]",
        "url": "[LINK_REDACTED]",
        "meeting_link": "[LINK_REDACTED]",
        "calendar_link": "[LINK_REDACTED]",
        "social_media_handle": "[HANDLE_REDACTED]",
        "discord_tag": "[HANDLE_REDACTED]",
        "payment_handle": "[PAYMENT_REDACTED]",
    }
    return mapping.get(violation_type, "[PII_REDACTED]")


def calculate_detection_threshold(text: str, result: ModerationResult, *, threshold: float = 20.0) -> bool:
    """Return True if the % of PII characters in text meets the threshold."""

    if not result.all_violations or not text.strip():
        return False

    def _pattern_lengths() -> Iterable[int]:
        for _, pattern in result.all_violations:
            if pattern:
                yield len(pattern)

    total_pattern_length = sum(_pattern_lengths())
    text_length = len(text.strip())
    if text_length == 0:
        return False

    detection_percentage = (total_pattern_length / text_length) * 100
    return detection_percentage >= threshold
