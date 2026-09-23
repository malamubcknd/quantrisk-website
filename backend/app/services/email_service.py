# """
# ================================================================================
# MTN QuantRisk - EMAIL SERVICE
# ================================================================================
# Dark-themed HTML emails matching the QuantRisk dashboard.
# Includes category, subcategory, and sentiment badges matching the website's UI.
# ================================================================================
# """
# from __future__ import annotations

# import csv
# import os
# import logging
# import tempfile
# import webbrowser
# from datetime import datetime, timezone
# from pathlib import Path
# from typing import Iterable

# logger = logging.getLogger(__name__)

# BACKEND_ROOT = Path(__file__).resolve().parents[2]


# # ── Outlook Connection (Windows only) ─────────────────────────────────────────

# def _get_outlook():
#     try:
#         import win32com.client as win32
#         return win32.Dispatch("Outlook.Application")
#     except ImportError:
#         raise RuntimeError("pywin32 not installed. Run: pip install pywin32")
#     except Exception as e:
#         raise RuntimeError(f"Failed to initialize Outlook: {e}")


# # ── Sent Tracking ─────────────────────────────────────────────────────────────

# def load_sent_ids(log_path: str) -> set[str]:
#     full_path = BACKEND_ROOT / log_path
#     if not full_path.exists():
#         return set()
#     ids = set()
#     with full_path.open("r", encoding="utf-8", newline="") as f:
#         reader = csv.reader(f)
#         next(reader, None)
#         for row in reader:
#             if row:
#                 ids.add(row[0])
#     return ids


# def mark_sent(log_path: str, record_ids: Iterable[str], recipients: str) -> None:
#     full_path = BACKEND_ROOT / log_path
#     full_path.parent.mkdir(parents=True, exist_ok=True)
#     is_new = not full_path.exists()
#     with full_path.open("a", encoding="utf-8", newline="") as f:
#         writer = csv.writer(f)
#         if is_new:
#             writer.writerow(["record_id", "sent_at_utc", "recipients"])
#         ts = datetime.now(timezone.utc).isoformat()
#         for rid in record_ids:
#             writer.writerow([rid, ts, recipients])


# # ── Dark Theme CSS ────────────────────────────────────────────────────────────

# _EMAIL_CSS = """
# <style>
#   body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #e0ddd8; background: #0a0a14; margin: 0; padding: 20px; }
#   .container { max-width: 720px; margin: 0 auto; background: #12121e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.07); }
#   .header-news { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 28px 32px; border-bottom: 2px solid #FFD000; }
#   .header-alert { background: linear-gradient(135deg, #1a0a0a 0%, #2d1010 100%); padding: 28px 32px; border-bottom: 2px solid #ef4444; }
#   .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #FFD000; letter-spacing: -0.3px; }
#   .header-alert h1 { color: #ef4444; }
#   .header .subtitle { margin: 6px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.45); font-family: 'Courier New', monospace; text-transform: uppercase; letter-spacing: 1px; }
#   .content { padding: 28px 32px; }
#   .article { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 18px; margin-bottom: 14px; }
#   .article-title { font-size: 14px; font-weight: 600; color: #ffffff; margin: 0 0 8px 0; line-height: 1.45; }
#   .article-title a { color: #FFD000; text-decoration: none; }
#   .article-title a:hover { text-decoration: underline; }
#   .article-meta { font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 10px; font-family: 'Courier New', monospace; }
#   .article-meta span { margin-right: 12px; }
#   .summary-box { background: rgba(255,208,0,0.05); border-left: 3px solid rgba(255,208,0,0.4); border-radius: 0 8px 8px 0; padding: 12px 14px; margin: 10px 0; }
#   .summary-label { font-size: 10px; font-family: 'Courier New', monospace; text-transform: uppercase; letter-spacing: 1px; color: #FFD000; margin-bottom: 4px; font-weight: 700; }
#   .summary-text { font-size: 12px; color: rgba(255,255,255,0.75); line-height: 1.6; }
#   .badges { margin-top: 10px; }
#   .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; margin-right: 5px; margin-bottom: 5px; font-family: 'Courier New', monospace; }
  
