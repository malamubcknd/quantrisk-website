"""
================================================================================
MTN QuantRisk - NEWS DIGEST SENDER
================================================================================
Sends top articles per risk category to the configured recipients.
Which articles qualify is decided by app/services/email_rules.py (NEWS_RULES).

Only articles that already have a completed AI summary AND implications analysis are
emailed. Articles still waiting for the AI are NOT marked as sent, so they go out on a
later run once the analysis exists. Nothing generic is ever sent.
================================================================================
"""
from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.models.database import SessionLocal
from app.services.email_service import (
    load_sent_ids, mark_sent, render_news_digest_html, render_consolidated_news_digest_html, send_email
)
from app.services.so_what_service import parse_analysis
from app.services.email_rules import (
    Context, news_categories, news_delivery_blocker, select_news_for_category,
)
from app.config.email_config import (
    NEWS_RECIPIENTS, HEAD_OF_RISKS_RECIPIENTS,
    EMAIL_SUBJECT_NEWS, EMAIL_SUBJECT_CONSOLIDATED_NEWS, SENT_NEWS_LOG, VERBOSE, MAX_AGE_DAYS
)

logging.basicConfig(level=logging.INFO if VERBOSE else logging.WARNING,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def _clean(addresses) -> list[str]:
    """Drop blank entries such as "" so empty recipient lists are handled safely."""
    return [a.strip() for a in (addresses or []) if a and a.strip()]


def fetch_top_articles_for_category(db, category: str, sent_ids: set[str], now: datetime) -> tuple[list[dict], int]:
    """
    Top NEWS_TOP_N articles for a category that pass every rule in app/services/email_rules.py.
    Returns (articles, number held back waiting, e.g. for the AI).
    """
    selected, waiting = select_news_for_category(db, category, Context(now=now, sent_ids=sent_ids))

    result = []
    for item in selected:
        article, risk = item.article, item.risk
        result.append({
            "id": article.id,
            "title": article.title,
            "url": article.url,
            "summary": article.summary,
            "analysis": parse_analysis(article.analysis),   # AI implications analysis
            "source_name": article.source_name,
            "published_at": article.published_at.isoformat() if article.published_at else None,
            "alert_tier": risk.alert_tier,
            "mtn_relevance": risk.mtn_relevance,
            "severity": risk.severity,
            "category": risk.category,
            "subcategory": risk.subcategory,
            "sentiment": risk.sentiment,
        })
    return result, waiting


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Send MTN QuantRisk News Digests")
    parser.add_argument("--preview", action="store_true", help="Open emails in browser")
    parser.add_argument("--dry-run", action="store_true", help="Log only")
    args = parser.parse_args()

    logger.info("Starting News Digest Sender...")
    sent_ids = load_sent_ids(SENT_NEWS_LOG)
    logger.info(f"Loaded {len(sent_ids)} previously sent article IDs")

    now = datetime.now(timezone.utc)

    blocker = news_delivery_blocker()
    if blocker:
        logger.error(blocker)
        return

    head_to = _clean(HEAD_OF_RISKS_RECIPIENTS.get("to"))
    head_cc = _clean(HEAD_OF_RISKS_RECIPIENTS.get("cc"))

    selected_articles = []        # every article picked (goes to Head of Risks)
    delivered_ids: set[str] = set()
    total_sent = 0

    with SessionLocal() as db:
        for cat in news_categories():
            articles, waiting = fetch_top_articles_for_category(db, cat, sent_ids, now)
            if waiting:
                logger.info(f"[{cat.upper()}] {waiting} article(s) still waiting for the AI — they will be sent on a later run.")
            if not articles:
                logger.info(f"[{cat.upper()}] No new analysed articles within {MAX_AGE_DAYS} days.")
                continue
            selected_articles.extend(articles)

            # ── Individual team email (optional — only if this category has a 'to' list) ──
            recipients = NEWS_RECIPIENTS.get(cat) or {}
            to = _clean(recipients.get("to"))
            cc = _clean(recipients.get("cc"))
            if not to:
                logger.info(f"[{cat.upper()}] No team recipients — {len(articles)} article(s) go to Head of Risks only.")
                continue

            cat_label = cat.capitalize()
            subject = EMAIL_SUBJECT_NEWS.format(category=cat_label)
            html = render_news_digest_html(cat_label, articles)
            success = send_email(subject, html, to=to, cc=cc, preview=args.preview)

            if success or args.dry_run:
                delivered_ids.update(a["id"] for a in articles)
                logger.info(f"[{cat.upper()}] {'Previewed' if args.preview else 'Sent'} {len(articles)} articles → {', '.join(to)}")

        # ── Consolidated News Digest to Head of All Risks (always, when it has recipients) ──
        if selected_articles and head_to:
            head_html = render_consolidated_news_digest_html(selected_articles)
            head_ok = send_email(EMAIL_SUBJECT_CONSOLIDATED_NEWS, head_html, to=head_to, cc=head_cc, preview=args.preview)
            if head_ok or args.dry_run:
                delivered_ids.update(a["id"] for a in selected_articles)
                logger.info(f"[HEAD OF RISKS] {'Previewed' if args.preview else 'Sent'} {len(selected_articles)} articles → {len(head_to)} recipient(s)")

        total_sent = len(delivered_ids)

        # ── Mark Sent Status (only articles that actually reached someone) ──
        if delivered_ids and not args.preview and not args.dry_run:
            mark_sent(SENT_NEWS_LOG, sorted(delivered_ids), "Distributed")

    logger.info(f"Done. Total articles processed: {total_sent}")


if __name__ == "__main__":
    main()