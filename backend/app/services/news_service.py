from __future__ import annotations
"""
News feed — paginated article list with risk scores joined.
Only returns articles that have a RiskScore record (meaning mtn_relevance >= 0.2).
Supports filtering by chosen sources, dynamic category summary mapping,
and case-insensitive category exemptions.
"""

from datetime import datetime, date, timedelta
import re
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..models.article import Article
from ..models.risk_score import RiskScore

# ==============================================================================
# CONFIGURATION: Source Selection List
# Update this list to specify exactly which sources to use (e.g. ["Joy Online", "Citi Newsroom"]).
# If this list is empty, all sources in the database are allowed and displayed.
# ==============================================================================
ALLOWED_SOURCES: list[str] = []

# ==============================================================================
# CONFIGURATION: Category Exemptions
# Add categories here to completely exclude them and their articles from the news feed,
# total counts, today's counts, and category breakdowns. (e.g. ["Other"])
# Case-insensitive. If this list is empty, no categories are excluded.
# ==============================================================================
CATEGORY_EXEMPT: list[str] = ["Other"]


def _clean_subcategory(subcat: str | None) -> str:
    """Strips leading numbers like '8 - Governance' -> 'Governance'."""
    if not subcat:
        return "Other"
    return re.sub(r"^\d+\s*-\s*", "", subcat).strip()


def list_news(
    db: Session,
    category: str | None = None,
    source: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    keyword: str | None = None,
    limit: int = 30,
    offset: int = 0,
) -> list[dict]:
    query = (
        db.query(Article, RiskScore)
        .join(RiskScore, RiskScore.article_id == Article.id)
        .order_by(func.coalesce(Article.published_at, Article.scraped_at).desc())
    )

    if CATEGORY_EXEMPT:
        exempt_lower = [c.lower().strip() for c in CATEGORY_EXEMPT]
        query = query.filter(~func.lower(RiskScore.category).in_(exempt_lower))

    if ALLOWED_SOURCES:
        query = query.filter(Article.source_name.in_(ALLOWED_SOURCES))

    if source:
        query = query.filter(Article.source_name.ilike(f"%{source}%"))
    if date_from:
        start = datetime(date_from.year, date_from.month, date_from.day)
        query = query.filter(func.coalesce(Article.published_at, Article.scraped_at) >= start)
    if date_to:
        end = datetime(date_to.year, date_to.month, date_to.day) + timedelta(days=1)
        query = query.filter(func.coalesce(Article.published_at, Article.scraped_at) < end)
    if keyword and keyword.strip():
        search = f"%{keyword.strip()}%"
        query = query.filter(or_(
            Article.title.ilike(search),
            Article.body.ilike(search),
            Article.source_name.ilike(search),
        ))
    if category:
        # Match both high-level categories and subcategories (accounting for possible stored numbering)
        clean_cat = _clean_subcategory(category)
        query = query.filter(or_(
            RiskScore.category == category,
            RiskScore.subcategory == category,
            RiskScore.subcategory.ilike(f"%{clean_cat}%")
        ))

    rows = query.offset(offset).limit(limit).all()
    return [_row_to_dict(article, risk_score) for article, risk_score in rows]


def get_news_by_id(db: Session, article_id: str) -> dict | None:
    query = (
        db.query(Article, RiskScore)
        .join(RiskScore, RiskScore.article_id == Article.id)
        .filter(Article.id == article_id)
    )

    if CATEGORY_EXEMPT:
        exempt_lower = [c.lower().strip() for c in CATEGORY_EXEMPT]
        query = query.filter(~func.lower(RiskScore.category).in_(exempt_lower))

    row = query.first()
    if not row:
        return None
    return _row_to_dict(row[0], row[1], full=True)