#   /* Alert Tiers */
#   .badge-critical { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
#   .badge-warning  { background: rgba(249,115,22,0.15); color: #f97316; border: 1px solid rgba(249,115,22,0.3); }
#   .badge-watch    { background: rgba(250,204,21,0.15); color: #facc15; border: 1px solid rgba(250,204,21,0.3); }
  
#   /* Category Styling */
#   .badge-strategic    { background: rgba(248,113,113,0.15); color: #f87171; border: 1px solid rgba(248,113,113,0.3); }
#   .badge-governance   { background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3); }
#   .badge-financial    { background: rgba(250,204,21,0.15);  color: #facc15; border: 1px solid rgba(250,204,21,0.3); }
#   .badge-technology   { background: rgba(96,165,250,0.15);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.3); }
#   .badge-operational  { background: rgba(251,146,60,0.15);  color: #fb923c; border: 1px solid rgba(251,146,60,0.3); }
#   .badge-external     { background: rgba(244,114,182,0.15);  color: #f472b6; border: 1px solid rgba(244,114,182,0.3); }
#   .badge-other        { background: rgba(156,163,175,0.15);  color: #9ca3af; border: 1px solid rgba(156,163,175,0.3); }

#   /* Subcategory & Stats */
#   .badge-subcat       { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.65); border: 1px solid rgba(255,255,255,0.12); }
#   .badge-severity     { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.1); }
#   .badge-relevance    { background: rgba(96,165,250,0.15); color: #60a5fa; border: 1px solid rgba(96,165,250,0.3); }

#   /* Sentiments */
#   .badge-sent-negative { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
#   .badge-sent-neutral  { background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3); }
#   .badge-sent-positive { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }

#   .read-more { display: inline-block; margin-top: 10px; padding: 7px 16px; background: rgba(255,208,0,0.1); border: 1px solid rgba(255,208,0,0.3); border-radius: 8px; color: #FFD000; font-size: 11px; font-weight: 600; text-decoration: none; font-family: 'Courier New', monospace; }
#   .read-more:hover { background: rgba(255,208,0,0.2); }
#   .footer { background: rgba(255,255,255,0.02); padding: 18px 32px; font-size: 11px; color: rgba(255,255,255,0.3); text-align: center; border-top: 1px solid rgba(255,255,255,0.06); font-family: 'Courier New', monospace; }
#   .no-items { padding: 40px; text-align: center; color: rgba(255,255,255,0.3); font-size: 13px; }
# </style>
# """


# def _tier_badge(tier: str | None) -> str:
#     if not tier:
#         return ""
#     return f'<span class="badge badge-{tier.lower()}">{tier.upper()}</span>'


# def _relevance_badge(relevance: float | None) -> str:
#     if relevance is None:
#         return ""
#     return f'<span class="badge badge-relevance">MTN {int(relevance * 100)}%</span>'


# def _severity_badge(severity: float | None) -> str:
#     if severity is None:
#         return ""
#     return f'<span class="badge badge-severity">Severity {severity:.1f}/10</span>'


# def _category_badge(category: str | None) -> str:
#     if not category:
#         return ""
#     cat = category.lower().strip()
#     return f'<span class="badge badge-{cat}">{cat.capitalize()}</span>'


# def _subcategory_badge(subcategory: str | None) -> str:
#     if not subcategory:
#         return ""
#     clean_sub = subcategory.replace(r"^\d+\s*-\s*", "").strip()
#     if not clean_sub or clean_sub.lower() == "other":
#         return ""
#     return f'<span class="badge badge-subcat">{clean_sub}</span>'


