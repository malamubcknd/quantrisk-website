"""
================================================================================
MTN QuantRisk - EMAIL CONFIGURATION
================================================================================
All email recipients and thresholds are configured here.
No code changes needed to update the mailing lists — just edit this file.
================================================================================
"""

# ── 1. NEWS FEED DIGEST RECIPIENTS ─────────────────────────────────────────────
NEWS_RECIPIENTS = {
    "strategic": {
        "to":  ["David.Hadjor@mtn.com"],
        "cc":  ["marvin.alamu@mtn.com"],
    },
    "governance": {
        "to":  ["Yaw.Asiedu-Danquah@mtn.com"],
        "cc":  ["marvin.alamu@mtn.com"],
    },
    "financial": {
        "to":  ["David.Hadjor@mtn.com"],
        "cc":  ["marvin.alamu@mtn.com"],
    },
    "technology": {
        "to":  ["Yaw.Asiedu-Danquah@mtn.com"],
        "cc":  ["marvin.alamu@mtn.com"],
    },
    "operational": {
        "to":  ["David.Hadjor@mtn.com"],
        "cc":  ["marvin.alamu@mtn.com"],
    },
    "external": {
        "to":  ["Yaw.Asiedu-Danquah@mtn.com"],
        "cc":  ["marvin.alamu@mtn.com"],
    },
}

NEWS_MIN_MTN_RELEVANCE = 0.50
NEWS_TOP_N = 3  # Top 3 per category (recency + relevance + severity)

# Max age cutoff for sending news or alerts (any items older than this are skipped)
MAX_AGE_DAYS = 10  


# ── 2. RISK ALERT NOTIFICATION RECIPIENTS ──────────────────────────────────────
ALERT_RECIPIENTS = {
    "to":  ["David.Hadjor@mtn.com", "Yaw.Asiedu-Danquah@mtn.com"],
    "cc":  ["marvin.alamu@mtn.com"],
}

ALERT_TIERS_TO_SEND = ["Warning", "Critical"]


# ── 3. CATCHY SUBJECT LINES ───────────────────────────────────────────────────
EMAIL_SUBJECT_NEWS  = "🔍 MTN QuantRisk — {category} Intelligence Briefing"
EMAIL_SUBJECT_ALERT = "🚨 MTN QuantRisk — {critical} Critical & {warning} Warning Alerts Need Your Attention"

SENT_NEWS_LOG   = "app/logs/sent_news.csv"
SENT_ALERTS_LOG = "app/logs/sent_alerts.csv"

SEND_EMAILS = True
VERBOSE = True