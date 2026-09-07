"""
================================================================================
MTN QuantRisk - EMAIL SERVICE (Outlook)
================================================================================
Handles:
  - Connecting to Outlook (via pywin32)
  - Rendering beautifully styled HTML emails
  - Sending & tracking (CSV log of dispatched IDs)
================================================================================
"""
from __future__ import annotations

import csv
import os
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

logger = logging.getLogger(__name__)

# Locate the backend root so log paths work regardless of where the script is run from
BACKEND_ROOT = Path(__file__).resolve().parents[2]


# ── Outlook Connection ────────────────────────────────────────────────────────

def _get_outlook():
    """Return an initialized Outlook Application object. Requires Windows + pywin32."""
    try:
        import win32com.client as win32
        return win32.Dispatch("Outlook.Application")
    except ImportError:
        raise RuntimeError(
            "pywin32 not installed. Run: pip install pywin32"
        )
    except Exception as e:
        raise RuntimeError(f"Failed to initialize Outlook: {e}")


# ── Sent Tracking (CSV log) ───────────────────────────────────────────────────

def load_sent_ids(log_path: str) -> set[str]:
    """Load the set of already-sent record IDs from a CSV log."""
    full_path = BACKEND_ROOT / log_path
    if not full_path.exists():
        return set()
    ids = set()
    with full_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        next(reader, None)  # skip header
        for row in reader:
            if row:
                ids.add(row[0])
    return ids