# def _sentiment_badge(sentiment: str | None) -> str:
#     if not sentiment:
#         return ""
#     sent = sentiment.lower().strip()
#     return f'<span class="badge badge-sent-{sent}">{sent.capitalize()}</span>'


# def _fmt_datetime(iso: str | None) -> str:
#     if not iso:
#         return "—"
#     try:
#         dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
#         return dt.strftime("%d %b %Y · %H:%M GMT")
#     except Exception:
#         return iso


# # ── NEWS DIGEST HTML ──────────────────────────────────────────────────────────

# def render_news_digest_html(category_label: str, articles: list[dict]) -> str:
#     now = datetime.now().strftime("%A, %d %B %Y · %H:%M GMT")

#     if not articles:
#         articles_html = '<div class="no-items">No new high-relevance articles in this category today.</div>'
#     else:
#         parts = []
#         for i, a in enumerate(articles, 1):
#             summary = a.get("summary") or "Summary not available"
#             parts.append(f"""
#             <div class="article">
#               <div class="article-title">
#                 <a href="{a.get('url', '#')}">{i}. {a.get('title', 'Untitled')}</a>
#               </div>
#               <div class="article-meta">
#                 <span>{a.get('source_name') or 'Unknown'}</span>
#                 <span>·</span>
#                 <span>{_fmt_datetime(a.get('published_at'))}</span>
#               </div>
#               <div class="summary-box">
#                 <div class="summary-label">🧠 AI Risk Summary & MTN Impact</div>
#                 <div class="summary-text">{summary}</div>
#               </div>
#               <div class="badges">
#                 {_tier_badge(a.get('alert_tier'))}
#                 {_category_badge(a.get('category'))}
#                 {_subcategory_badge(a.get('subcategory'))}
#                 {_sentiment_badge(a.get('sentiment'))}
#                 {_relevance_badge(a.get('mtn_relevance'))}
#                 {_severity_badge(a.get('severity'))}
#               </div>
#               <a href="{a.get('url', '#')}" class="read-more" target="_blank">→ Read Full Article</a>
#             </div>
#             """)
#         articles_html = "".join(parts)

#     return f"""
#     <html>
#       <head>{_EMAIL_CSS}</head>
#       <body>
#         <div class="container">
#           <div class="header-news header">
#             <h1>📡 {category_label} Risk — Daily Intelligence Briefing</h1>
#             <div class="subtitle">MTN QuantRisk · {now}</div>
#           </div>
#           <div class="content">
#             {articles_html}
#           </div>
#           <div class="footer">
#             MTN QuantRisk Automated Intelligence · {category_label} Department Distribution List<br>
#             To update your preferences, contact the QuantRisk admin team.
#           </div>
#         </div>
#       </body>
#     </html>
#     """


# # ── ALERT NOTIFICATION HTML ───────────────────────────────────────────────────

# def render_alert_html(alerts: list[dict]) -> str:
#     now = datetime.now().strftime("%A, %d %B %Y · %H:%M GMT")

#     if not alerts:
#         alerts_html = '<div class="no-items">No new alerts at this time.</div>'
#     else:
#         parts = []
#         for a in alerts:
#             impact = a.get("impact_ghs_mid")
#             impact_str = f"GHS {impact:.1f}m" if impact else "—"
#             summary = a.get("summary") or "Summary not available"
#             article_url = a.get("article_url") or "#"
#             parts.append(f"""
#             <div class="article" style="border-left: 3px solid {'#ef4444' if a.get('tier') == 'Critical' else '#f97316'};">
#               <div class="article-title">
#                 <a href="{article_url}">{a.get('headline', 'Untitled')}</a>
#               </div>
#               <div class="article-meta">
#                 <span>{a.get('source_name') or 'Unknown'}</span>
#                 <span>·</span>
#                 <span>{_fmt_datetime(a.get('created_at'))}</span>
#               </div>
#               <div class="summary-box">
#                 <div class="summary-label">🧠 AI Risk Summary & MTN Impact</div>
#                 <div class="summary-text">{summary}</div>
#               </div>
#               <div class="badges">
#                 {_tier_badge(a.get('tier'))}
#                 {_category_badge(a.get('category'))}
#                 {_subcategory_badge(a.get('subcategory'))}
#                 {_sentiment_badge(a.get('sentiment'))}
#                 {_relevance_badge(a.get('mtn_relevance'))}
#                 {_severity_badge(a.get('severity'))}
#                 <span class="badge badge-severity">Impact {impact_str}</span>
#               </div>
#               <a href="{article_url}" class="read-more" target="_blank">→ Read Full Article</a>
#             </div>
#             """)
#         alerts_html = "".join(parts)

