"""
================================================================================
MTN QuantRisk - RISK ALERT NOTIFICATION SENDER
================================================================================
Sends all new Warning + Critical alerts to the ALERT_RECIPIENTS list.
Only new alerts (not previously sent) are included, tracked via CSV log.

Run manually:
  cd backend
  python -m app.scripts.send_alert_notifications
================================================================================
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.models.database import SessionLocal
from app.models.alert import Alert
from app.services.email_service import (
    load_sent_ids, mark_sent, render_alert_html, send_email
)
from app.config.email_config import (
    ALERT_RECIPIENTS, ALERT_TIERS_TO_SEND,
    EMAIL_SUBJECT_PREFIX_ALERT, SENT_ALERTS_LOG, VERBOSE
)

logging.basicConfig(level=logging.INFO if VERBOSE else logging.WARNING,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def fetch_unsent_alerts(db, sent_ids: set[str]) -> list[dict]:
    """Return alerts (of allowed tiers) that have not yet been sent."""
    alerts = (
        db.query(Alert)
        .filter(Alert.tier.in_(ALERT_TIERS_TO_SEND))
        .order_by(Alert.created_at.desc())
        .all()
    )

    result = []
    for a in alerts:
        if a.id in sent_ids:
            continue
        result.append({
            "id": a.id,
            "tier": a.tier,
            "category": a.category,
            "headline": a.headline,
            "source_name": a.source_name,
            "severity": a.severity,
            "impact_ghs_mid": a.impact_ghs_mid,
            "mtn_relevance": a.mtn_relevance,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })
    return result


def main():
    logger.info("Starting Alert Notification Sender...")
    sent_ids = load_sent_ids(SENT_ALERTS_LOG)
    logger.info(f"Loaded {len(sent_ids)} previously sent alert IDs")

    with SessionLocal() as db:
        alerts = fetch_unsent_alerts(db, sent_ids)
        if not alerts:
            logger.info("No new alerts to send.")
            return

        to = ALERT_RECIPIENTS.get("to", [])
        cc = ALERT_RECIPIENTS.get("cc", [])
        if not to:
            logger.error("No alert recipients configured. Update email_config.py")
            return

        critical = sum(1 for a in alerts if a["tier"] == "Critical")
        warning  = sum(1 for a in alerts if a["tier"] == "Warning")
        subject = f"{EMAIL_SUBJECT_PREFIX_ALERT}: {critical} Critical, {warning} Warning ({len(alerts)} new)"

        html = render_alert_html(alerts)
        success = send_email(subject, html, to=to, cc=cc)

        if success:
            alert_ids = [a["id"] for a in alerts]
            mark_sent(SENT_ALERTS_LOG, alert_ids, ";".join(to))
            logger.info(f"Sent {len(alert_ids)} alerts to {', '.join(to)}")


if __name__ == "__main__":
    main()