def mark_sent(log_path: str, record_ids: Iterable[str], recipients: str) -> None:
    """Append newly sent IDs to the CSV log with timestamp."""
    full_path = BACKEND_ROOT / log_path
    full_path.parent.mkdir(parents=True, exist_ok=True)
    is_new = not full_path.exists()
    with full_path.open("a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        if is_new:
            writer.writerow(["record_id", "sent_at_utc", "recipients"])
        ts = datetime.now(timezone.utc).isoformat()
        for rid in record_ids:
            writer.writerow([rid, ts, recipients])


# ── HTML Email Design ─────────────────────────────────────────────────────────

_EMAIL_CSS = """
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #202124; background: #f6f7f9; margin: 0; padding: 20px; }
  .container { max-width: 780px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
  .header { background: linear-gradient(135deg, #FFCB05 0%, #FFB300 100%); padding: 24px 30px; color: #1a1a1a; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
  .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.75; }
  .content { padding: 24px 30px; }
  .stat-row { display: flex; gap: 12px; margin-bottom: 20px; }
  .stat { flex: 1; background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 3px solid #FFCB05; }
  .stat .lbl { font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; }
  .stat .val { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-top: 2px; }
  .article { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: #ffffff; }
  .article-title { font-size: 15px; font-weight: 600; color: #1a1a1a; margin: 0 0 6px 0; line-height: 1.4; }
  .article-title a { color: #1a1a1a; text-decoration: none; }
  .article-title a:hover { color: #FFB300; }
  .article-meta { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
  .article-meta span { margin-right: 10px; }
  .article-summary { font-size: 13px; color: #374151; line-height: 1.6; margin: 8px 0; }
  .badges { margin-top: 8px; }
  .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-right: 5px; }
  .badge-critical { background: #fee2e2; color: #dc2626; }
  .badge-warning  { background: #fed7aa; color: #ea580c; }
  .badge-watch    { background: #fef3c7; color: #d97706; }
  .badge-relevance { background: #dbeafe; color: #2563eb; }
  .footer { background: #f8f9fa; padding: 16px 30px; font-size: 11px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; }
  .no-items { padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
</style>
"""


def _tier_badge(tier: str | None) -> str:
    if not tier:
        return ""
    cls = f"badge-{tier.lower()}"
    return f'<span class="badge {cls}">{tier}</span>'


def _relevance_badge(relevance: float | None) -> str:
    if relevance is None:
        return ""
    pct = int(relevance * 100)
    return f'<span class="badge badge-relevance">MTN {pct}%</span>'


def _fmt_datetime(iso: str | None) -> str:
    if not iso:
        return "—"
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%d %b %Y, %H:%M")
    except Exception:
        return iso


def render_news_digest_html(category_label: str, articles: list[dict]) -> str:
    """Render the HTML body for a per-category news digest email."""
    now = datetime.now().strftime("%A, %d %B %Y %H:%M")

    if not articles:
        articles_html = '<div class="no-items">No new articles above the relevance threshold.</div>'
    else:
        parts = []
        for a in articles:
            summary = (a.get("body") or "")[:400].strip()
            if len(a.get("body") or "") > 400:
                summary += "…"
            parts.append(f"""
            <div class="article">
              <div class="article-title">
                <a href="{a.get('url', '#')}">{a.get('title', 'Untitled')}</a>
              </div>
              <div class="article-meta">
                <span><b>Source:</b> {a.get('source_name') or 'Unknown'}</span>
                <span><b>Published:</b> {_fmt_datetime(a.get('published_at'))}</span>
              </div>
              <div class="article-summary">{summary or 'No preview available.'}</div>
              <div class="badges">
                {_tier_badge(a.get('alert_tier'))}
                {_relevance_badge(a.get('mtn_relevance'))}
              </div>
            </div>
            """)
        articles_html = "".join(parts)

    total = len(articles)
    top_relevance = max((a.get("mtn_relevance") or 0 for a in articles), default=0) * 100

    return f"""
    <html>
      <head>{_EMAIL_CSS}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📰 {category_label} Risk — News Digest</h1>
            <p>{now}</p>
          </div>
          <div class="content">
            <div class="stat-row">
              <div class="stat">
                <div class="lbl">New Articles</div>
                <div class="val">{total}</div>
              </div>
              <div class="stat">
                <div class="lbl">Highest Relevance</div>
                <div class="val">{int(top_relevance)}%</div>
              </div>
              <div class="stat">
                <div class="lbl">Category</div>
                <div class="val">{category_label}</div>
              </div>
            </div>
            {articles_html}
          </div>
          <div class="footer">
            Automated digest from MTN QuantRisk · You are receiving this because you are on the {category_label} risk category distribution list.
          </div>
        </div>
      </body>
    </html>
    """


def render_alert_html(alerts: list[dict]) -> str:
    """Render the HTML body for the critical/warning alert notification email."""
    now = datetime.now().strftime("%A, %d %B %Y %H:%M")

    if not alerts:
        alerts_html = '<div class="no-items">No new alerts.</div>'
    else:
        parts = []
        for a in alerts:
            impact = a.get("impact_ghs_mid")
            impact_str = f"GHS {impact:.1f}m" if impact else "—"
            parts.append(f"""
            <div class="article">
              <div class="article-title">{a.get('headline', 'Untitled')}</div>
              <div class="article-meta">
                <span><b>Source:</b> {a.get('source_name') or 'Unknown'}</span>
                <span><b>Raised:</b> {_fmt_datetime(a.get('created_at'))}</span>
                <span><b>Category:</b> {(a.get('category') or 'Other').capitalize()}</span>
                <span><b>Est. Impact:</b> {impact_str}</span>
              </div>
              <div class="badges">
                {_tier_badge(a.get('tier'))}
                {_relevance_badge(a.get('mtn_relevance'))}
                <span class="badge" style="background:#f3f4f6;color:#374151;">Severity {a.get('severity', 0):.1f}/10</span>
              </div>
            </div>
            """)
        alerts_html = "".join(parts)

    critical = sum(1 for a in alerts if a.get("tier") == "Critical")
    warning  = sum(1 for a in alerts if a.get("tier") == "Warning")

    return f"""
    <html>
      <head>{_EMAIL_CSS}</head>
      <body>
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); color: #fff;">
            <h1>⚠️ Risk Alerts — Immediate Attention Required</h1>
            <p>{now}</p>
          </div>
          <div class="content">
            <div class="stat-row">
              <div class="stat" style="border-left-color:#dc2626;">
                <div class="lbl">Critical</div>
                <div class="val" style="color:#dc2626;">{critical}</div>
              </div>
              <div class="stat" style="border-left-color:#ea580c;">
                <div class="lbl">Warning</div>
                <div class="val" style="color:#ea580c;">{warning}</div>
              </div>
              <div class="stat">
                <div class="lbl">Total New</div>
                <div class="val">{len(alerts)}</div>
              </div>
            </div>
            {alerts_html}
          </div>
          <div class="footer">
            Automated alert from MTN QuantRisk · Please review and acknowledge on the platform.
          </div>
        </div>
      </body>
    </html>
    """


# ── Send Email via Outlook ────────────────────────────────────────────────────

def send_email(subject: str, html_body: str, to: list[str], cc: list[str] | None = None) -> bool:
    """Send an HTML email via Outlook. Returns True if sent."""
    from .. import config
    from ..config.email_config import SEND_EMAILS, VERBOSE

    if not SEND_EMAILS:
        if VERBOSE:
            logger.info(f"[DRY RUN] Would send: {subject}")
            logger.info(f"  To: {', '.join(to)}")
            if cc: logger.info(f"  Cc: {', '.join(cc)}")
        return False

    try:
        outlook = _get_outlook()
        mail = outlook.CreateItem(0)
        mail.Subject = subject
        mail.BodyFormat = 2  # HTML
        mail.HTMLBody = html_body
        mail.To = ";".join(to)
        if cc:
            mail.CC = ";".join(cc)
        mail.Send()
        if VERBOSE:
            logger.info(f"[SENT] {subject} → {', '.join(to)}")
        return True
    except Exception as e:
        logger.error(f"Failed to send '{subject}': {e}")
        return False