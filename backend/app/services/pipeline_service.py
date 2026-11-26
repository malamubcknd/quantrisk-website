from __future__ import annotations
"""
process_article — chains NLP → sentiment → impact → AI summarization → "so what" analysis → alert creation.
Called immediately after a new article is stored by the scraper.
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def process_article(article_id: str) -> dict | None:
    from ..models.database import SessionLocal
    from ..models.article import Article
    from ..models.risk_score import RiskScore
    from ..models.alert import Alert
    from .nlp_service import compute_mtn_relevance, run_nlp
    from .sentiment_service import run_sentiment
    from .impact_service import estimate_impact, compute_alert_tier
    from .so_what_service import generate_ai_content, analysis_to_json

    with SessionLocal() as db:
        article = db.get(Article, article_id)
        if not article:
            logger.warning("process_article: article %s not found", article_id)
            return None

        title_str = str(article.title or "").strip()
        body_str = str(article.body or "").strip()
        source_name = str(article.source_name or "").strip()

        # ── Step 2 — Check Base Relevance (Ghana focus is mandatory; trusted regulators are Ghana-focused)
        article_text = f"{title_str} {body_str}"
        mtn_relevance = compute_mtn_relevance(article_text, source_name)
        if mtn_relevance < 0.5:
            logger.debug("Skipping %s before remote NLP — mtn_relevance=%.2f", article_id[:8], mtn_relevance)
            return None

        # ── Step 3 — Full NLP Extraction
        nlp_result = run_nlp(title_str, body_str, source_name)
        mtn_relevance = nlp_result.get("mtn_relevance", mtn_relevance)

        if mtn_relevance < 0.5:
            logger.debug("Skipping %s — mtn_relevance=%.2f", article_id[:8], mtn_relevance)
            return None

        # ── Step 4 — Sentiment
        sentiment_result = run_sentiment(f"{title_str} {body_str}")
        sentiment = sentiment_result.get("sentiment", "neutral")
        sentiment_conf = sentiment_result.get("sentiment_confidence", 0.5)

        category = nlp_result.get("category") or "other"
        subcategory = nlp_result.get("subcategory")
        severity = nlp_result.get("severity", 5.0)
        confidence = nlp_result.get("confidence", 0.7)

        # ── Step 5 — Financial Impact
        impact = estimate_impact(
            category=category,
            severity=severity,
            mtn_relevance=mtn_relevance,
            confidence=confidence,
            sentiment=sentiment
        )

        # ── Step 6 — Alert tier
        alert_tier = compute_alert_tier(
            severity=severity,
            mtn_relevance=mtn_relevance,
            sentiment=sentiment
        )

        # ── Step 7 — AI summary + "So what?" analyst view (one AI call returns both)
        # If the AI is unavailable both stay empty and the background backfill
        # (aisummarizer_service.fill_missing_ai_content) fills them in later.
        try:
            ai_content = generate_ai_content(
                title=title_str,
                body=body_str,
                source_name=source_name,
                category=category,
                subcategory=subcategory,
                sentiment=sentiment,
                severity=severity,
                alert_tier=alert_tier,
                mtn_relevance=mtn_relevance,
                published_at=article.published_at,
            )
        except Exception as ai_exc:  # never let the AI step stop the risk score being saved
            logger.warning("AI content failed for %s: %s", article_id, ai_exc)
            ai_content = None
        if ai_content:
            article.summary = ai_content["summary"]
            article.analysis = analysis_to_json(ai_content["analysis"])
        else:
            article.summary = None
            article.analysis = None

        # ── Step 8 — Save RiskScore
        risk_score = RiskScore(
            article_id=article_id,
            category=category,
            subcategory=subcategory,
            severity=severity,
            confidence=confidence,
            mtn_relevance=mtn_relevance,
            alert_tier=alert_tier,
            sentiment=sentiment,
            sentiment_confidence=sentiment_conf,
            impact_ghs_min=impact.get("impact_ghs_min"),
            impact_ghs_mid=impact.get("impact_ghs_mid"),
            impact_ghs_max=impact.get("impact_ghs_max"),
            entities=nlp_result.get("entities"),
            keyword_hits=nlp_result.get("keyword_hits"),
        )
        db.add(risk_score)

        # ── Step 9 — Create Alert if threshold met
        if alert_tier:
            alert = Alert(
                article_id=article_id,
                tier=alert_tier,
                category=category,
                subcategory=subcategory,
                headline=title_str,
                source_name=article.source_name or "",
                severity=severity,
                impact_ghs_mid=impact.get("impact_ghs_mid"),
                mtn_relevance=mtn_relevance,
            )
            db.add(alert)
            logger.info(
                "[%s] %s — %s severity=%.1f relevance=%.2f",
                alert_tier.upper(), article.source_name, title_str[:60],
                severity, mtn_relevance,
            )

        db.commit()

        return {
            "article_id": article_id,
            "category": category,
            "subcategory": subcategory,
            "severity": severity,
            "mtn_relevance": mtn_relevance,
            "alert_tier": alert_tier,
            "sentiment": sentiment,
        }
