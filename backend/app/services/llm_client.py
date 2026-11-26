from __future__ import annotations
"""
LLM client — one place that talks to the AI provider(s).

PRIMARY: Hugging Face Inference Providers (OpenAI-compatible chat endpoint).
OPTIONAL BACKUPS: OpenAI, OpenRouter, Gemini, Anthropic. They are tried in the order listed in
LLM_PROVIDERS, so if the first provider is down or out of credit, the next real AI model is used.
There is NO template / generic fallback anywhere: if every provider fails, complete() returns
(None, None), nothing is stored, and the article is retried later.

.env settings (backend/.env)  — see backend/.env.example

    LLM_PROVIDERS=huggingface                 # comma separated, in priority order. e.g. huggingface,openai

    # Hugging Face (primary)
    HF_TOKEN=hf_...                           # fine-grained token with "Make calls to Inference Providers"
    HF_MODELS=openai/gpt-oss-120b:fastest,meta-llama/Llama-3.3-70B-Instruct     # optional

    # Optional backups (each needs a key AND a model name)
    OPENAI_API_KEY=...    OPENAI_MODEL=...    [OPENAI_BASE_URL=https://api.openai.com/v1]
    OPENROUTER_API_KEY=...  OPENROUTER_MODEL=...
    GEMINI_API_KEY=...    GEMINI_MODEL=...
    ANTHROPIC_API_KEY=... [ANTHROPIC_MODEL=...]
"""

import logging
import os
import re
import time
from dataclasses import dataclass, field
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

HF_BASE_URL = "https://router.huggingface.co/v1"
DEFAULT_HF_MODELS = [
    "openai/gpt-oss-120b:fastest",
    "meta-llama/Llama-3.3-70B-Instruct",
]


@dataclass
class _Provider:
    name: str
    kind: str                       # "openai" (OpenAI-compatible) or "anthropic"
    base_url: str = ""
    api_key: str = ""
    models: list[str] = field(default_factory=list)


# Circuit breakers (process-wide)
_disabled_until: dict[str, float] = {}
_bad_models: set[tuple[str, str]] = set()
_warned: set[str] = set()


def _warn_once(key: str, message: str) -> None:
    if key not in _warned:
        _warned.add(key)
        logger.error(message)
        from . import ai_activity_log
        ai_activity_log.record_provider_issue(message)


