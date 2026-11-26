"""
================================================================================
MTN QuantRisk - AI SUMMARIZER ACTIVITY LOG + STATUS
================================================================================
Two files in backend/app/logs/ so you can always tell if the AI summarizer is working
and how far it has got - whether it ran in the API server, the scraper or a script:

  ai_summarizer.log   every AI event (success, failure + reason, provider paused,
                      backfill runs and their progress). Rotates at 5 MB, keeps 3 old files.
  ai_status.json      the latest state at a glance: last success / failure, last error,
                      today's counts, and the current / last backfill run.

View both with:   python -m app.scripts.explain_email_eligibility   (section "AI SUMMARIZER")
================================================================================
"""
from __future__ import annotations

import json
import logging
import os
import threading
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any

LOG_DIR = Path(__file__).resolve().parents[1] / "logs"
LOG_FILE = LOG_DIR / "ai_summarizer.log"
STATUS_FILE = LOG_DIR / "ai_status.json"

# Loggers whose messages are about the AI summarizer
AI_LOGGERS = (
    "app.services.aisummarizer_service",
    "app.services.so_what_service",
    "app.services.llm_client",
    "app.services.claude_client",
    "app.services.ai_activity_log",
)

_lock = threading.Lock()
_setup_done = False
logger = logging.getLogger(__name__)


def setup() -> None:
    """Attach the rotating file handler to the AI loggers (safe to call many times)."""
    global _setup_done
    if _setup_done:
        return
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        handler = RotatingFileHandler(LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8")
        handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
        handler.setLevel(logging.INFO)
        for name in AI_LOGGERS:
            lg = logging.getLogger(name)
            lg.addHandler(handler)
            if lg.level == logging.NOTSET or lg.level > logging.INFO:
                lg.setLevel(logging.INFO)
    except Exception as exc:  # noqa: BLE001 - logging must never break the app
        logging.getLogger(__name__).warning("Could not open AI log file %s: %s", LOG_FILE, exc)
    _setup_done = True


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def read_status() -> dict:
    try:
        return json.loads(STATUS_FILE.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001 - missing / half-written file
        return {}


def _write_status(status: dict) -> None:
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        tmp = STATUS_FILE.with_suffix(f".{os.getpid()}.tmp")
        tmp.write_text(json.dumps(status, indent=2, default=str), encoding="utf-8")
        os.replace(tmp, STATUS_FILE)
    except Exception as exc:  # noqa: BLE001 - e.g. file briefly locked on Windows
        logger.debug("Could not write %s: %s", STATUS_FILE, exc)


def _update(fn) -> None:
    with _lock:
        status = read_status()
        today = datetime.now(timezone.utc).date().isoformat()
        if status.get("today", {}).get("date") != today:
            status["today"] = {"date": today, "succeeded": 0, "failed": 0}
        fn(status)
        status["updated_at"] = _now()
        _write_status(status)


# ── events ───────────────────────────────────────────────────────────────────

def record_success(title: str, model: str) -> None:
    setup()
    logger.info("AI OK [%s]: %s", model or "?", (title or "")[:80])

    def fn(s: dict) -> None:
        s["last_success_at"] = _now()
        s["last_success_model"] = model
        s["last_success_title"] = (title or "")[:120]
        s["today"]["succeeded"] += 1
    _update(fn)


def record_failure(title: str, reason: str) -> None:
    setup()
    logger.warning("AI FAILED (%s): %s", reason, (title or "")[:80])

    def fn(s: dict) -> None:
        s["last_failure_at"] = _now()
        s["last_failure_reason"] = reason
        s["last_failure_title"] = (title or "")[:120]
        s["today"]["failed"] += 1
    _update(fn)


def record_provider_issue(message: str) -> None:
    """Provider paused (auth / credits / outage) or not configured."""
    setup()
    logger.error("AI PROVIDER: %s", message)

    def fn(s: dict) -> None:
        s["last_provider_issue_at"] = _now()
        s["last_provider_issue"] = message
    _update(fn)


def record_run_start(source: str, queued: int, priority: int, limit: int) -> None:
    setup()
    logger.info("BACKFILL START (%s): %d queued (%d email-priority first), processing up to %d",
                source, queued, priority, limit)

    def fn(s: dict) -> None:
        s["run"] = {
            "source": source, "state": "running", "started_at": _now(), "finished_at": None,
            "queued": queued, "priority_queued": priority, "limit": limit,
            "done": 0, "priority_done": 0, "failed": 0, "stopped_reason": None,
        }
    _update(fn)


def record_run_progress(done: int, priority_done: int, failed: int) -> None:
    def fn(s: dict) -> None:
        run = s.get("run") or {}
        run.update(done=done, priority_done=priority_done, failed=failed, last_progress_at=_now())
        s["run"] = run
    _update(fn)


def record_run_end(done: int, priority_done: int, failed: int, stopped_reason: str | None = None) -> None:
    setup()
    logger.info("BACKFILL END: %d done (%d email-priority), %d failed%s",
                done, priority_done, failed, f" - stopped: {stopped_reason}" if stopped_reason else "")

    def fn(s: dict) -> None:
        run = s.get("run") or {}
        run.update(state="finished", finished_at=_now(), done=done, priority_done=priority_done,
                   failed=failed, stopped_reason=stopped_reason)
        s["run"] = run
        s["last_run"] = dict(run)
    _update(fn)


def tail(lines: int = 15) -> list[str]:
    """Last lines of the activity log (for the status report)."""
    try:
        with open(LOG_FILE, encoding="utf-8", errors="replace") as fh:
            return [ln.rstrip("\n") for ln in fh.readlines()[-lines:]]
    except Exception:  # noqa: BLE001
        return []


def summary(**extra: Any) -> dict:
    return {**read_status(), **extra}