#     return f"""
#     <html>
#       <head>{_EMAIL_CSS}</head>
#       <body>
#         <div class="container">
#           <div class="header-alert header">
#             <h1>🚨 Immediate Action Required — Risk Alert Notification</h1>
#             <div class="subtitle" style="color: rgba(239,68,68,0.6);">MTN QuantRisk · {now}</div>
#           </div>
#           <div class="content">
#             {alerts_html}
#           </div>
#           <div class="footer">
#             MTN QuantRisk Automated Alert System · Please acknowledge on the platform.<br>
#             To update your preferences, contact the QuantRisk admin team.
#           </div>
#         </div>
#       </body>
#     </html>
#     """


# # ── Send / Preview ────────────────────────────────────────────────────────────

# def preview_email(subject: str, html_body: str) -> str:
#     fd, path = tempfile.mkstemp(suffix=".html", prefix="mtn_quantrisk_")
#     with os.fdopen(fd, "w", encoding="utf-8") as f:
#         f.write(html_body)
#     webbrowser.open(f"file://{path}")
#     logger.info(f"[PREVIEW] Opened email in browser: {path}")
#     logger.info(f"[PREVIEW] Subject: {subject}")
#     return path


# def send_email(subject: str, html_body: str, to: list[str], cc: list[str] | None = None, preview: bool = False) -> bool:
#     from ..config.email_config import SEND_EMAILS, VERBOSE

#     if preview:
#         preview_email(subject, html_body)
#         return True

#     if not SEND_EMAILS:
#         if VERBOSE:
#             logger.info(f"[DRY RUN] Subject: {subject}")
#             logger.info(f"  To: {', '.join(to)}")
#             if cc:
#                 logger.info(f"  Cc: {', '.join(cc)}")
#         return False

#     try:
#         outlook = _get_outlook()
#         mail = outlook.CreateItem(0)
#         mail.Subject = subject
#         mail.BodyFormat = 2
#         mail.HTMLBody = html_body
#         mail.To = ";".join(to)
#         if cc:
#             mail.CC = ";".join(cc)
#         mail.Send()
#         if VERBOSE:
#             logger.info(f"[SENT] {subject} → {', '.join(to)}")
#         return True
#     except Exception as e:
#         logger.error(f"Failed to send '{subject}': {e}")
#         return False






"""
================================================================================
MTN QuantRisk - EMAIL SERVICE
================================================================================
Handles Outlook COM automation (Windows) and browser preview (Mac).
Automatically uses the active Outlook desktop profile without storing passwords.
================================================================================
"""
from __future__ import annotations

import csv
import os
import logging
import tempfile
import webbrowser
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parents[2]


# ── Outlook Connection (Windows only) ─────────────────────────────────────────

def _get_outlook():
    """Return an initialized Outlook Application object."""
    try:
        import win32com.client as win32
        return win32.Dispatch("Outlook.Application")
    except ImportError:
        raise RuntimeError("pywin32 not installed. On Windows, run: pip install pywin32")
    except Exception as e:
        raise RuntimeError(f"Failed to initialize Outlook. Make sure Outlook is installed and open: {e}")


# ── Sent Tracking ─────────────────────────────────────────────────────────────

