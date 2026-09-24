"""
================================================================================
MTN QuantRisk - EMAIL SERVICE (Outlook Bulletproof Table Architecture)
================================================================================
Uses pure MSO table formatting with explicit bgcolor & inline CSS so Microsoft 
Word / Outlook Desktop renders dark mode, vibrant badges, and buttons accurately.
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
from collections import defaultdict

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parents[2]


# ── Outlook Connection (Windows only) ─────────────────────────────────────────

def _get_outlook():
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


# ── Outlook-Proof Badge Helpers (Inline Tables) ──────────────────────────────

def _badge(bg: str, border: str, text_color: str, text: str) -> str:
    """Renders an Outlook-bulletproof badge using an inline table with bgcolor."""
    return f"""
    <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="display:inline-table; margin-right:4px; margin-bottom:4px; vertical-align:middle;">
      <tr>
        <td bgcolor="{bg}" style="background-color:{bg}; border:1px solid {border}; border-radius:12px; padding:3px 9px; font-family:'Segoe UI', Arial, sans-serif; font-size:10px; font-weight:bold; color:{text_color}; text-transform:uppercase; mso-line-height-rule:exactly; line-height:12px;">
          {text}
        </td>
      </tr>
    </table>
    """


def _tier_badge(tier: str | None) -> str:
    if not tier:
        return ""
    t = tier.lower()
    if t == "critical":
        return _badge("#3a1010", "#801e1e", "#ff5555", "CRITICAL")
    if t == "warning":
        return _badge("#3d1e05", "#8a3f05", "#ff8822", "WARNING")
    return _badge("#383005", "#7a6505", "#ffd000", "WATCH")


def _category_badge(category: str | None) -> str:
    if not category:
        return ""
    cat = category.lower().strip()
    colors = {
        "strategic":   ("#3a1010", "#801e1e", "#ff6b6b"),
        "governance":  ("#202530", "#3d465c", "#a0aec0"),
        "financial":   ("#383005", "#7a6505", "#ffd000"),
        "technology":  ("#0d244a", "#1b4382", "#60a5fa"),
        "operational": ("#38200d", "#7a4114", "#fb923c"),
        "external":    ("#381028", "#781e55", "#f472b6"),
        "other":       ("#22242a", "#40444f", "#9ca3af"),
    }
    bg, border, text = colors.get(cat, ("#22242a", "#40444f", "#9ca3af"))
    return _badge(bg, border, text, cat.capitalize())


def _subcategory_badge(subcategory: str | None) -> str:
    if not subcategory:
        return ""
    clean_sub = subcategory.replace(r"^\d+\s*-\s*", "").strip()
    if not clean_sub or clean_sub.lower() == "other":
        return ""
    return _badge("#222235", "#3a3a55", "#c5c5dc", clean_sub)


def _sentiment_badge(sentiment: str | None) -> str:
    if not sentiment:
        return ""
    sent = sentiment.lower().strip()
    if sent == "negative":
        return _badge("#3a1010", "#801e1e", "#ff5555", "Negative")
    if sent == "positive":
        return _badge("#082e16", "#125e2e", "#34d399", "Positive")
    return _badge("#202530", "#3d465c", "#94a3b8", "Neutral")


def _relevance_badge(relevance: float | None) -> str:
    if relevance is None:
        return ""
    return _badge("#0d244a", "#1b4382", "#60a5fa", f"MTN {int(relevance * 100)}%")


def _severity_badge(severity: float | None) -> str:
    if severity is None:
        return ""
    return _badge("#222235", "#3a3a55", "#a0a0b8", f"Severity {severity:.1f}/10")


def _impact_badge(impact: float | None) -> str:
    if not impact:
        return ""
    return _badge("#383005", "#7a6505", "#ffd000", f"Impact GHS {impact:.1f}m")


def _fmt_datetime(iso: str | None) -> str:
    if not iso:
        return "—"
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%d %b %Y · %H:%M GMT")
    except Exception:
        return iso


# ── ARTICLE CARD RENDERER (SHARED ELEMENT) ───────────────────────────────────

def _render_single_article_row(i: int, a: dict) -> str:
    summary = a.get("summary") or "Summary not available"
    url = a.get("url", "#")
    badges_html = (
        _tier_badge(a.get("alert_tier")) +
        _category_badge(a.get("category")) +
        _subcategory_badge(a.get("subcategory")) +
        _sentiment_badge(a.get("sentiment")) +
        _relevance_badge(a.get("mtn_relevance")) +
        _severity_badge(a.get("severity"))
    )

    return f"""
    <tr>
      <td style="padding-bottom: 16px;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#181826" style="background-color:#181826; border:1px solid #2d2d42; border-radius:12px;">
          <tr>
            <td style="padding: 20px;">
              
              <!-- Title -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-family:'Segoe UI', Arial, sans-serif; font-size:15px; font-weight:bold; line-height:22px;">
                    <a href="{url}" target="_blank" style="color:#FFD000; text-decoration:none;">{i}. {a.get('title', 'Untitled')}</a>
                  </td>
                </tr>
              </table>

              <!-- Meta -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top:6px; margin-bottom:12px;">
                <tr>
                  <td style="font-family:'Courier New', monospace; font-size:11px; color:#7e7e94;">
                    {a.get('source_name') or 'Unknown Source'} &nbsp;·&nbsp; {_fmt_datetime(a.get('published_at'))}
                  </td>
                </tr>
              </table>

              <!-- AI Summary Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#241e06" style="background-color:#241e06; border-left:4px solid #FFD000; border-radius:0 8px 8px 0; margin-bottom:14px;">
                <tr>
                  <td style="padding: 12px 14px;">
                    <div style="font-family:'Courier New', monospace; font-size:10px; font-weight:bold; color:#FFD000; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">
                      🧠 AI Risk Summary & MTN Impact
                    </div>
                    <div style="font-family:'Segoe UI', Arial, sans-serif; font-size:12px; color:#e0ded8; line-height:18px;">
                      {summary}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Badges -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px;">
                <tr>
                  <td>
                    {badges_html}
                  </td>
                </tr>
              </table>

              <!-- Read Full Article Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td bgcolor="#2e2607" style="background-color:#2e2607; border:1px solid #FFD000; border-radius:6px; padding:7px 16px; text-align:center;">
                    <a href="{url}" target="_blank" style="font-family:'Courier New', monospace; font-size:11px; font-weight:bold; color:#FFD000; text-decoration:none; display:inline-block;">
                      → Read Full Article
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
    """


# ── ALERT CARD RENDERER (SHARED ELEMENT) ─────────────────────────────────────

def _render_single_alert_row(a: dict) -> str:
    summary = a.get("summary") or "Summary not available"
    url = a.get("article_url") or "#"
    tier = a.get("tier", "Warning")
    card_border_left = "#ef4444" if tier == "Critical" else "#f97316"
    
    badges_html = (
        _tier_badge(tier) +
        _category_badge(a.get("category")) +
        _subcategory_badge(a.get("subcategory")) +
        _sentiment_badge(a.get("sentiment")) +
        _relevance_badge(a.get("mtn_relevance")) +
        _severity_badge(a.get("severity")) +
        _impact_badge(a.get("impact_ghs_mid"))
    )

    return f"""
    <tr>
      <td style="padding-bottom: 16px;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#181826" style="background-color:#181826; border:1px solid #2d2d42; border-left:4px solid {card_border_left}; border-radius:12px;">
          <tr>
            <td style="padding: 20px;">
              
              <!-- Title -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-family:'Segoe UI', Arial, sans-serif; font-size:15px; font-weight:bold; line-height:22px;">
                    <a href="{url}" target="_blank" style="color:#ffffff; text-decoration:none;">{a.get('headline', 'Untitled Alert')}</a>
                  </td>
                </tr>
              </table>

              <!-- Meta -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top:6px; margin-bottom:12px;">
                <tr>
                  <td style="font-family:'Courier New', monospace; font-size:11px; color:#7e7e94;">
                    {a.get('source_name') or 'Unknown Source'} &nbsp;·&nbsp; {_fmt_datetime(a.get('created_at'))}
                  </td>
                </tr>
              </table>

              <!-- AI Summary Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#241e06" style="background-color:#241e06; border-left:4px solid #FFD000; border-radius:0 8px 8px 0; margin-bottom:14px;">
                <tr>
                  <td style="padding: 12px 14px;">
                    <div style="font-family:'Courier New', monospace; font-size:10px; font-weight:bold; color:#FFD000; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">
                      🧠 AI Risk Summary & MTN Impact
                    </div>
                    <div style="font-family:'Segoe UI', Arial, sans-serif; font-size:12px; color:#e0ded8; line-height:18px;">
                      {summary}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Badges -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px;">
                <tr>
                  <td>
                    {badges_html}
                  </td>
                </tr>
              </table>

              <!-- Read Full Article Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td bgcolor="#2e2607" style="background-color:#2e2607; border:1px solid #FFD000; border-radius:6px; padding:7px 16px; text-align:center;">
                    <a href="{url}" target="_blank" style="font-family:'Courier New', monospace; font-size:11px; font-weight:bold; color:#FFD000; text-decoration:none; display:inline-block;">
                      → Read Full Article
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
    """


# ── SECTION HEADER FOR CONSOLIDATED LAYOUTS ──────────────────────────────────

def _render_section_divider(category_name: str) -> str:
    return f"""
    <tr>
      <td style="padding: 15px 10px 10px 10px; font-family:'Segoe UI', Arial, sans-serif; font-size:14px; font-weight:bold; color:#FFD000; text-transform:uppercase; letter-spacing:1px;">
        📂 Category: {category_name}
      </td>
    </tr>
    """


# ── NEWS DIGEST HTML ──────────────────────────────────────────────────────────

def render_news_digest_html(category_label: str, articles: list[dict]) -> str:
    now = datetime.now().strftime("%A, %d %B %Y · %H:%M GMT")

    articles_cells = []
    if not articles:
        articles_cells.append("""
        <tr>
          <td bgcolor="#181826" style="background-color:#181826; border:1px solid #2c2c3e; border-radius:10px; padding:30px; text-align:center; font-family:'Segoe UI', Arial, sans-serif; font-size:13px; color:#88889a;">
            No new high-relevance articles in this category within the past 10 days.
          </td>
        </tr>
        """)
    else:
        for i, a in enumerate(articles, 1):
            articles_cells.append(_render_single_article_row(i, a))

    content_table = "".join(articles_cells)

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{category_label} - Daily Intelligence Briefing</title>
      <style>
        @media screen and (max-width: 640px) {{
          .main-container {{
            width: 100% !important;
            border-radius: 8px !important;
          }}
          .header-padding {{
            padding: 20px 16px !important;
          }}
          .content-padding {{
            padding: 20px 16px 10px 16px !important;
          }}
          .footer-padding {{
            padding: 16px 16px !important;
          }}
        }}
      </style>
    </head>
    <body bgcolor="#0a0a14" style="background-color:#0a0a14; margin:0; padding:10px 0; font-family:'Segoe UI', Arial, sans-serif; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
      
      <!-- Outer Centering Table -->
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#0a0a14" style="background-color:#0a0a14; table-layout:fixed;">
        <tr>
          <td align="center" style="padding: 0 10px;">
            
            <!-- Main Email Container -->
            <table class="main-container" role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#12121e" style="background-color:#12121e; border:1px solid #232338; border-radius:16px; overflow:hidden; max-width:680px; width:100%;">
              
              <!-- Header -->
              <tr>
                <td class="header-padding" bgcolor="#18182c" style="background-color:#18182c; border-bottom:3px solid #FFD000; padding:26px 30px;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="font-family:'Segoe UI', Arial, sans-serif; font-size:20px; font-weight:bold; color:#FFD000; letter-spacing:-0.3px;">
                        📡 {category_label} - Daily Intelligence Briefing
                      </td>
                    </tr>
                    <tr>
                      <td style="font-family:'Courier New', monospace; font-size:11px; color:#88889a; text-transform:uppercase; letter-spacing:1px; padding-top:6px;">
                        MTN QuantRisk &nbsp;·&nbsp; {now}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td class="content-padding" style="padding: 26px 30px 10px 30px;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    {content_table}
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td class="footer-padding" bgcolor="#0d0d17" style="background-color:#0d0d17; border-top:1px solid #232338; padding:20px 30px; text-align:center;">
                  <p style="margin:0; font-family:'Courier New', monospace; font-size:11px; color:#5a5a73; line-height:16px;">
                    MTN QuantRisk Automated Intelligence &nbsp;·&nbsp; {category_label} Distribution List<br>
                    Internal strictly confidential document for authorized recipients only.
                  </p>
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>

    </body>
    </html>
    """


