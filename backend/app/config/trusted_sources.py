"""
================================================================================
MTN QuantRisk - TRUSTED (NON-NEGOTIABLE) GHANA SOURCES
================================================================================
The 14 regulator / industry sources that must always be monitored.

This file is the ONE place these sources are defined. It is imported by:
  - scraper_service.py  (to scrape them)
  - nlp_service.py      (so their articles are treated as inherently Ghana-focused)

Two kinds of source:
  TRUSTED_RSS_SOURCES  - sites with a working RSS/Atom feed (verified with
                         check_new_sources.py). Same logic as the existing feeds.
  TRUSTED_HTML_SOURCES - sites with NO feed. The scraper reads their news listing
                         pages and then each article page.

IMPORTANT: the "name" values are stored in articles.source_name (max 100 chars)
and are matched by name in nlp_service, so do not rename them casually.
================================================================================
"""
from __future__ import annotations

# ── Sources with a working RSS/Atom feed ──────────────────────────────────────
# browser_ua=True → fetch with a browser-like User-Agent first (many .gov.gh
# sites reject the default feedparser User-Agent), then parse with feedparser.

TRUSTED_RSS_SOURCES: list[dict] = [
    {
        "name": "Data Protection Commission",
        "url": "https://dpc.gov.gh/feed/",
        "category_hint": "regulatory",
        "browser_ua": True,
    },
    {
        "name": "National Communications Authority",
        "url": "https://nca.org.gh/feed/",
        "category_hint": "regulatory",
        "browser_ua": True,
    },
    {
        "name": "National Identification Authority",
        "url": "https://nia.gov.gh/feed/",
        "category_hint": "regulatory",
        "browser_ua": True,
    },
    {
        "name": "Ministry of Communications, Digital Technology & Innovations",
        "url": "https://moc.gov.gh/feed",
        "category_hint": "regulatory",
        "browser_ua": True,
    },
    {
        "name": "Ghana Telecom Chamber",
        "url": "https://www.telecomschamber.org/feed/",
        "category_hint": "tech_telecom",
        "browser_ua": True,
    },
    {
        "name": "Securities and Exchange Commission",
        "url": "https://sec.gov.gh/feed/",
        "category_hint": "regulatory",
        "browser_ua": True,
    },
    {
        "name": "Ghana Revenue Authority",
        "url": "https://gra.gov.gh/feed/",
        "category_hint": "regulatory",
        "browser_ua": True,
    },
    {
        "name": "Environmental Protection Authority",
        "url": "https://www.epa.gov.gh/new/feed/",
        "category_hint": "regulatory",
        "browser_ua": True,
    },
]

# ── Sources with NO feed → HTML listing scraper ───────────────────────────────
# listing_urls : pages that list the latest news / notices / alerts
# link_regex   : matches the PATH (+ "?query" if any) of a real ARTICLE link.
#                If it matches nothing, the scraper falls back to a "loose"
#                heuristic and logs a warning, so a layout change degrades
#                gracefully instead of silently returning nothing.
# feed_urls    : optional feeds to try FIRST (used for WordPress sites)

TRUSTED_HTML_SOURCES: list[dict] = [
    {
        "name": "National Insurance Commission",
        "home": "https://nic.gov.gh/",
        "listing_urls": [
            "https://nic.gov.gh/media/news",
            "https://nic.gov.gh/media/notices",
        ],
        "link_regex": r"^/media/(?:news|notices)/[^/?#]+/?$",
        "category_hint": "regulatory",
    },
    {
        "name": "Cyber Security Authority",
        "home": "https://csa.gov.gh/",
        "listing_urls": [
            "https://csa.gov.gh/news.php",
            "https://csa.gov.gh/press-releases",
            "https://csa.gov.gh/cert-gh-alerts",
            "https://csa.gov.gh/index.php",
        ],
        # e.g. /csa-urges-public-to-report-suspicious-cyber-activities.php, /cert-gh-alert45.php
        "link_regex": r"^/(?:cert-gh-alert\d+|[a-z0-9]+(?:-[a-z0-9]+){2,})\.php$",
        "category_hint": "regulatory",
    },
    {
        "name": "National Information Technology Agency",
        "home": "https://nita.gov.gh/",
        "listing_urls": [
            "https://nita.gov.gh/news-media/news",
            "https://nita.gov.gh/",
        ],
        # e.g. /news-media/news/3
        "link_regex": r"^/news-media/news/\d+/?$",
        "category_hint": "regulatory",
    },
    {
        "name": "Office of the Registrar of Companies",
        "home": "https://orc.gov.gh/index.php",
        "listing_urls": [
            "https://orc.gov.gh/news.php",
            "https://orc.gov.gh/press-release.php",
        ],
        # e.g. /single-blog.php?slug=orc-moves-to-strike-off-453-companies
        "link_regex": r"^/single-blog\.php\?slug=[^&#]+",
        "category_hint": "regulatory",
    },
    {
        "name": "Ghana Investment Fund for Electronic Communications",
        "home": "https://gifec.gov.gh/",
        "listing_urls": [
            "https://gifec.gov.gh/news.html",
            "https://gifec.gov.gh/index.html",
        ],
        # e.g. /news-detail-one-million-coders.html
        "link_regex": r"^/news-detail-[^/?#]+\.html$",
        "category_hint": "regulatory",
    },
    {
        # NOTE: the ghana.gov.gh/mdas/... page you supplied is a payments / services
        # portal with no news. GIPC's own site (gipc.gov.gh) is WordPress, so a feed
        # is tried first and the news listing is the fallback.
        "name": "Ghana Investment Promotion Centre",
        "home": "https://gipc.gov.gh/",
        "feed_urls": [
            "https://gipc.gov.gh/feed/",
            "https://gipc.gov.gh/category/news/feed/",
        ],
        "listing_urls": [
            "https://gipc.gov.gh/category/news/",
        ],
        # e.g. /2026/07/15/ghana-investment-promotion-centre-now-an-authority/
        "link_regex": r"^/\d{4}/\d{2}/\d{2}/[^/]+/?$",
        "category_hint": "regulatory",
    },
]

# Lower-cased names of every trusted source (used by nlp_service)
TRUSTED_SOURCE_NAMES: frozenset[str] = frozenset(
    s["name"].strip().lower() for s in (TRUSTED_RSS_SOURCES + TRUSTED_HTML_SOURCES)
)
