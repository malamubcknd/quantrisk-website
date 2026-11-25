from __future__ import annotations
"""
Claude (Anthropic Messages API) client.

Configuration — put these in the BACKEND .env (never in code, never in the frontend):

    ANTHROPIC_API_KEY=sk-ant-...          (required; create at console.anthropic.com)
    ANTHROPIC_MODEL=claude-sonnet-5-5     (optional; default below. Use claude-haiku-5-5 for lower cost)

Note: a claude.ai chat subscription does NOT include API access — the API is billed
separately in the Anthropic Console.

complete() returns the model's text, or None when the call could not be completed.
There is deliberately NO generic fallback: callers store nothing and retry later.
"""

import logging
import os
import time
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

API_URL = "https://api.anthropic.com/v1/messages"
API_VERSION = "2023-06-01"
DEFAULT_MODEL = "claude-sonnet-5-5"

# Circuit breaker so a bad key / empty balance doesn't make every article wait on failing calls
_disabled_until: float = 0.0
_warned_missing_key = False


def api_key() -> str:
    return os.environ.get("ANTHROPIC_API_KEY", "").strip()


def model_name() -> str:
    return os.environ.get("ANTHROPIC_MODEL", "").strip() or DEFAULT_MODEL


def is_configured() -> bool:
    return bool(api_key())


def is_available() -> bool:
    """True when a key is set and the circuit breaker is not open."""
    global _warned_missing_key
    if not is_configured():
        if not _warned_missing_key:
            logger.error(
                "ANTHROPIC_API_KEY is not set — AI summaries and implications cannot be generated. "
                "Add it to the backend .env and restart."
            )
            _warned_missing_key = True
        return False
    return time.time() >= _disabled_until


def _trip(seconds: int, reason: str) -> None:
    global _disabled_until
    _disabled_until = time.time() + seconds
    logger.error("%s — Claude calls paused for %d minutes.", reason, seconds // 60)


def complete(
    system: str,
    user: str,
    *,
    max_tokens: int = 1400,
    temperature: float = 0.2,
    timeout: int = 90,
) -> Optional[str]:
    """One Claude call. Retries transient failures (429 / 5xx / 529 / timeouts). Returns text or None."""
    if not is_available():
        return None

    import requests

    payload = {
        "model": model_name(),
        "max_tokens": max_tokens,
        "temperature": temperature,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    headers = {
        "x-api-key": api_key(),
        "anthropic-version": API_VERSION,
        "content-type": "application/json",
    }

    for attempt in range(1, 4):
        try:
            resp = requests.post(API_URL, headers=headers, json=payload, timeout=timeout)
        except Exception as exc:  # noqa: BLE001 - network errors / timeouts
            logger.warning("Claude request failed (attempt %d/3): %s", attempt, exc)
            time.sleep(2 * attempt)
            continue

        status = resp.status_code

        if status == 200:
            try:
                blocks = resp.json().get("content", [])
                text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text").strip()
                return text or None
            except Exception as exc:  # noqa: BLE001
                logger.warning("Claude returned an unreadable response: %s", exc)
                return None

        body = resp.text[:300]

        if status in (401, 403):
            _trip(600, f"ANTHROPIC_API_KEY was rejected (HTTP {status})")
            return None
        if status == 404:
            _trip(600, f"Claude model '{model_name()}' was not found (HTTP 404) — check ANTHROPIC_MODEL")
            return None
        if status == 400 and "credit balance" in body.lower():
            _trip(1800, "Anthropic credit balance is too low")
            return None
        if status in (429, 500, 502, 503, 504, 529):
            wait = 3 * attempt
            retry_after = resp.headers.get("retry-after")
            if retry_after and retry_after.isdigit():
                wait = min(int(retry_after), 30)
            logger.warning("Claude HTTP %d (attempt %d/3) — retrying in %ds", status, attempt, wait)
            time.sleep(wait)
            continue

        logger.warning("Claude HTTP %d: %s", status, body)
        return None

    return None