def load_sent_ids(log_path: str) -> set[str]:
    full_path = BACKEND_ROOT / log_path
    if not full_path.exists():
        return set()
    ids = set()
    with full_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        next(reader, None)
        for row in reader:
            if row:
                ids.add(row[0])
    return ids


def mark_sent(log_path: str, record_ids: Iterable[str], recipients: str) -> None:
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


# ── Dark Theme CSS ────────────────────────────────────────────────────────────

_EMAIL_CSS = """
<style>
  body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #e0ddd8; background: #0a0a14; margin: 0; padding: 20px; }
  .container { max-width: 720px; margin: 0 auto; background: #12121e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.07); }
  .header-news { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 28px 32px; border-bottom: 2px solid #FFD000; }
  .header-alert { background: linear-gradient(135deg, #1a0a0a 0%, #2d1010 100%); padding: 28px 32px; border-bottom: 2px solid #ef4444; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #FFD000; letter-spacing: -0.3px; }
  .header-alert h1 { color: #ef4444; }
  .header .subtitle { margin: 6px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.45); font-family: 'Courier New', monospace; text-transform: uppercase; letter-spacing: 1px; }
  .content { padding: 28px 32px; }
  .article { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 18px; margin-bottom: 14px; }
  .article-title { font-size: 14px; font-weight: 600; color: #ffffff; margin: 0 0 8px 0; line-height: 1.45; }
  .article-title a { color: #FFD000; text-decoration: none; }
  .article-title a:hover { text-decoration: underline; }
  .article-meta { font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 10px; font-family: 'Courier New', monospace; }
  .article-meta span { margin-right: 12px; }
  .summary-box { background: rgba(255,208,0,0.05); border-left: 3px solid rgba(255,208,0,0.4); border-radius: 0 8px 8px 0; padding: 12px 14px; margin: 10px 0; }
  .summary-label { font-size: 10px; font-family: 'Courier New', monospace; text-transform: uppercase; letter-spacing: 1px; color: #FFD000; margin-bottom: 4px; font-weight: 700; }
  .summary-text { font-size: 12px; color: rgba(255,255,255,0.75); line-height: 1.6; }
  .badges { margin-top: 10px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; margin-right: 5px; margin-bottom: 5px; font-family: 'Courier New', monospace; }
  
  /* Alert Tiers */
  .badge-critical { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
  .badge-warning  { background: rgba(249,115,22,0.15); color: #f97316; border: 1px solid rgba(249,115,22,0.3); }
  .badge-watch    { background: rgba(250,204,21,0.15); color: #facc15; border: 1px solid rgba(250,204,21,0.3); }
  
  /* Category Styling */
  .badge-strategic    { background: rgba(248,113,113,0.15); color: #f87171; border: 1px solid rgba(248,113,113,0.3); }
  .badge-governance   { background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3); }
  .badge-financial    { background: rgba(250,204,21,0.15);  color: #facc15; border: 1px solid rgba(250,204,21,0.3); }
  .badge-technology   { background: rgba(96,165,250,0.15);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.3); }
  .badge-operational  { background: rgba(251,146,60,0.15);  color: #fb923c; border: 1px solid rgba(251,146,60,0.3); }
  .badge-external     { background: rgba(244,114,182,0.15);  color: #f472b6; border: 1px solid rgba(244,114,182,0.3); }
  .badge-other        { background: rgba(156,163,175,0.15);  color: #9ca3af; border: 1px solid rgba(156,163,175,0.3); }

  /* Subcategory & Stats */
  .badge-subcat       { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.65); border: 1px solid rgba(255,255,255,0.12); }
  .badge-severity     { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.1); }
  .badge-relevance    { background: rgba(96,165,250,0.15); color: #60a5fa; border: 1px solid rgba(96,165,250,0.3); }

  /* Sentiments */
  .badge-sent-negative { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
  .badge-sent-neutral  { background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3); }
  .badge-sent-positive { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }

  .read-more { display: inline-block; margin-top: 10px; padding: 7px 16px; background: rgba(255,208,0,0.1); border: 1px solid rgba(255,208,0,0.3); border-radius: 8px; color: #FFD000; font-size: 11px; font-weight: 600; text-decoration: none; font-family: 'Courier New', monospace; }
  .read-more:hover { background: rgba(255,208,0,0.2); }
  .footer { background: rgba(255,255,255,0.02); padding: 18px 32px; font-size: 11px; color: rgba(255,255,255,0.3); text-align: center; border-top: 1px solid rgba(255,255,255,0.06); font-family: 'Courier New', monospace; }
  .no-items { padding: 40px; text-align: center; color: rgba(255,255,255,0.3); font-size: 13px; }
</style>
"""


