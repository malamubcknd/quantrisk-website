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

from . import llm_client
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


def fill_missing_ai_content(limit: int = 60) -> int:
    """
    Generate AI summary + analysis for scored articles that still need them (newest first).
    Safe to call repeatedly; only one run executes at a time. Returns the number completed.
    """
    if not llm_client.is_available():
        return 0
    if not _FILL_LOCK.acquire(blocking=False):
        return 0  # another run is already in progress

    from ..models.database import SessionLocal
    from ..models.article import Article
    from ..models.risk_score import RiskScore

    try:
        needs_content = _needs_content_clause()

        with SessionLocal() as db:
            rows = (
                db.query(Article.id, Article.scraped_at)
                .join(RiskScore, RiskScore.article_id == Article.id)
                .filter(needs_content)
                .order_by(Article.scraped_at.desc())
                .all()
            )
            pending = list(dict.fromkeys(r[0] for r in rows))[:limit]

        if not pending:
            return 0

        logger.info("AI content: %d articles need an AI summary/analysis (processing up to %d).", len(pending), limit)

        done = 0
        for aid in pending:
            if not llm_client.is_available():
                logger.warning("AI content: AI unavailable — stopping this run; will retry later.")
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
                        continue  # nothing is stored for a failed attempt; retried next run

                    art.summary = result["summary"]
                    art.analysis = analysis_to_json(result["analysis"])
                    db.commit()
                    done += 1
                    logger.info("[%d/%d] AI content ready: %s", done, len(pending), (art.title or "")[:55])
            except Exception as exc:  # noqa: BLE001
                logger.warning("AI content failed for %s: %s", aid, exc)
            time.sleep(0.3)

        if done:
            logger.info("AI content: %d articles completed.", done)
        return done
    finally:
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
        fill_missing_ai_content(limit=limit)

    threading.Thread(target=_worker, daemon=True).start()