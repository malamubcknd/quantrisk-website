# """
# ================================================================================
# MTN QuantRisk - EMAIL CONFIGURATION
# ================================================================================
# All email recipients and thresholds are configured here.
# No code changes needed to update the mailing lists — just edit this file.
# ================================================================================
# """

# # ── 1. NEWS FEED DIGEST RECIPIENTS ─────────────────────────────────────────────
# NEWS_RECIPIENTS = {
#     "strategic": {
#         "to":  ["marvin.alamu@mtn.com"],
#         "cc":  ["marvin.alamu@mtn.com"],
#     },
#     "governance": {
#         "to":  ["marvin.alamu@mtn.com"],
#         "cc":  ["marvin.alamu@mtn.com"],
#     },
#     "financial": {
#         "to":  ["marvin.alamu@mtn.com"],
#         "cc":  ["marvin.alamu@mtn.com"],
#     },
#     "technology": {
#         "to":  ["marvin.alamu@mtn.com"],
#         "cc":  ["marvin.alamu@mtn.com"],
#     },
#     "operational": {
#         "to":  ["marvin.alamu@mtn.com"],
#         "cc":  ["marvin.alamu@mtn.com"],
#     },
#     "external": {
#         "to":  ["marvin.alamu@mtn.com"],
#         "cc":  ["marvin.alamu@mtn.com"],
#     },
# }

# # David.Hadjor@mtn.com
# # Yaw.Asiedu-Danquah@mtn.com

# NEWS_MIN_MTN_RELEVANCE = 0.50
# NEWS_TOP_N = 3  # Top 3 per category (recency + relevance + severity)

# # Max age cutoff for sending news or alerts (any items older than this are skipped)
# MAX_AGE_DAYS = 10  


# # ── 2. RISK ALERT NOTIFICATION RECIPIENTS ──────────────────────────────────────
# ALERT_RECIPIENTS = {
#     "to":  ["marvin.alamu@mtn.com"],
#     "cc":  ["marvin.alamu@mtn.com"],
# }

# ALERT_TIERS_TO_SEND = ["Warning", "Critical"]


# # ── 3. CATCHY SUBJECT LINES ───────────────────────────────────────────────────
# EMAIL_SUBJECT_NEWS  = "🔍 MTN QuantRisk — {category} Intelligence Briefing"
# EMAIL_SUBJECT_ALERT = "🚨 MTN QuantRisk — {critical} Critical & {warning} Warning Alerts Need Your Attention"

# SENT_NEWS_LOG   = "app/logs/sent_news.csv"
# SENT_ALERTS_LOG = "app/logs/sent_alerts.csv"

# SEND_EMAILS = True
# VERBOSE = True



"""
================================================================================
MTN QuantRisk - EMAIL CONFIGURATION
================================================================================
All email recipients, sender preferences, and thresholds are configured here.
================================================================================
"""

# ── 1. OUTLOOK SENDER PREFERENCE ──────────────────────────────────────────────
# If you have multiple accounts set up in your Outlook profile, input your work email here.
# Leave it as "" (empty string) to automatically use your default Outlook account.
SENDER_EMAIL = "marvin.alamu@mtn.com" 


# ── 2. NEWS FEED DIGEST RECIPIENTS ─────────────────────────────────────────────
NEWS_RECIPIENTS = {
    "strategic": {
        "to":  ["marvin.alamu@mtn.com"],
        "cc":  ["marvin.alamu@mtn.com"],
    },
    "governance": {
        "to":  ["marvin.alamu@mtn.com"],
        "cc":  ["marvin.alamu@mtn.com"],
    },
    "financial": {
        "to":  ["marvin.alamu@mtn.com"],
        "cc":  ["marvin.alamu@mtn.com"],
    },
    "technology": {
        "to":  ["marvin.alamu@mtn.com"],
        "cc":  ["marvin.alamu@mtn.com"],
    },
    "operational": {
        "to":  ["marvin.alamu@mtn.com"],
        "cc":  ["marvin.alamu@mtn.com"],
    },
    "external": {
        "to":  ["marvin.alamu@mtn.com"],
        "cc":  ["marvin.alamu@mtn.com"],
    },
}

NEWS_MIN_MTN_RELEVANCE = 0.50
NEWS_TOP_N = 3  # Top 3 per category (recency + relevance + severity)

# Max age cutoff for sending news or alerts (any items older than this are skipped)
MAX_AGE_DAYS = 10  


# ── 3. RISK ALERT NOTIFICATION RECIPIENTS ──────────────────────────────────────
ALERT_RECIPIENTS = {
    "to":  ["David.Hadjor@mtn.com", "Yaw.Asiedu-Danquah@mtn.com"],
    "cc":  ["marvin.alamu@mtn.com"],
}

ALERT_TIERS_TO_SEND = ["Warning", "Critical"]


# ── 4. CATCHY SUBJECT LINES ───────────────────────────────────────────────────
EMAIL_SUBJECT_NEWS  = "🔍 MTN QuantRisk — {category} - Daily Intelligence Briefing"
EMAIL_SUBJECT_ALERT = "🚨 MTN QuantRisk — {category} Risk - Daily Intelligence Briefing ({critical} Critical, {warning} Warning)"

SENT_NEWS_LOG   = "app/logs/sent_news.csv"
SENT_ALERTS_LOG = "app/logs/sent_alerts.csv"

SEND_EMAILS = True
VERBOSE = True