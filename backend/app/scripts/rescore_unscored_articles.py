"""
================================================================================
MTN QuantRisk - RE-SCORE ARTICLES THAT HAVE NO RISK SCORE
================================================================================
Runs the full pipeline (relevance → NLP → sentiment → impact → alert → AI content)
again for stored articles that never got a risk score, e.g. because the pipeline
crashed while they were being processed.

Run from the backend folder:

    python app/scripts/rescore_unscored_articles.py             # last 7 days
    python app/scripts/rescore_unscored_articles.py --days 30   # further back
    python app/scripts/rescore_unscored_articles.py --dry-run   # only count them

Articles that are not relevant enough to MTN Ghana are skipped by the pipeline
(as on a normal scrape), so they stay unscored. That is expected.
================================================================================
"""
from __future__ import annotations

import argparse
import logging
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.models.database import SessionLocal                             # noqa: E402
from app.models.article import Article                                   # noqa: E402
from app.models.risk_score import RiskScore                              # noqa: E402
from app.services.pipeline_service import process_article                # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def find_unscored(days: int) -> list[str]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    with SessionLocal() as db:
        rows = (
            db.query(Article.id, Article.published_at, Article.scraped_at)
            .outerjoin(RiskScore, RiskScore.article_id == Article.id)
            .filter(RiskScore.id.is_(None))
            .all()
        )
    ids = []
    for aid, published, scraped in rows:
        when = published or scraped
        if when is not None and when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        if when is None or when >= cutoff:
            ids.append(aid)
    return ids


def main() -> int:
    parser = argparse.ArgumentParser(description="Re-score stored articles that have no risk score")
    parser.add_argument("--days", type=int, default=7, help="only articles from the last N days (default 7)")
    parser.add_argument("--dry-run", action="store_true", help="only count, do not process")
    args = parser.parse_args()

    ids = find_unscored(args.days)
    logger.info("Found %d articles from the last %d days without a risk score.", len(ids), args.days)
    if args.dry_run or not ids:
        return 0

    scored = skipped = failed = 0
    for n, aid in enumerate(ids, start=1):
        try:
            result = process_article(aid)
            if result is None:
                skipped += 1        # not relevant enough to MTN Ghana
            else:
                scored += 1
        except Exception as exc:  # noqa: BLE001 — keep going with the rest
            failed += 1
            logger.error("[%d/%d] Failed for %s: %s", n, len(ids), aid, exc)
        if n % 10 == 0:
            logger.info("Progress: %d/%d (scored %d, not relevant %d, failed %d)", n, len(ids), scored, skipped, failed)

    logger.info("Done. Scored %d, not relevant %d, failed %d.", scored, skipped, failed)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