def get_news_summary(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
    keyword: str | None = None,
) -> dict:
    from datetime import timezone, timedelta
    now = datetime.now(timezone.utc)
    today = now.date()
    since_24h = now - timedelta(hours=24)

    exempt_lower = [c.lower().strip() for c in CATEGORY_EXEMPT] if CATEGORY_EXEMPT else []

    today_query = (
        db.query(Article)
        .join(RiskScore, RiskScore.article_id == Article.id)
        .filter(Article.scraped_at >= datetime(today.year, today.month, today.day))
    )
    if exempt_lower:
        today_query = today_query.filter(~func.lower(RiskScore.category).in_(exempt_lower))
    all_today = today_query.count()

    recent_query = (
        db.query(Article.source_name)
        .join(RiskScore, RiskScore.article_id == Article.id)
        .filter(Article.scraped_at >= since_24h)
    )
    if ALLOWED_SOURCES:
        recent_query = recent_query.filter(Article.source_name.in_(ALLOWED_SOURCES))
    if exempt_lower:
        recent_query = recent_query.filter(~func.lower(RiskScore.category).in_(exempt_lower))
    recent = recent_query.all()
    
    source_counts: dict[str, int] = {}
    for (src,) in recent:
        key = src or "Unknown"
        source_counts[key] = source_counts.get(key, 0) + 1
    source_breakdown = dict(
        sorted(source_counts.items(), key=lambda x: -x[1])[:15]
    )

    cat_counts = {
        "strategic": 0,
        "governance": 0,
        "financial": 0,
        "technology": 0,
        "operational": 0,
        "external": 0,
        "other": 0
    }
    
    breakdown_query = (
        db.query(RiskScore.category, func.count(Article.id))
        .join(Article, RiskScore.article_id == Article.id)
    )

    if ALLOWED_SOURCES:
        breakdown_query = breakdown_query.filter(Article.source_name.in_(ALLOWED_SOURCES))
    if exempt_lower:
        breakdown_query = breakdown_query.filter(~func.lower(RiskScore.category).in_(exempt_lower))
    if date_from:
        start = datetime(date_from.year, date_from.month, date_from.day)
        breakdown_query = breakdown_query.filter(func.coalesce(Article.published_at, Article.scraped_at) >= start)
    if date_to:
        end = datetime(date_to.year, date_to.month, date_to.day) + timedelta(days=1)
        breakdown_query = breakdown_query.filter(func.coalesce(Article.published_at, Article.scraped_at) < end)
    if keyword and keyword.strip():
        search = f"%{keyword.strip()}%"
        breakdown_query = breakdown_query.filter(or_(
            Article.title.ilike(search),
            Article.body.ilike(search),
            Article.source_name.ilike(search),
        ))

    db_counts = breakdown_query.group_by(RiskScore.category).all()
    for cat, count in db_counts:
        cat_lower = (cat or "other").lower().strip()
        if cat_lower in exempt_lower:
            continue
        if cat_lower in cat_counts:
            cat_counts[cat_lower] += count
        else:
            cat_counts["other"] = cat_counts.get("other", 0) + count

    clean_counts = {k: v for k, v in cat_counts.items() if k != "other" and k not in exempt_lower}
    top_category = max(clean_counts, key=clean_counts.get) if any(clean_counts.values()) else None

    total_query = db.query(Article).join(RiskScore, RiskScore.article_id == Article.id)
    if ALLOWED_SOURCES:
        total_query = total_query.filter(Article.source_name.in_(ALLOWED_SOURCES))
    if exempt_lower:
        total_query = total_query.filter(~func.lower(RiskScore.category).in_(exempt_lower))
    if date_from:
        start = datetime(date_from.year, date_from.month, date_from.day)
        total_query = total_query.filter(func.coalesce(Article.published_at, Article.scraped_at) >= start)
    if date_to:
        end = datetime(date_to.year, date_to.month, date_to.day) + timedelta(days=1)
        total_query = total_query.filter(func.coalesce(Article.published_at, Article.scraped_at) < end)
    if keyword and keyword.strip():
        search = f"%{keyword.strip()}%"
        total_query = total_query.filter(or_(
            Article.title.ilike(search),
            Article.body.ilike(search),
            Article.source_name.ilike(search),
        ))
    total_articles = total_query.count()

    return {
        "articlesToday": all_today,
        "totalArticles": total_articles,
        "topRiskCategory": top_category,
        "categoryBreakdown": cat_counts,
        "sourceBreakdown": source_breakdown,
    }


def _row_to_dict(article: Article, risk_score: RiskScore, full: bool = False) -> dict:
    base = {
        "id":          article.id,
        "url":         article.url,
        "title":       article.title,
        "sourceName":  article.source_name,
        "publishedAt": article.published_at.isoformat() if article.published_at else None,
        "scrapedAt":   article.scraped_at.isoformat() if article.scraped_at else None,
        "category":    risk_score.category,
        "subcategory": _clean_subcategory(risk_score.subcategory),
        "severity":    risk_score.severity,
        "confidence":  risk_score.confidence,
        "mtnRelevance": risk_score.mtn_relevance,
        "alertTier":   risk_score.alert_tier,
        "sentiment":   risk_score.sentiment,
        "sentiment_confidence": risk_score.sentiment_confidence,
        "impactGhsMin": risk_score.impact_ghs_min,
        "impactGhsMid": risk_score.impact_ghs_mid,
        "impactGhsMax": risk_score.impact_ghs_max,
        "entities":    risk_score.entities,
    }
    if full:
        base["body"] = article.body
        base["keywordHits"] = risk_score.keyword_hits
    return base