def _tier_badge(tier: str | None) -> str:
    if not tier:
        return ""
    return f'<span class="badge badge-{tier.lower()}">{tier.upper()}</span>'


def _relevance_badge(relevance: float | None) -> str:
    if relevance is None:
        return ""
    return f'<span class="badge badge-relevance">MTN {int(relevance * 100)}%</span>'


def _severity_badge(severity: float | None) -> str:
    if severity is None:
        return ""
    return f'<span class="badge badge-severity">Severity {severity:.1f}/10</span>'


def _category_badge(category: str | None) -> str:
    if not category:
        return ""
    cat = category.lower().strip()
    return f'<span class="badge badge-{cat}">{cat.capitalize()}</span>'


def _subcategory_badge(subcategory: str | None) -> str:
    if not subcategory:
        return ""
    clean_sub = subcategory.replace(r"^\d+\s*-\s*", "").strip()
    if not clean_sub or clean_sub.lower() == "other":
        return ""
    return f'<span class="badge badge-subcat">{clean_sub}</span>'


def _sentiment_badge(sentiment: str | None) -> str:
    if not sentiment:
        return ""
    sent = sentiment.lower().strip()
    return f'<span class="badge badge-sent-{sent}">{sent.capitalize()}</span>'


def _fmt_datetime(iso: str | None) -> str:
    if not iso:
        return "—"
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%d %b %Y · %H:%M GMT")
    except Exception:
        return iso


# ── NEWS DIGEST HTML ──────────────────────────────────────────────────────────

def render_news_digest_html(category_label: str, articles: list[dict]) -> str:
    now = datetime.now().strftime("%A, %d %B %Y · %H:%M GMT")

    if not articles:
        articles_html = '<div class="no-items">No new high-relevance articles in this category today.</div>'
    else:
        parts = []
        for i, a in enumerate(articles, 1):
            summary = a.get("summary") or "Summary not available"
            parts.append(f"""
            <div class="article">
              <div class="article-title">
                <a href="{a.get('url', '#')}">{i}. {a.get('title', 'Untitled')}</a>
              </div>
              <div class="article-meta">
                <span>{a.get('source_name') or 'Unknown'}</span>
                <span>·</span>
                <span>{_fmt_datetime(a.get('published_at'))}</span>
              </div>
              <div class="summary-box">
                <div class="summary-label">🧠 AI Risk Summary & MTN Impact</div>
                <div class="summary-text">{summary}</div>
              </div>
              <div class="badges">
                {_tier_badge(a.get('alert_tier'))}
                {_category_badge(a.get('category'))}
                {_subcategory_badge(a.get('subcategory'))}
                {_sentiment_badge(a.get('sentiment'))}
                {_relevance_badge(a.get('mtn_relevance'))}
                {_severity_badge(a.get('severity'))}
              </div>
              <a href="{a.get('url', '#')}" class="read-more" target="_blank">→ Read Full Article</a>
            </div>
            """)
        articles_html = "".join(parts)

    return f"""
    <html>
      <head>{_EMAIL_CSS}</head>
      <body>
        <div class="container">
          <div class="header-news header">
            <h1>📡 {category_label} Risk — Daily Intelligence Briefing</h1>
            <div class="subtitle">MTN QuantRisk · {now}</div>
          </div>
          <div class="content">
            {articles_html}
          </div>
          <div class="footer">
            MTN QuantRisk Automated Intelligence · {category_label} Department Distribution List<br>
            To update your preferences, contact the QuantRisk admin team.
          </div>
        </div>
      </body>
    </html>
    """


