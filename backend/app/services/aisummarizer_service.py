from __future__ import annotations
"""
AI Summarizer Service — AI provider only (Hugging Face by default).

There is no neural-API-then-template fallback any more. Summaries and the "so what?" analysis
come from the AI provider in a single call (see so_what_service.generate_ai_content). When the AI cannot
answer, nothing is stored and the article is retried:

  fill_missing_ai_content(limit)      → generates / REGENERATES AI content for articles that
                                        - have no summary, a placeholder, or an old generic template summary
                                        - have no analysis, or an old rule-based analysis
  backfill_missing_summaries_async()  → runs the above once in the background at start-up
                                        (the scheduler in main.py also calls it every 10 minutes)
"""

import logging
import os
import threading
import time

from sqlalchemy import or_

from . import ai_activity_log, llm_client
from .so_what_service import (
    LEGACY_SUMMARY_FRAGMENTS,
    analysis_to_json,
    generate_ai_content,
)

logger = logging.getLogger(__name__)

_FILL_LOCK = threading.Lock()


def generate_ai_summary(
    title: str | None,
    body: str | None = "",
    category: str | None = "",
    mtn_relevance: float = 1.0,
    sentiment: str | None = "neutral",
) -> str | None:
    """
    Kept for backward compatibility. Returns the AI summary, or None if the AI could not
    produce one (never a generic placeholder).
    """
    result = generate_ai_content(
        title=title,
        body=body,
        category=category,
        sentiment=sentiment,
        mtn_relevance=mtn_relevance,
    )
    return result["summary"] if result else None


def _needs_content_clause():
    """SQL condition: the article still needs a real AI summary and/or implications analysis."""
    from ..models.article import Article

    return or_(
        Article.summary.is_(None),
        Article.summary == "",
        Article.summary == "Summary not available",
        Article.summary == "AI summary pending…",
        Article.summary.like("%. Presents %"),
        *[Article.summary.ilike(f"%{frag}%") for frag in LEGACY_SUMMARY_FRAGMENTS],
        Article.analysis.is_(None),
        Article.analysis == "",
        Article.analysis.like('%"generated_by": "rules"%'),
    )


def count_missing_ai_content() -> int:
    """How many scored articles are still waiting for AI content (summary and/or implications)."""
    from ..models.database import SessionLocal
    from ..models.article import Article
    from ..models.risk_score import RiskScore

    with SessionLocal() as db:
        rows = (
            db.query(Article.id)
            .join(RiskScore, RiskScore.article_id == Article.id)
            .filter(_needs_content_clause())
            .all()
        )
    return len({r[0] for r in rows})


def _email_priority(db, pairs) -> dict[str, int]:
    """
    Priority per article id: 0 = an alert that would be emailed once the AI text exists,
    1 = a news article that would be emailed once the AI text exists, 2 = everything else.
    Uses the same rules as the email senders (app/services/email_rules.py), so the
    summarizer always works on what is waiting to be sent first.
    """
    from datetime import datetime, timezone
    from ..config import email_config as cfg
    from ..models.alert import Alert
    from .email_rules import ALERT_RULES, NEWS_RULES, AlertItem, Context, NewsItem, first_failed_rule
    from .email_service import load_sent_ids

    now = datetime.now(timezone.utc)
    news_ctx = Context(now=now, sent_ids=load_sent_ids(cfg.SENT_NEWS_LOG))
    alert_ctx = Context(now=now, sent_ids=load_sent_ids(cfg.SENT_ALERTS_LOG))

    priority: dict[str, int] = {}
    for article, risk in pairs.values():
        failed = first_failed_rule(NewsItem(article, risk), NEWS_RULES, news_ctx)
        priority[article.id] = 1 if failed is not None and failed.key == "ai" else 2

    ids = list(pairs.keys())
    for alert in db.query(Alert).filter(Alert.article_id.in_(ids)).all():
        article, risk = pairs[alert.article_id]
        failed = first_failed_rule(AlertItem(alert, article, risk), ALERT_RULES, alert_ctx)
        if failed is not None and failed.key == "ai":
            priority[article.id] = 0
    return priority