# ── ALERT NOTIFICATION HTML ───────────────────────────────────────────────────

def render_alert_html(alerts: list[dict]) -> str:
    now = datetime.now().strftime("%A, %d %B %Y · %H:%M GMT")
    primary_cat = alerts[0]["category"].capitalize() if alerts else "Risk"

    alerts_cells = []
    if not alerts:
        alerts_cells.append("""
        <tr>
          <td bgcolor="#181826" style="background-color:#181826; border:1px solid #2c2c3e; border-radius:10px; padding:30px; text-align:center; font-family:'Segoe UI', Arial, sans-serif; font-size:13px; color:#88889a;">
            No new Critical or Warning alerts within the past 10 days.
          </td>
        </tr>
        """)
    else:
        for a in alerts:
            alerts_cells.append(_render_single_alert_row(a))

    content_table = "".join(alerts_cells)

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{primary_cat} Risk - Daily Intelligence Briefing</title>
      <style>
        @media screen and (max-width: 640px) {{
          .main-container {{
            width: 100% !important;
            border-radius: 8px !important;
          }}
          .header-padding {{
            padding: 20px 16px !important;
          }}
          .content-padding {{
            padding: 20px 16px 10px 16px !important;
          }}
          .footer-padding {{
            padding: 16px 16px !important;
          }}
        }}
      </style>
    </head>
    <body bgcolor="#0a0a14" style="background-color:#0a0a14; margin:0; padding:10px 0; font-family:'Segoe UI', Arial, sans-serif; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
      
      <!-- Outer Centering Table -->
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#0a0a14" style="background-color:#0a0a14; table-layout:fixed;">
        <tr>
          <td align="center" style="padding: 0 10px;">
            
            <!-- Main Email Container -->
            <table class="main-container" role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#12121e" style="background-color:#12121e; border:1px solid #232338; border-radius:16px; overflow:hidden; max-width:680px; width:100%;">
              
              <!-- Header -->
              <tr>
                <td class="header-padding" bgcolor="#211010" style="background-color:#211010; border-bottom:3px solid #ef4444; padding:26px 30px;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="font-family:'Segoe UI', Arial, sans-serif; font-size:20px; font-weight:bold; color:#ef4444; letter-spacing:-0.3px;">
                        🚨 {primary_cat} Risk - Daily Intelligence Briefing
                      </td>
                    </tr>
                    <tr>
                      <td style="font-family:'Courier New', monospace; font-size:11px; color:#a36868; text-transform:uppercase; letter-spacing:1px; padding-top:6px;">
                        MTN QuantRisk &nbsp;·&nbsp; {now}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td class="content-padding" style="padding: 26px 30px 10px 30px;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    {content_table}
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td class="footer-padding" bgcolor="#0d0d17" style="background-color:#0d0d17; border-top:1px solid #232338; padding:20px 30px; text-align:center;">
                  <p style="margin:0; font-family:'Courier New', monospace; font-size:11px; color:#5a5a73; line-height:16px;">
                    MTN QuantRisk Automated Alert System &nbsp;·&nbsp; Please acknowledge on the platform.<br>
                    Internal strictly confidential document for authorized recipients only.
                  </p>
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>

    </body>
    </html>
    """


# ── CONSOLIDATED NEWS DIGEST (HEAD OF RISKS) ──────────────────────────────────

def render_consolidated_news_digest_html(articles: list[dict]) -> str:
    now = datetime.now().strftime("%A, %d %B %Y · %H:%M GMT")

    # Group articles by category
    grouped = defaultdict(list)
    for a in articles:
        cat = a.get("category", "Other") or "Other"
        grouped[cat.strip().capitalize()].append(a)

    articles_cells = []
    if not articles:
        articles_cells.append("""
        <tr>
          <td bgcolor="#181826" style="background-color:#181826; border:1px solid #2c2c3e; border-radius:10px; padding:30px; text-align:center; font-family:'Segoe UI', Arial, sans-serif; font-size:13px; color:#88889a;">
            No new articles distributed in today's cycle.
          </td>
        </tr>
        """)
    else:
        count = 1
        for cat, cat_articles in sorted(grouped.items()):
            articles_cells.append(_render_section_divider(cat))
            for a in cat_articles:
                articles_cells.append(_render_single_article_row(count, a))
                count += 1

    content_table = "".join(articles_cells)

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MTN QuantRisk Consolidated Intelligence Briefing</title>
      <style>
        @media screen and (max-width: 640px) {{
          .main-container {{
            width: 100% !important;
            border-radius: 8px !important;
          }}
          .header-padding {{
            padding: 20px 16px !important;
          }}
          .content-padding {{
            padding: 20px 16px 10px 16px !important;
          }}
          .footer-padding {{
            padding: 16px 16px !important;
          }}
        }}
      </style>
    </head>
    <body bgcolor="#0a0a14" style="background-color:#0a0a14; margin:0; padding:10px 0; font-family:'Segoe UI', Arial, sans-serif; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
      
      <!-- Outer Centering Table -->
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#0a0a14" style="background-color:#0a0a14; table-layout:fixed;">
        <tr>
          <td align="center" style="padding: 0 10px;">
            
            <!-- Main Email Container -->
            <table class="main-container" role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#12121e" style="background-color:#12121e; border:1px solid #232338; border-radius:16px; overflow:hidden; max-width:680px; width:100%;">
              
              <!-- Header -->
              <tr>
                <td class="header-padding" bgcolor="#18182c" style="background-color:#18182c; border-bottom:3px solid #FFD000; padding:26px 30px;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="font-family:'Segoe UI', Arial, sans-serif; font-size:18px; font-weight:bold; color:#FFD000; letter-spacing:-0.3px;">
                        📡 MTN QuantRisk Consolidated Briefing
                      </td>
                    </tr>
                    <tr>
                      <td style="font-family:'Courier New', monospace; font-size:11px; color:#88889a; text-transform:uppercase; letter-spacing:1px; padding-top:6px;">
                        Head of All Risks Portfolio &nbsp;·&nbsp; {now}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td class="content-padding" style="padding: 26px 30px 10px 30px;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    {content_table}
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td class="footer-padding" bgcolor="#0d0d17" style="background-color:#0d0d17; border-top:1px solid #232338; padding:20px 30px; text-align:center;">
                  <p style="margin:0; font-family:'Courier New', monospace; font-size:11px; color:#5a5a73; line-height:16px;">
                    MTN QuantRisk Automated Intelligence (Consolidated Mode)<br>
                    Strictly Confidential · Dedicated Distribution Line
                  </p>
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>

    </body>
    </html>
    """


