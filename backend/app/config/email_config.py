"""
================================================================================
MTN QuantRisk - EMAIL CONFIGURATION
================================================================================
All email recipients and thresholds are configured here.
No code changes needed to update the mailing lists — just edit this file.

To add/remove people for a category or tier:
  1. Open this file
  2. Edit the list e.g. "financial": ["a@mtn.com", "b@mtn.com"]
  3. Save and re-run the scheduler script
================================================================================
"""

# ── 1. NEWS FEED DIGEST RECIPIENTS ─────────────────────────────────────────────
# For each risk category, list the team members who should receive that digest.
# Only articles with mtn_relevance above NEWS_MIN_MTN_RELEVANCE will be included.
# Only the top NEWS_TOP_N by relevance will be sent per category.
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

# Minimum MTN relevance score (0.0–1.0) to include an article in the news digest
NEWS_MIN_MTN_RELEVANCE = 0.50

# Maximum number of top articles to include per category (highest relevance first)
NEWS_TOP_N = 10


# ── 2. RISK ALERT NOTIFICATION RECIPIENTS ──────────────────────────────────────
# These recipients receive ALL Warning + Critical alerts (across every category).
ALERT_RECIPIENTS = {
    "to":  ["David.Hadjor@mtn.com", "Yaw.Asiedu-Danquah@mtn.com"],
    "cc":  ["marvin.alamu@mtn.com"],
}

# Which alert tiers to notify on
ALERT_TIERS_TO_SEND = ["Warning", "Critical"]


# ── 3. GENERAL SENDER SETTINGS ─────────────────────────────────────────────────
EMAIL_SUBJECT_PREFIX_NEWS  = "[MTN QuantRisk] News Digest"
EMAIL_SUBJECT_PREFIX_ALERT = "[MTN QuantRisk] Risk Alert"

# Where to store sent tracking logs (relative to backend root)
SENT_NEWS_LOG   = "app/logs/sent_news.csv"
SENT_ALERTS_LOG = "app/logs/sent_alerts.csv"

# Set to True to send emails; False to only preview (dry-run)
SEND_EMAILS = True

# Set to True to print debug info to console
VERBOSE = True