def fill_missing_ai_content(limit: int = 60, source: str = "backfill") -> int:
    """
    Generate AI summary + analysis for scored articles that still need them.
    Order: items waiting to be EMAILED first (alerts, then news), then the rest; newest first.
    Safe to call repeatedly; only one run executes at a time. Returns the number completed.
    Progress is written to app/logs/ai_summarizer.log and app/logs/ai_status.json.
    """
    if not llm_client.is_available():
        ai_activity_log.record_run_start(source, 0, 0, limit)
        ai_activity_log.record_run_end(0, 0, 0, "AI unavailable (no provider configured, or all paused)")
        return 0
    if not _FILL_LOCK.acquire(blocking=False):
        return 0  # another run is already in progress

    from ..models.database import SessionLocal
    from ..models.article import Article
    from ..models.risk_score import RiskScore

    done = priority_done = failed = 0
    stopped: str | None = None
    try:
        with SessionLocal() as db:
            rows = (
                db.query(Article, RiskScore)
                .join(RiskScore, RiskScore.article_id == Article.id)
                .filter(_needs_content_clause())
                .all()
            )
            pairs: dict = {}                      # article id -> (article, latest risk score)
            for article, risk in rows:
                cur = pairs.get(article.id)
                if cur is None or (risk.scored_at and cur[1].scored_at and risk.scored_at > cur[1].scored_at):
                    pairs[article.id] = (article, risk)
            try:
                priority = _email_priority(db, pairs)
            except Exception as exc:  # noqa: BLE001 - never block the AI on the priority step
                logger.warning("AI content: could not compute email priority (%s) — newest first.", exc)
                priority = {}
            ordered = sorted(
                pairs.values(),
                key=lambda p: (priority.get(p[0].id, 2), -(p[0].scraped_at.timestamp() if p[0].scraped_at else 0)),
            )
            pending = [(a.id, priority.get(a.id, 2)) for a, _ in ordered][:limit]
            n_priority = sum(1 for _, pr in pending if pr < 2)
            total_priority = sum(1 for pr in priority.values() if pr < 2)

        ai_activity_log.record_run_start(source, len(pairs), total_priority, limit)
        if not pending:
            return 0

        logger.info("AI content: %d articles need AI text (%d waiting to be emailed); processing up to %d.",
                    len(pairs), total_priority, limit)

        for n, (aid, prio) in enumerate(pending, start=1):
            if not llm_client.is_available():
                stopped = "AI became unavailable (provider paused) — will retry later"
                logger.warning("AI content: %s", stopped)
                break
            try:
                with SessionLocal() as db:
                    art = db.get(Article, aid)
                    if not art:
                        continue
                    risk = (
                        db.query(RiskScore)
                        .filter(RiskScore.article_id == aid)
                        .order_by(RiskScore.scored_at.desc())
                        .first()
                    )
                    if not risk:
                        continue

                    result = generate_ai_content(
                        title=art.title,
                        body=art.body or "",
                        source_name=art.source_name,
                        category=risk.category,
                        subcategory=risk.subcategory,
                        sentiment=risk.sentiment,
                        severity=risk.severity,
                        alert_tier=risk.alert_tier,
                        mtn_relevance=risk.mtn_relevance,
                        published_at=art.published_at,
                    )
                    if not result:
                        failed += 1
                        continue  # nothing is stored for a failed attempt; retried next run

                    art.summary = result["summary"]
                    art.analysis = analysis_to_json(result["analysis"])
                    db.commit()
                    done += 1
                    if prio < 2:
                        priority_done += 1
                    logger.info("[%d/%d]%s AI content ready: %s", n, len(pending),
                                " (email priority)" if prio < 2 else "", (art.title or "")[:55])
            except Exception as exc:  # noqa: BLE001
                failed += 1
                logger.warning("AI content failed for %s: %s", aid, exc)
            ai_activity_log.record_run_progress(done, priority_done, failed)
            time.sleep(0.3)

        logger.info("AI content: %d done (%d of %d email-priority in this batch), %d failed.",
                    done, priority_done, n_priority, failed)
        return done
    finally:
        ai_activity_log.record_run_end(done, priority_done, failed, stopped)
        _FILL_LOCK.release()


def backfill_missing_summaries_async():
    """Background worker started at app start-up (name kept so main.py needs no change)."""
    def _worker():
        time.sleep(3)
        try:
            limit = int(os.environ.get("AI_BACKFILL_LIMIT", "150"))
        except ValueError:
            limit = 150
        logger.info("Starting background AI content backfill (up to %d articles)...", limit)
        fill_missing_ai_content(limit=limit, source="server start-up")

    threading.Thread(target=_worker, daemon=True).start()