# ── CONSOLIDATED ALERTS (HEAD OF RISKS) ────────────────────────────────────────

def render_consolidated_alert_html(alerts: list[dict]) -> str:
    now = datetime.now().strftime("%A, %d %B %Y · %H:%M GMT")

    # Group alerts by category
    grouped = defaultdict(list)
    for a in alerts:
        cat = a.get("category", "Risk") or "Risk"
        grouped[cat.strip().capitalize()].append(a)

    alerts_cells = []
    if not alerts:
        alerts_cells.append("""
        <tr>
          <td bgcolor="#181826" style="background-color:#181826; border:1px solid #2c2c3e; border-radius:10px; padding:30px; text-align:center; font-family:'Segoe UI', Arial, sans-serif; font-size:13px; color:#88889a;">
            No new Critical or Warning alerts active today.
          </td>
        </tr>
        """)
    else:
        for cat, cat_alerts in sorted(grouped.items()):
            alerts_cells.append(_render_section_divider(cat))
            for a in cat_alerts:
                alerts_cells.append(_render_single_alert_row(a))

    content_table = "".join(alerts_cells)

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MTN QuantRisk Consolidated Alerts</title>
      <style>
        @media screen and (max-width: 640px) {{
          .main-container {{
            width: 100% !important;
            border-radius: 8px !important;
          }}
          .header-padding {{
            padding: 20px 16px !important;
          }}
          .content-padding {{
            padding: 20px 16px 10px 16px !important;
          }}
          .footer-padding {{
            padding: 16px 16px !important;
          }}
        }}
      </style>
    </head>
    <body bgcolor="#0a0a14" style="background-color:#0a0a14; margin:0; padding:10px 0; font-family:'Segoe UI', Arial, sans-serif; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
      
      <!-- Outer Centering Table -->
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#0a0a14" style="background-color:#0a0a14; table-layout:fixed;">
        <tr>
          <td align="center" style="padding: 0 10px;">
            
            <!-- Main Email Container -->
            <table class="main-container" role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#12121e" style="background-color:#12121e; border:1px solid #232338; border-radius:16px; overflow:hidden; max-width:680px; width:100%;">
              
              <!-- Header -->
              <tr>
                <td class="header-padding" bgcolor="#211010" style="background-color:#211010; border-bottom:3px solid #ef4444; padding:26px 30px;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="font-family:'Segoe UI', Arial, sans-serif; font-size:18px; font-weight:bold; color:#ef4444; letter-spacing:-0.3px;">
                        🚨 MTN QuantRisk Consolidated Active Alerts
                      </td>
                    </tr>
                    <tr>
                      <td style="font-family:'Courier New', monospace; font-size:11px; color:#a36868; text-transform:uppercase; letter-spacing:1px; padding-top:6px;">
                        Head of All Risks Portfolio &nbsp;·&nbsp; {now}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td class="content-padding" style="padding: 26px 30px 10px 30px;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    {content_table}
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td class="footer-padding" bgcolor="#0d0d17" style="background-color:#0d0d17; border-top:1px solid #232338; padding:20px 30px; text-align:center;">
                  <p style="margin:0; font-family:'Courier New', monospace; font-size:11px; color:#5a5a73; line-height:16px;">
                    MTN QuantRisk Automated Alert System (Consolidated Mode)<br>
                    Strictly Confidential · Dedicated Distribution Line
                  </p>
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>

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
    from ..config.email_config import SEND_EMAILS, VERBOSE, SENDER_EMAIL

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

        # Explicit Sender selection
        if SENDER_EMAIL and SENDER_EMAIL.strip():
            matched_account = None
            for account in outlook.Session.Accounts:
                if account.SmtpAddress.lower() == SENDER_EMAIL.strip().lower():
                    matched_account = account
                    break
            
            if matched_account:
                mail.SendUsingAccount = matched_account
                if VERBOSE:
                    logger.info(f"[OUTLOOK] Forcing sender account: {matched_account.SmtpAddress}")
            else:
                logger.warning(f"[OUTLOOK] Could not find account matching SENDER_EMAIL: {SENDER_EMAIL}. Using default profile.")

        mail.Send()
        if VERBOSE:
            logger.info(f"[SENT via Outlook] {subject} → {', '.join(to)}")
        return True
    except Exception as e:
        logger.error(f"Failed to send '{subject}': {e}")
        return False