# ── ALERT NOTIFICATION HTML ───────────────────────────────────────────────────

def render_alert_html(alerts: list[dict]) -> str:
    now = datetime.now().strftime("%A, %d %B %Y · %H:%M GMT")

    if not alerts:
        alerts_html = '<div class="no-items">No new alerts at this time.</div>'
    else:
        parts = []
        for a in alerts:
            impact = a.get("impact_ghs_mid")
            impact_str = f"GHS {impact:.1f}m" if impact else "—"
            summary = a.get("summary") or "Summary not available"
            article_url = a.get("article_url") or "#"
            parts.append(f"""
            <div class="article" style="border-left: 3px solid {'#ef4444' if a.get('tier') == 'Critical' else '#f97316'};">
              <div class="article-title">
                <a href="{article_url}">{a.get('headline', 'Untitled')}</a>
              </div>
              <div class="article-meta">
                <span>{a.get('source_name') or 'Unknown'}</span>
                <span>·</span>
                <span>{_fmt_datetime(a.get('created_at'))}</span>
              </div>
              <div class="summary-box">
                <div class="summary-label">🧠 AI Risk Summary & MTN Impact</div>
                <div class="summary-text">{summary}</div>
              </div>
              <div class="badges">
                {_tier_badge(a.get('tier'))}
                {_category_badge(a.get('category'))}
                {_subcategory_badge(a.get('subcategory'))}
                {_sentiment_badge(a.get('sentiment'))}
                {_relevance_badge(a.get('mtn_relevance'))}
                {_severity_badge(a.get('severity'))}
                <span class="badge badge-severity">Impact {impact_str}</span>
              </div>
              <a href="{article_url}" class="read-more" target="_blank">→ Read Full Article</a>
            </div>
            """)
        alerts_html = "".join(parts)

    return f"""
    <html>
      <head>{_EMAIL_CSS}</head>
      <body>
        <div class="container">
          <div class="header-alert header">
            <h1>🚨 Immediate Action Required — Risk Alert Notification</h1>
            <div class="subtitle" style="color: rgba(239,68,68,0.6);">MTN QuantRisk · {now}</div>
          </div>
          <div class="content">
            {alerts_html}
          </div>
          <div class="footer">
            MTN QuantRisk Automated Alert System · Please acknowledge on the platform.<br>
            To update your preferences, contact the QuantRisk admin team.
          </div>
        </div>
      </body>
    </html>
    """


# ── Send / Preview ────────────────────────────────────────────────────────────

def preview_email(subject: str, html_body: str) -> str:
    fd, path = tempfile.mkstemp(suffix=".html", prefix="mtn_quantrisk_")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(html_body)
    webbrowser.open(f"file://{path}")
    logger.info(f"[PREVIEW] Opened email in browser: {path}")
    logger.info(f"[PREVIEW] Subject: {subject}")
    return path


def send_email(subject: str, html_body: str, to: list[str], cc: list[str] | None = None, preview: bool = False) -> bool:
    from ..config.email_config import SEND_EMAILS, VERBOSE

    if preview:
        preview_email(subject, html_body)
        return True

    if not SEND_EMAILS:
        if VERBOSE:
            logger.info(f"[DRY RUN] Subject: {subject}")
            logger.info(f"  To: {', '.join(to)}")
            if cc:
                logger.info(f"  Cc: {', '.join(cc)}")
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
            logger.info(f"[SENT via Outlook] {subject} → {', '.join(to)}")
        return True
    except Exception as e:
        logger.error(f"Failed to send '{subject}': {e}")
        return False