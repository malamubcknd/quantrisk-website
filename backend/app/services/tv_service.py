"""
================================================================================
MTN QuantRisk - TV SLIDESHOW SERVICE
================================================================================
"""
from __future__ import annotations

import re
from datetime import datetime, timezone, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.article import Article
from ..models.risk_score import RiskScore
from ..models.alert import Alert


def _clean_subcat(subcat: str | None) -> str:
    if not subcat:
        return ""
    return re.sub(r"^\d+\s*-\s*", "", subcat).strip()


def get_tv_slideshow_data(db: Session, days_limit: int = 10) -> dict:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days_limit)

    news_rows = (
        db.query(Article, RiskScore)
        .join(RiskScore, RiskScore.article_id == Article.id)
        .order_by(func.coalesce(Article.published_at, Article.scraped_at).desc())
        .all()
    )

    alert_rows = (
        db.query(Alert, Article)
        .outerjoin(Article, Alert.article_id == Article.id)
        .order_by(Alert.created_at.desc())
        .all()
    )

    categories = ["strategic", "governance", "financial", "technology", "operational", "external", "other"]
    slideshow_map = {cat: {"news": [], "alerts": []} for cat in categories}

    for article, risk in news_rows:
        pub_time = article.published_at or article.scraped_at or now
        if pub_time.tzinfo is None:
            pub_time = pub_time.replace(tzinfo=timezone.utc)
        
        if pub_time < cutoff:
            continue

        cat = (risk.category or "other").lower().strip()
        if cat not in slideshow_map:
            cat = "other"
            
        slideshow_map[cat]["news"].append({
            "id": article.id,
            "title": article.title or "Untitled Article",
            "summary": article.summary or "Summary not available",
            "sourceName": article.source_name or "Unknown Source",
            "publishedAt": pub_time.isoformat(),
            "severity": float(risk.severity or 5.0),
            "mtnRelevance": float(risk.mtn_relevance or 0.5),
            "sentiment": risk.sentiment or "neutral",
            "subcategory": _clean_subcat(risk.subcategory)
        })

    for alert, article in alert_rows:
        alert_time = alert.created_at or now
        if alert_time.tzinfo is None:
            alert_time = alert_time.replace(tzinfo=timezone.utc)

        if alert_time < cutoff:
            continue

        cat = (alert.category or "other").lower().strip()
        if cat not in slideshow_map:
            cat = "other"

        alert_summary = article.summary if (article and article.summary) else (alert.headline or "")

        slideshow_map[cat]["alerts"].append({
            "id": alert.id,
            "headline": alert.headline or "Untitled Alert",
            "summary": alert_summary,
            "tier": alert.tier or "Warning",
            "severity": float(alert.severity or 5.0),
            "impactGhsMid": float(alert.impact_ghs_mid) if alert.impact_ghs_mid is not None else None,
            "sourceName": alert.source_name or "Unknown Source",
            "createdAt": alert_time.isoformat(),
            "subcategory": _clean_subcat(alert.subcategory)
        })

    active_slideshow_map = {
        cat.capitalize(): data 
        for cat, data in slideshow_map.items() 
        if len(data["news"]) > 0 or len(data["alerts"]) > 0
    }

    return {
        "daysLimit": days_limit,
        "generatedAt": now.isoformat(),
        "categories": active_slideshow_map
    }