"""
================================================================================
MTN QuantRisk - RISK ALERT NOTIFICATION SENDER
================================================================================
Sends every new alert that passes app/services/email_rules.py (ALERT_RULES).

Only alerts whose article already has a completed AI summary AND implications analysis
are emailed. Alerts still waiting for the AI are NOT marked as sent, so they go out on a
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
from app.models.alert import Alert
from app.models.article import Article
from app.models.risk_score import RiskScore
from app.services.email_service import (
    load_sent_ids, mark_sent, render_alert_html, render_consolidated_alert_html, send_email
)
from app.services.so_what_service import parse_analysis
from app.services.email_rules import (
    ALERT_RULES, WAITING, AlertItem, Context, alert_delivery_blocker, first_failed_rule,
)
from app.config.email_config import (
    ALERT_RECIPIENTS, HEAD_OF_RISKS_RECIPIENTS,
    EMAIL_SUBJECT_ALERT, EMAIL_SUBJECT_CONSOLIDATED_ALERT, SENT_ALERTS_LOG, VERBOSE, MAX_AGE_DAYS
)

logging.basicConfig(level=logging.INFO if VERBOSE else logging.WARNING,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def _clean(addresses) -> list[str]:
    """Drop blank entries such as "" so empty recipient lists are handled safely."""
    return [a.strip() for a in (addresses or []) if a and a.strip()]


def fetch_unsent_alerts(db, sent_ids: set[str]) -> tuple[list[dict], int]:
    """
    Alerts that pass every rule in app/services/email_rules.py (ALERT_RULES), newest first.
    Returns (alerts ready to send, number held back waiting, e.g. for the AI).
    """
    ctx = Context(now=datetime.now(timezone.utc), sent_ids=sent_ids)

    rows = (
        db.query(Alert, Article, RiskScore)
        .join(Article, Article.id == Alert.article_id)
        .join(RiskScore, RiskScore.article_id == Alert.article_id)
        .order_by(Alert.created_at.desc())
        .all()
    )

    result = []
    waiting = 0
    seen_alert_ids: set[str] = set()
    for alert, article, risk in rows:
        if alert.id in seen_alert_ids:
            continue
        seen_alert_ids.add(alert.id)

        failed = first_failed_rule(AlertItem(alert, article, risk), ALERT_RULES, ctx)
        if failed is not None:
            if failed.bucket == WAITING:
                waiting += 1
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
            "analysis": parse_analysis(article.analysis),   # AI implications analysis
            "article_url": article.url,
        })
    return result, waiting


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

        to = _clean(ALERT_RECIPIENTS.get("to"))
        cc = _clean(ALERT_RECIPIENTS.get("cc"))
        head_to = _clean(HEAD_OF_RISKS_RECIPIENTS.get("to"))
        head_cc = _clean(HEAD_OF_RISKS_RECIPIENTS.get("cc"))
        blocker = alert_delivery_blocker()
        if blocker:
            logger.error(blocker)
            return

        critical = sum(1 for a in alerts if a["tier"] == "Critical")
        warning  = sum(1 for a in alerts if a["tier"] == "Warning")

        delivered_to: list[str] = []

        # ── Individual team alerts (optional — only if ALERT_RECIPIENTS has a 'to' list) ──
        if to:
            primary_cat = alerts[0]["category"].capitalize() if alerts else "Risk"
            subject = EMAIL_SUBJECT_ALERT.format(category=primary_cat, critical=critical, warning=warning)
            if send_email(subject, render_alert_html(alerts), to=to, cc=cc, preview=args.preview):
                delivered_to += to
        else:
            logger.info("No team alert recipients — alerts go to Head of Risks only.")

        # ── Consolidated alerts to Head of All Risks (always, when it has recipients) ──
        if head_to:
            head_subject = EMAIL_SUBJECT_CONSOLIDATED_ALERT.format(critical=critical, warning=warning)
            if send_email(head_subject, render_consolidated_alert_html(alerts), to=head_to, cc=head_cc, preview=args.preview):
                delivered_to += head_to

        if delivered_to or args.dry_run:
            alert_ids = [a["id"] for a in alerts]
            if not args.preview and not args.dry_run:
                mark_sent(SENT_ALERTS_LOG, alert_ids, ";".join(delivered_to))
            logger.info(f"{'Previewed' if args.preview else 'Sent'} {len(alert_ids)} alerts")


if __name__ == "__main__":
    main()