def _split(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


# ── provider configuration (read from the environment on every call) ──────────

def _build_provider(name: str) -> Optional[_Provider]:
    name = name.strip().lower()

    if name in ("huggingface", "hf"):
        key = os.environ.get("HF_TOKEN", "").strip()
        if not key:
            _warn_once("hf_key", "HF_TOKEN is not set in backend/.env — Hugging Face cannot be used.")
            return None
        models = _split(os.environ.get("HF_MODELS", "")) or DEFAULT_HF_MODELS
        return _Provider("huggingface", "openai", HF_BASE_URL, key, models)

    if name == "openai":
        key = os.environ.get("OPENAI_API_KEY", "").strip()
        model = os.environ.get("OPENAI_MODEL", "").strip()
        if not key or not model:
            _warn_once("openai_cfg", "OpenAI backup needs both OPENAI_API_KEY and OPENAI_MODEL — skipped.")
            return None
        base = os.environ.get("OPENAI_BASE_URL", "").strip() or "https://api.openai.com/v1"
        return _Provider("openai", "openai", base, key, [model])

    if name == "openrouter":
        key = os.environ.get("OPENROUTER_API_KEY", "").strip()
        model = os.environ.get("OPENROUTER_MODEL", "").strip()
        if not key or not model:
            _warn_once("openrouter_cfg", "OpenRouter backup needs both OPENROUTER_API_KEY and OPENROUTER_MODEL — skipped.")
            return None
        return _Provider("openrouter", "openai", "https://openrouter.ai/api/v1", key, [model])

    if name == "gemini":
        key = os.environ.get("GEMINI_API_KEY", "").strip()
        model = os.environ.get("GEMINI_MODEL", "").strip()
        if not key or not model:
            _warn_once("gemini_cfg", "Gemini backup needs both GEMINI_API_KEY and GEMINI_MODEL — skipped.")
            return None
        return _Provider("gemini", "openai", "https://generativelanguage.googleapis.com/v1beta/openai", key, [model])

    if name == "anthropic":
        if not os.environ.get("ANTHROPIC_API_KEY", "").strip():
            _warn_once("anthropic_cfg", "Anthropic backup needs ANTHROPIC_API_KEY — skipped.")
            return None
        return _Provider("anthropic", "anthropic")

    _warn_once(f"unknown_{name}", f"Unknown provider '{name}' in LLM_PROVIDERS — ignored.")
    return None


def providers() -> list[_Provider]:
    names = _split(os.environ.get("LLM_PROVIDERS", "")) or ["huggingface"]
    result = []
    for n in names:
        p = _build_provider(n)
        if p:
            result.append(p)
    return result


def is_available() -> bool:
    """True if at least one configured provider is not currently paused by its circuit breaker."""
    now = time.time()
    ps = providers()
    if not ps:
        _warn_once(
            "no_providers",
            "No AI provider is configured — set HF_TOKEN in backend/.env (see backend/.env.example) and restart. "
            "Summaries and implications cannot be generated until then.",
        )
        return False
    return any(now >= _disabled_until.get(p.name, 0.0) for p in ps)


def describe_configuration() -> list[str]:
    """Human-readable list of configured providers (used by the setup check script)."""
    out = []
    for p in providers():
        out.append(f"{p.name}: {', '.join(p.models) if p.models else '(model set in its own settings)'}")
    return out


# ── calling a provider ────────────────────────────────────────────────────────

def _trip(provider: str, seconds: int, reason: str) -> None:
    _disabled_until[provider] = time.time() + seconds
    logger.error("%s — %s calls paused for %d minutes.", reason, provider, seconds // 60)
    from . import ai_activity_log
    ai_activity_log.record_provider_issue(f"{reason} — {provider} paused for {seconds // 60} minutes")


def _extract_text(data: dict) -> Optional[str]:
    try:
        msg = data["choices"][0]["message"]
    except Exception:  # noqa: BLE001
        return None
    text = (msg.get("content") or "").strip()
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S | re.I).strip()
    return text or None


def _call_openai_compatible(
    p: _Provider, model: str, system: str, user: str,
    max_tokens: int, temperature: float, timeout: int,
) -> tuple[Optional[str], str]:
    """One chat-completions call with retries. Returns (text, outcome); outcome in ok/auth/credits/model/transient/error."""
    import requests

    url = f"{p.base_url.rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {p.api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    for attempt in range(1, 4):
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
        except Exception as exc:  # noqa: BLE001
            logger.warning("%s/%s request failed (attempt %d/3): %s", p.name, model, attempt, exc)
            time.sleep(2 * attempt)
            continue

        status = resp.status_code
        body = resp.text[:300]

        if status == 200:
            try:
                text = _extract_text(resp.json())
            except Exception:  # noqa: BLE001
                text = None
            return (text, "ok") if text else (None, "error")

        if status == 401:
            _trip(p.name, 600, f"{p.name} rejected the token/key (HTTP 401)")
            return None, "auth"
        if status == 403:
            _trip(p.name, 600, f"{p.name} token lacks permission (HTTP 403) — it needs 'Make calls to Inference Providers'")
            return None, "auth"
        if status == 402 or "pre-paid credits" in body.lower() or "credit balance" in body.lower():
            _trip(p.name, 1800, f"{p.name} has no credit left")
            return None, "credits"
        if status in (404, 400, 422):
            logger.warning("%s model '%s' not usable (HTTP %d): %s", p.name, model, status, body)
            _bad_models.add((p.name, model))
            return None, "model"
        if status in (429, 500, 502, 503, 504, 529):
            wait = 3 * attempt
            ra = resp.headers.get("retry-after")
            if ra and ra.isdigit():
                wait = min(int(ra), 30)
            logger.warning("%s HTTP %d (attempt %d/3) — retrying in %ds", p.name, status, attempt, wait)
            time.sleep(wait)
            continue

        logger.warning("%s HTTP %d: %s", p.name, status, body)
        return None, "error"

    return None, "transient"


def complete(
    system: str,
    user: str,
    *,
    max_tokens: int = 3000,
    temperature: float = 0.2,
    timeout: int = 120,
) -> tuple[Optional[str], Optional[str]]:
    """
    Try each configured provider (and each of its models) in order.
    Returns (text, "provider/model") on success, or (None, None) when every option failed.
    """
    for p in providers():
        if time.time() < _disabled_until.get(p.name, 0.0):
            continue

        if p.kind == "anthropic":
            from . import claude_client
            text = claude_client.complete(system, user, max_tokens=min(max_tokens, 1400),
                                          temperature=temperature, timeout=timeout)
            if text:
                return text, f"anthropic/{claude_client.model_name()}"
            continue

        for model in p.models:
            if (p.name, model) in _bad_models:
                continue
            text, outcome = _call_openai_compatible(p, model, system, user, max_tokens, temperature, timeout)
            if text:
                return text, f"{p.name}/{model}"
            if outcome in ("auth", "credits"):
                break  # no point trying this provider's other models

    return None, None


# ── plain-English diagnosis (used by app/scripts/check_ai_setup.py) ───────────

_EXPLAIN = {
    200: "Working.",
    400: "The model name was not accepted. Check the model name in .env.",
    401: "The token/key was rejected. It is missing, mistyped, or was revoked. Create a new one and paste it into .env.",
    402: "No credit on this account. Subscribe to PRO (or buy pre-paid credits) on the provider's billing page.",
    403: "The token does not have permission. On Hugging Face create a FINE-GRAINED token and tick 'Make calls to Inference Providers'.",
    404: "The model was not found for this provider. Check the model name in .env.",
    429: "Too many requests right now. Wait a minute and try again.",
}


def diagnose() -> list[dict]:
    """One raw test request per configured provider/model, with a plain-English explanation."""
    import requests

    results = []
    for p in providers():
        if p.kind == "anthropic":
            from . import claude_client
            text = claude_client.complete("Reply with exactly: OK", "Say OK", max_tokens=20, temperature=0.0, timeout=40)
            results.append({"provider": "anthropic", "model": claude_client.model_name(),
                            "status": 200 if text else 0,
                            "explain": "Working." if text else "Anthropic call failed — check ANTHROPIC_API_KEY and billing.",
                            "reply": text})
            continue

        for model in p.models:
            try:
                resp = requests.post(
                    f"{p.base_url.rstrip('/')}/chat/completions",
                    headers={"Authorization": f"Bearer {p.api_key}", "Content-Type": "application/json"},
                    json={"model": model, "messages": [{"role": "user", "content": "Reply with exactly: OK"}],
                          "max_tokens": 300, "temperature": 0},
                    timeout=60,
                )
                status = resp.status_code
                reply = _extract_text(resp.json()) if status == 200 else None
                note = _EXPLAIN.get(status, f"Unexpected response (HTTP {status}): {resp.text[:160]}")
                if status == 200 and not reply:
                    note = "The service answered but returned no text. Try again; if it repeats, change HF_MODELS."
                results.append({"provider": p.name, "model": model, "status": status, "explain": note, "reply": reply})
            except Exception as exc:  # noqa: BLE001
                results.append({"provider": p.name, "model": model, "status": 0,
                                "explain": f"Could not reach the service (check the internet connection): {exc}",
                                "reply": None})
    return results