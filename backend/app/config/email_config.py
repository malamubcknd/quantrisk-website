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
 
 
# ── 2. NEWS FEED DIGEST RECIPIENTS (OPTIONAL) ──────────────────────────────────
# Risk categories pulled into the digests (always used for the Head of Risks email).
NEWS_CATEGORIES = ["strategic", "governance", "financial", "technology", "operational", "external"]

# Per-category team emails are OPTIONAL. Leave this as {} (or comment it out, or
# leave a category's "to" empty) and that category's team email is simply skipped —
# its articles still go into the consolidated Head of Risks digest.
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
        "cc":  [""],
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
 
NEWS_MIN_MTN_RELEVANCE = 0.80
NEWS_TOP_N = 1  # Top 2 per category (recency + relevance + severity)
 
# Max age cutoff for sending news or alerts (any items older than this are skipped)
MAX_AGE_DAYS = 5
 
 
# ── 3. RISK ALERT NOTIFICATION RECIPIENTS ──────────────────────────────────────
# ALERT_RECIPIENTS = {
#     "to":  ["David.Hadjor@mtn.com", "Yaw.Asiedu-Danquah@mtn.com", "Kwodwo.Filson@mtn.com","Boaz.Owiredu@mtn.com"],
#     "cc":  ["marvin.alamu@mtn.com"],
# }


 
# ALERT_RECIPIENTS = {
#     "to":  ["marvin.alamu@mtn.com"],
#     "cc":  [""],
# }
# OPTIONAL: if left empty (or commented out), the team alert email is skipped and
# alerts go only to HEAD_OF_RISKS_RECIPIENTS.
ALERT_RECIPIENTS = {"to": [], "cc": []}

ALERT_TIERS_TO_SEND = ["Warning", "Critical"]
 
 
# ── 4. HEAD OF ALL RISKS RECIPIENTS (CONSOLIDATED RECIPIENT) ───────────────────
# Receives aggregated news and alerts from all categories in a clean consolidated layout.
HEAD_OF_RISKS_RECIPIENTS = {
    "to":  ["Boaz.Owiredu@mtn.com","Kukua.AwoPratt@mtn.com","Joseph.Dogbe@mtn.com","Emmanuel.Nikoi@mtn.com","Foster.Kplomdo@mtn.com"
            ,"Benjamin.Kpodo@mtn.com","Kwodwo.Filson@mtn.com","Anthony.Takyi@mtn.com","Raynolds.Darkwah@mtn.com","Abena.AsantewaaSakyi@mtn.com","Vera.Amaning-Kwarteng@mtn.com"
            ,"Glory.Dzramedo@mtn.com","Dickson.Agalga@mtn.com","Linda.Asamoah@mtn.com"],
    "cc":  ["Risk_Compliance.GH@mtn.com"],
}
# HEAD_OF_RISKS_RECIPIENTS = {
#     "to":  ["marvin.alamu@mtn.com"],
#     "cc":  [],
# }
 
# ── 5. CATCHY SUBJECT LINES ───────────────────────────────────────────────────
EMAIL_SUBJECT_NEWS  = "🔍 MTN QuantRisk — {category} - Daily Intelligence Briefing"
EMAIL_SUBJECT_ALERT = "🚨 MTN QuantRisk — {category} Risk - Daily Intelligence Briefing ({critical} Critical, {warning} Warning)"
 
EMAIL_SUBJECT_CONSOLIDATED_NEWS  = "📡 MTN QuantRisk Consolidated — All Categories Daily Intelligence Briefing"
EMAIL_SUBJECT_CONSOLIDATED_ALERT = "🚨 MTN QuantRisk Consolidated — All Active Warning & Critical Alerts ({critical} Critical, {warning} Warning)"
 
SENT_NEWS_LOG   = "app/logs/sent_news.csv"
SENT_ALERTS_LOG = "app/logs/sent_alerts.csv"
 
SEND_EMAILS = True
VERBOSE = True