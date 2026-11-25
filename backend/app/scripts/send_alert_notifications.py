"""
================================================================================
MTN QuantRisk - RISK ALERT NOTIFICATION SENDER
================================================================================
Sends all new Warning + Critical alerts within the MAX_AGE_DAYS timeframe.

Only alerts whose article already has a completed AI summary AND implications analysis
are emailed. Alerts still waiting for the AI are NOT marked as sent, so they go out on a
later run once the analysis exists. Nothing generic is ever sent.
================================================================================
"""
from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.models.database import SessionLocal
from app.models.alert import Alert
from app.models.article import Article
from app.models.risk_score import RiskScore
from app.services.email_service import (
    load_sent_ids, mark_sent, render_alert_html, render_consolidated_alert_html, send_email
)
from app.services.so_what_service import parse_analysis, is_usable_summary
from app.config.email_config import (
    ALERT_RECIPIENTS, ALERT_TIERS_TO_SEND, HEAD_OF_RISKS_RECIPIENTS,
    EMAIL_SUBJECT_ALERT, EMAIL_SUBJECT_CONSOLIDATED_ALERT, SENT_ALERTS_LOG, VERBOSE, MAX_AGE_DAYS
)

logging.basicConfig(level=logging.INFO if VERBOSE else logging.WARNING,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def fetch_unsent_alerts(db, sent_ids: set[str]) -> tuple[list[dict], int]:
    """Returns (alerts ready to send, number skipped because Claude has not finished them)."""
    now = datetime.now(timezone.utc)
    age_cutoff = now - timedelta(days=MAX_AGE_DAYS)

    alerts = (
        db.query(Alert, Article, RiskScore)
        .join(Article, Article.id == Alert.article_id)
        .join(RiskScore, RiskScore.article_id == Alert.article_id)
        .filter(Alert.tier.in_(ALERT_TIERS_TO_SEND))
        .order_by(Alert.created_at.desc())
        .all()
    )

    result = []
    waiting_for_ai = 0
    seen_alert_ids: set[str] = set()
    for alert, article, risk in alerts:
        if alert.id in sent_ids or alert.id in seen_alert_ids:
            continue
        seen_alert_ids.add(alert.id)

        alert_time = alert.created_at or now
        if alert_time.tzinfo is None:
            alert_time = alert_time.replace(tzinfo=timezone.utc)

        if alert_time < age_cutoff:
            continue

        # Claude summary + analysis must both exist
        analysis = parse_analysis(article.analysis)
        if not is_usable_summary(article.summary) or not analysis:
            waiting_for_ai += 1
            continue

        result.append({
            "id": alert.id,
            "tier": alert.tier,
            "category": alert.category,
            "subcategory": risk.subcategory,
            "sentiment": risk.sentiment,
            "headline": alert.headline,
            "source_name": alert.source_name,
            "severity": alert.severity,
            "impact_ghs_mid": alert.impact_ghs_mid,
            "mtn_relevance": alert.mtn_relevance,
            "created_at": alert.created_at.isoformat() if alert.created_at else None,
            "summary": article.summary,
            "analysis": analysis,   # AI implications analysis
            "article_url": article.url,
        })
    return result, waiting_for_ai


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Send MTN QuantRisk Alert Notifications")
    parser.add_argument("--preview", action="store_true", help="Open email in browser")
    parser.add_argument("--dry-run", action="store_true", help="Log only")
    args = parser.parse_args()

    logger.info("Starting Alert Notification Sender...")
    sent_ids = load_sent_ids(SENT_ALERTS_LOG)
    logger.info(f"Loaded {len(sent_ids)} previously sent alert IDs")

    with SessionLocal() as db:
        alerts, waiting = fetch_unsent_alerts(db, sent_ids)
        if waiting:
            logger.info(f"{waiting} alert(s) still waiting for the AI — they will be sent on a later run.")
        if not alerts:
            logger.info(f"No new analysed alerts within {MAX_AGE_DAYS} days.")
            return

        to = ALERT_RECIPIENTS.get("to", [])
        cc = ALERT_RECIPIENTS.get("cc", [])
        if not to:
            logger.error("No alert recipients configured.")
            return

        critical = sum(1 for a in alerts if a["tier"] == "Critical")
        warning  = sum(1 for a in alerts if a["tier"] == "Warning")

        # Pull category for first alert as context
        primary_cat = alerts[0]["category"].capitalize() if alerts else "Risk"
        subject = EMAIL_SUBJECT_ALERT.format(
            category=primary_cat,
            critical=critical,
            warning=warning
        )

        # ── Send Individual Team Alerts ──
        html = render_alert_html(alerts)
        success = send_email(subject, html, to=to, cc=cc, preview=args.preview)

        # ── Send Consolidated Alerts to Head of All Risks ──
        head_to = HEAD_OF_RISKS_RECIPIENTS.get("to", [])
        head_cc = HEAD_OF_RISKS_RECIPIENTS.get("cc", [])
        if head_to:
            head_subject = EMAIL_SUBJECT_CONSOLIDATED_ALERT.format(
                critical=critical,
                warning=warning
            )
            head_html = render_consolidated_alert_html(alerts)
            send_email(head_subject, head_html, to=head_to, cc=head_cc, preview=args.preview)

        if success or args.dry_run:
            alert_ids = [a["id"] for a in alerts]
            if not args.preview and not args.dry_run:
                mark_sent(SENT_ALERTS_LOG, alert_ids, ";".join(to))
            logger.info(f"{'Previewed' if args.preview else 'Sent'} {len(alert_ids)} alerts")


if __name__ == "__main__":
    main()