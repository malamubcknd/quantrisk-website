"""
================================================================================
MTN QuantRisk - NEWS DIGEST SENDER
================================================================================
Sends top 3 articles per risk category to the configured recipients.
Skips any articles published or scraped more than MAX_AGE_DAYS ago.
================================================================================
"""
from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.models.database import SessionLocal
from app.models.article import Article
from app.models.risk_score import RiskScore
from app.services.email_service import (
    load_sent_ids, mark_sent, render_news_digest_html, render_consolidated_news_digest_html, send_email
)
from app.config.email_config import (
    NEWS_RECIPIENTS, NEWS_MIN_MTN_RELEVANCE, NEWS_TOP_N, HEAD_OF_RISKS_RECIPIENTS,
    EMAIL_SUBJECT_NEWS, EMAIL_SUBJECT_CONSOLIDATED_NEWS, SENT_NEWS_LOG, VERBOSE, MAX_AGE_DAYS
)

logging.basicConfig(level=logging.INFO if VERBOSE else logging.WARNING,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def _composite_score(article: Article, risk: RiskScore, now: datetime) -> float:
    """Rank by recency (30%) + relevance (40%) + severity (30%)."""
    pub = article.published_at or article.scraped_at or now
    if pub.tzinfo is None:
        pub = pub.replace(tzinfo=timezone.utc)
    age_hours = max((now - pub).total_seconds() / 3600, 0)
    recency = max(1.0 - (age_hours / 168), 0)

    relevance = risk.mtn_relevance or 0
    severity = (risk.severity or 0) / 10.0

    return (recency * 0.30) + (relevance * 0.40) + (severity * 0.30)


def fetch_top_articles_for_category(db, category: str, sent_ids: set[str], now: datetime) -> list[dict]:
    """Fetch top N unsent articles for a given risk category (limited by MAX_AGE_DAYS)."""
    age_cutoff = now - timedelta(days=MAX_AGE_DAYS)

    rows = (
        db.query(Article, RiskScore)
        .join(RiskScore, RiskScore.article_id == Article.id)
        .filter(RiskScore.category == category)
        .filter(RiskScore.mtn_relevance >= NEWS_MIN_MTN_RELEVANCE)
        .all()
    )

    scored = []
    for article, risk in rows:
        if article.id in sent_ids:
            continue
        
        pub_time = article.published_at or article.scraped_at or now
        if pub_time.tzinfo is None:
            pub_time = pub_time.replace(tzinfo=timezone.utc)

        if pub_time < age_cutoff:
            continue

        score = _composite_score(article, risk, now)
        scored.append((score, article, risk))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:NEWS_TOP_N]

    result = []
    for score, article, risk in top:
        result.append({
            "id": article.id,
            "title": article.title,
            "url": article.url,
            "summary": article.summary or "Summary not available",
            "source_name": article.source_name,
            "published_at": article.published_at.isoformat() if article.published_at else None,
            "alert_tier": risk.alert_tier,
            "mtn_relevance": risk.mtn_relevance,
            "severity": risk.severity,
            "category": risk.category,
            "subcategory": risk.subcategory,
            "sentiment": risk.sentiment,
        })
    return result


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
    categories = list(NEWS_RECIPIENTS.keys())
    
    all_processed_articles = []
    total_sent = 0

    with SessionLocal() as db:
        for cat in categories:
            recipients = NEWS_RECIPIENTS[cat]
            to = recipients.get("to", [])
            cc = recipients.get("cc", [])
            if not to:
                continue

            articles = fetch_top_articles_for_category(db, cat, sent_ids, now)
            if not articles:
                logger.info(f"[{cat.upper()}] No new articles within {MAX_AGE_DAYS} days.")
                continue

            cat_label = cat.capitalize()
            subject = EMAIL_SUBJECT_NEWS.format(category=cat_label)
            html = render_news_digest_html(cat_label, articles)

            # ── Send individual group email ──
            success = send_email(subject, html, to=to, cc=cc, preview=args.preview)

            if success or args.dry_run:
                all_processed_articles.extend(articles)
                total_sent += len(articles)
                logger.info(f"[{cat.upper()}] {'Previewed' if args.preview else 'Sent'} {len(articles)} articles → {', '.join(to)}")

        # ── Send Consolidated News Digest to Head of All Risks ──
        head_to = HEAD_OF_RISKS_RECIPIENTS.get("to", [])
        head_cc = HEAD_OF_RISKS_RECIPIENTS.get("cc", [])
        if all_processed_articles and head_to:
            head_subject = EMAIL_SUBJECT_CONSOLIDATED_NEWS
            head_html = render_consolidated_news_digest_html(all_processed_articles)
            send_email(head_subject, head_html, to=head_to, cc=head_cc, preview=args.preview)

        # ── Mark Sent Status ──
        if all_processed_articles and not args.preview and not args.dry_run:
            article_ids = [a["id"] for a in all_processed_articles]
            mark_sent(SENT_NEWS_LOG, article_ids, "Distributed")

    logger.info(f"Done. Total articles processed: {total_sent}")


if __name__ == "__main__":
    main()