# from __future__ import annotations
# """
# RSS scraper + optional GNews API — pulls articles from 18 Ghana/Africa/Google News sources every 15 minutes.
# Google News RSS (free, no key) aggregates both traditional media and social media (Twitter/X) coverage.
# Set GNEWS_TOKEN env var (free at gnews.io) to also enable direct MTN Ghana targeted search.
# """

# import logging
# import os
# import re
# from copy import deepcopy
# from datetime import datetime, timezone
# from email.utils import parsedate_to_datetime
# from threading import Lock
# from typing import Optional

# import feedparser

# GNEWS_TOKEN = os.environ.get("GNEWS_TOKEN", "")

# logger = logging.getLogger(__name__)

# _STATUS_LOCK = Lock()
# _SCRAPER_STATUS = {
#     "lastAttemptAt": None,
#     "lastCompletedAt": None,
#     "lastSuccessfulFetchAt": None,
#     "lastNewArticleAt": None,
#     "fetchedCount": 0,
#     "newArticleCount": 0,
#     "filteredCount": 0,
#     "sources": [],
#     "gnewsConfigured": bool(GNEWS_TOKEN),
# }


# def get_scraper_status() -> dict:
#     with _STATUS_LOCK:
#         return deepcopy(_SCRAPER_STATUS)


# # Nairametrics covers the whole Nigerian economy. Only retain stories with a
# # concrete MTN/telecom/digital-finance connection instead of filling the MTN
# # Ghana feed with unrelated Nigerian business news.
# NAIRAMETRICS_RELEVANCE_PATTERNS = (
#     r"\bmtn\b",
#     r"\bghana(?:ian)?\b",
#     r"\btelecom(?:s|munications?)?\b",
#     r"\bmobile (?:network|money|operator|subscriber|data)\b",
#     r"\bmomo\b",
#     r"\bfintech\b",
#     r"\b5g\b",
#     r"\bspectrum\b",
#     r"\bcell(?:ular)? network\b",
#     r"\bnetwork (?:operator|outage|infrastructure)\b",
#     r"\bcyber(?:security|attack|crime|threat)\b",
#     r"\bdigital payments?\b",
#     r"\bmobile payments?\b",
# )


# def is_relevant_for_mtn_ghana(article: dict) -> bool:
#     """Apply strict pre-storage filtering to broad regional news sources."""
#     if article.get("source_name", "").casefold() != "nairametrics":
#         return True

#     text = f"{article.get('title', '')} {article.get('body', '')}".casefold()
#     return any(re.search(pattern, text) for pattern in NAIRAMETRICS_RELEVANCE_PATTERNS)

# # ── Source registry ───────────────────────────────────────────────────────────

# RSS_SOURCES = [
#     # ── Ghana local ──────────────────────────────────────────────────────────
#     {
#         "name": "JoyFM",
#         "url": "https://www.myjoyonline.com/feed/",
#         "category_hint": "ghana_local",
#     },
#     {
#         "name": "Citi FM",
#         "url": "https://citinewsroom.com/feed/",
#         "category_hint": "ghana_local",
#     },
#     {
#         "name": "Modern Ghana",
#         "url": "https://www.modernghana.com/rss/news.aspx",
#         "category_hint": "ghana_local",
#     },
#     {
#         "name": "GhanaWeb",
#         "url": "https://www.ghanaweb.com/GhanaHomePage/rss/",
#         "category_hint": "ghana_local",
#     },
#     {
#         "name": "Graphic Online",
#         "url": "https://www.graphic.com.gh/feed",
#         "category_hint": "ghana_local",
#     },
#     {
#         "name": "Ghana Business News",
#         "url": "https://www.ghanabusinessnews.com/feed/",
#         "category_hint": "ghana_business",
#     },
#     {
#         "name": "Pulse Ghana",
#         "url": "https://www.pulse.com.gh/rss",
#         "category_hint": "ghana_local",
#     },
#     # ── Tech & Telecom ────────────────────────────────────────────────────────
#     {
#         "name": "TechCabal",
#         "url": "https://techcabal.com/feed/",
#         "category_hint": "tech_telecom",
#     },
#     {
#         "name": "Disrupt Africa",
#         "url": "https://disrupt-africa.com/feed/",
#         "category_hint": "tech_telecom",
#     },
#     # ── Africa / Global Finance ───────────────────────────────────────────────
#     {
#         "name": "BBC Africa",
#         "url": "http://feeds.bbci.co.uk/news/world/africa/rss.xml",
#         "category_hint": "global_finance",
#     },
#     {
#         "name": "The Africa Report",
#         "url": "https://www.theafricareport.com/feed/",
#         "category_hint": "global_finance",
#     },
#     {
#         "name": "African Business",
#         "url": "https://african.business/feed/",
#         "category_hint": "global_finance",
#     },
#     # ── Google News (aggregates social + traditional media) ───────────────────
#     # Free — no API key. Covers Twitter/X mentions aggregated by Google News.
#     {
#         "name": "Google News: MTN Ghana",
#         "url": "https://news.google.com/rss/search?q=MTN+Ghana+when:7d&hl=en&gl=GH&ceid=GH:en",
#         "category_hint": "ghana_local",
#     },
#     {
#         "name": "Google News: Ghana Telecom",
#         "url": "https://news.google.com/rss/search?q=Ghana+telecom+NCA+regulation+when:7d&hl=en&gl=GH&ceid=GH:en",
#         "category_hint": "regulatory",
#     },
#     {
#         "name": "Google News: MoMo Ghana",
#         "url": "https://news.google.com/rss/search?q=MoMo+mobile+money+Ghana+when:7d&hl=en&gl=GH&ceid=GH:en",
#         "category_hint": "ghana_business",
#     },
#     # ── Additional Africa finance ─────────────────────────────────────────────
#     {
#         "name": "CNBC Africa",
#         "url": "https://www.cnbcafrica.com/feed/",
#         "category_hint": "global_finance",
#     },
#     {
#         "name": "Nairametrics",
#         "url": "https://nairametrics.com/feed/",
#         "category_hint": "global_finance",
#     },
# ]


# # ── Parse helpers ─────────────────────────────────────────────────────────────

# def _parse_published(entry: dict) -> Optional[datetime]:
#     """Try multiple feedparser date fields, return UTC datetime or None."""
#     for field in ("published_parsed", "updated_parsed"):
#         val = entry.get(field)
#         if val:
#             try:
#                 return datetime(*val[:6], tzinfo=timezone.utc)
#             except Exception:
#                 pass
#     for field in ("published", "updated"):
#         val = entry.get(field)
#         if val:
#             try:
#                 return parsedate_to_datetime(val).astimezone(timezone.utc)
#             except Exception:
#                 pass
#     return None


# def _extract_body(entry: dict) -> str:
#     """Pull the longest text we can find from the entry."""
#     for field in ("content", "summary_detail", "description"):
#         raw = entry.get(field)
#         if isinstance(raw, list) and raw:
#             raw = raw[0].get("value", "")
#         if isinstance(raw, dict):
#             raw = raw.get("value", "")
#         if raw and len(raw) > 50:
#             # Strip basic HTML tags cheaply
#             try:
#                 from bs4 import BeautifulSoup
#                 return BeautifulSoup(raw, "html.parser").get_text(separator=" ", strip=True)
#             except ImportError:
#                 import re
#                 return re.sub(r"<[^>]+>", " ", raw).strip()
#     return entry.get("summary", "")


# # ── Core scrape function ──────────────────────────────────────────────────────

# def scrape_all_sources() -> list[dict]:
#     """
#     Scrape all RSS sources and return a list of raw article dicts.
#     Each dict has: url, title, body, source_name, source_url, published_at
#     Does NOT write to DB — caller handles persistence + deduplication.
#     """
#     articles = []
#     source_results = []
#     checked_at = datetime.now(timezone.utc).isoformat()
#     for source in RSS_SOURCES:
#         try:
#             feed = feedparser.parse(source["url"])
#             if feed.bozo and not feed.entries:
#                 logger.warning("Feed %s may be malformed: %s", source["name"], feed.bozo_exception)
#                 source_results.append({
#                     "name": source["name"], "url": source["url"], "status": "Failed",
#                     "entryCount": 0, "checkedAt": checked_at, "error": str(feed.bozo_exception),
#                 })
#                 continue
#             for entry in feed.entries:
#                 url = entry.get("link") or entry.get("id")
#                 title = entry.get("title", "").strip()
#                 if not url or not title:
#                     continue
#                 articles.append({
#                     "url": url,
#                     "title": title,
#                     "body": _extract_body(entry),
#                     "source_name": source["name"],
#                     "source_url": source["url"],
#                     "published_at": _parse_published(entry),
#                 })
#             logger.info("Scraped %d articles from %s", len(feed.entries), source["name"])
#             source_results.append({
#                 "name": source["name"], "url": source["url"],
#                 "status": "Degraded" if feed.bozo else "Healthy",
#                 "entryCount": len(feed.entries), "checkedAt": checked_at,
#                 "error": str(feed.bozo_exception) if feed.bozo else None,
#             })
#         except Exception as exc:
#             logger.error("Failed to scrape %s: %s", source["name"], exc)
#             source_results.append({
#                 "name": source["name"], "url": source["url"], "status": "Failed",
#                 "entryCount": 0, "checkedAt": checked_at, "error": str(exc),
#             })
#     with _STATUS_LOCK:
#         _SCRAPER_STATUS["sources"] = source_results
#         _SCRAPER_STATUS["fetchedCount"] = len(articles)
#         if articles:
#             _SCRAPER_STATUS["lastSuccessfulFetchAt"] = checked_at
#     return articles


# # ── GNews API (optional, free 100 req/day) ───────────────────────────────────

# def _fetch_gnews(query: str = "MTN Ghana telecom", max_results: int = 10) -> list[dict]:
#     """
#     Fetch targeted articles from GNews free tier (100 req/day).
#     Requires GNEWS_TOKEN env var — get one free at https://gnews.io/
#     Returns same shape as scrape_all_sources().
#     """
#     if not GNEWS_TOKEN:
#         return []
#     try:
#         import requests
#         url = "https://gnews.io/api/v4/search"
#         params = {
#             "q": query,
#             "token": GNEWS_TOKEN,
#             "lang": "en",
#             "max": max_results,
#             "sortby": "publishedAt",
#         }
#         resp = requests.get(url, params=params, timeout=10)
#         if resp.status_code != 200:
#             logger.warning("GNews returned %s: %s", resp.status_code, resp.text[:200])
#             return []
#         data = resp.json().get("articles", [])
#         articles = []
#         for a in data:
#             pub = a.get("publishedAt")
#             try:
#                 pub_dt = datetime.fromisoformat(pub.replace("Z", "+00:00")) if pub else None
#             except Exception:
#                 pub_dt = None
#             articles.append({
#                 "url":         a.get("url", ""),
#                 "title":       a.get("title", "").strip(),
#                 "body":        a.get("content") or a.get("description") or "",
#                 "source_name": a.get("source", {}).get("name", "GNews"),
#                 "source_url":  a.get("source", {}).get("url", ""),
#                 "published_at": pub_dt,
#             })
#         logger.info("GNews returned %d articles for query '%s'", len(articles), query)
#         return articles
#     except Exception as exc:
#         logger.error("GNews fetch failed: %s", exc)
#         return []


# # ── DB-persisting entry point ─────────────────────────────────────────────────

# def run_scrape_and_store() -> int:
#     """
#     Called by the interval APScheduler job and the manual scrape endpoint.
#     Returns number of NEW articles stored.
#     """
#     from ..models.database import SessionLocal
#     from ..models.article import Article
#     from .pipeline_service import process_article

#     attempt_at = datetime.now(timezone.utc).isoformat()
#     with _STATUS_LOCK:
#         _SCRAPER_STATUS["lastAttemptAt"] = attempt_at

#     raw_articles = scrape_all_sources()

#     # Augment with targeted GNews search for MTN-specific articles
#     raw_articles += _fetch_gnews("MTN Ghana telecom MoMo", max_results=10)
#     raw_articles += _fetch_gnews("Ghana cedi inflation NCA regulation", max_results=10)

#     before_filter = len(raw_articles)
#     raw_articles = [article for article in raw_articles if is_relevant_for_mtn_ghana(article)]
#     filtered_count = before_filter - len(raw_articles)
#     if filtered_count:
#         logger.info(
#             "Filtered %d Nairametrics articles without an MTN Ghana relevance signal",
#             filtered_count,
#         )
#     with _STATUS_LOCK:
#         _SCRAPER_STATUS["filteredCount"] = filtered_count

#     new_count = 0

#     with SessionLocal() as db:
#         candidate_urls = [raw["url"] for raw in raw_articles if raw.get("url")]
#         existing_urls = {
#             url for (url,) in db.query(Article.url).filter(Article.url.in_(candidate_urls)).all()
#         }
#         for raw in raw_articles:
#             # Deduplication — UNIQUE constraint on url handles concurrent calls
#             if raw["url"] in existing_urls:
#                 continue
#             article = Article(
#                 url=raw["url"],
#                 title=raw["title"],
#                 body=raw["body"],
#                 source_name=raw["source_name"],
#                 source_url=raw["source_url"],
#                 published_at=raw["published_at"],
#             )
#             db.add(article)
#             try:
#                 db.commit()
#                 db.refresh(article)
#                 new_count += 1
#                 existing_urls.add(raw["url"])
#                 # Immediately score the new article
#                 try:
#                     process_article(article.id)
#                 except Exception as nlp_exc:
#                     logger.error("NLP pipeline failed for %s: %s", article.id, nlp_exc)
#             except Exception as db_exc:
#                 db.rollback()
#                 logger.debug("Skipped duplicate: %s (%s)", raw["url"][:60], db_exc)

#     completed_at = datetime.now(timezone.utc).isoformat()
#     with _STATUS_LOCK:
#         _SCRAPER_STATUS["lastCompletedAt"] = completed_at
#         _SCRAPER_STATUS["newArticleCount"] = new_count
#         if new_count:
#             _SCRAPER_STATUS["lastNewArticleAt"] = completed_at
#     logger.info("Scrape complete — %d new articles stored", new_count)
#     return new_count


# # ── Direct Execution Support (For Manual Terminal Runs) ──────────────────────
# if __name__ == "__main__":
#     import sys
#     from pathlib import Path
    
#     # Configure logging so console shows all actions during manual run
#     logging.basicConfig(
#         level=logging.INFO,
#         format="%(asctime)s [%(levelname)s] %(message)s",
#         handlers=[logging.StreamHandler(sys.stdout)]
#     )
    
#     print("\n" + "="*80)
#     print("MTN QUANTRISK - DIRECT SCRAPER RUN")
#     print("="*80)
#     print("Initializing Database Connection...")
    
#     # Set backend parent directory to path so imports resolve cleanly
#     sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    
#     print("Launching scraper pipeline...")
#     new_articles = run_scrape_and_store()
    
#     print("\n" + "="*80)
#     print(f"SCRAPE RUN DIAGNOSTIC COMPLETE")
#     print(f" -> Total New Articles Added & Processed: {new_articles}")
#     print("="*80 + "\n")





from __future__ import annotations
"""
RSS scraper + HTML listing scraper + optional GNews API.

Sources
  1. RSS_SOURCES      - Ghana / Africa / Google News feeds (original logic, unchanged)
                        + the 8 trusted regulator feeds (fetched with a browser User-Agent)
  2. HTML sources     - the 6 trusted regulator sites that have NO feed. Their news listing
                        pages are read, then each NEW article page is fetched and parsed.
  3. GNews (optional) - set GNEWS_TOKEN (free at gnews.io) for targeted MTN Ghana search.

Every source returns the SAME article dict:
    url, title, body, source_name, source_url, published_at

Run a safe, no-database check of the HTML sources with:
    python -m app.services.scraper_service --check-html
"""

import logging
import os
import re
import time
from copy import deepcopy
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from threading import Lock
from typing import Optional
from urllib.parse import urljoin, urldefrag, urlparse

import feedparser

try:  # needed only for the HTML sources
    from bs4 import BeautifulSoup
except ImportError:  # pragma: no cover
    BeautifulSoup = None

try:
    from dateutil import parser as _dtparser
except ImportError:  # pragma: no cover
    _dtparser = None

try:
    from ..config.trusted_sources import TRUSTED_RSS_SOURCES, TRUSTED_HTML_SOURCES
except ImportError:  # pragma: no cover - when imported outside the package
    from app.config.trusted_sources import TRUSTED_RSS_SOURCES, TRUSTED_HTML_SOURCES

GNEWS_TOKEN = os.environ.get("GNEWS_TOKEN", "")

# ── Article age limit ──
# Articles published more than SCRAPE_MAX_AGE_DAYS ago are never stored.
SCRAPE_MAX_AGE_DAYS = 7
# Some pages have no detectable publish date. False = skip them (strict: guarantees
# nothing older than the limit gets in). True = keep them (may let old pages through).
SCRAPE_KEEP_UNDATED = False


def _scrape_cutoff() -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=SCRAPE_MAX_AGE_DAYS)


def is_within_age_limit(published_at: Optional[datetime], cutoff: Optional[datetime] = None) -> bool:
    """True if the article was published within the last SCRAPE_MAX_AGE_DAYS days."""
    if published_at is None:
        return SCRAPE_KEEP_UNDATED
    if published_at.tzinfo is None:
        published_at = published_at.replace(tzinfo=timezone.utc)
    return published_at >= (cutoff or _scrape_cutoff())

logger = logging.getLogger(__name__)

_STATUS_LOCK = Lock()
_SCRAPER_STATUS = {
    "lastAttemptAt": None,
    "lastCompletedAt": None,
    "lastSuccessfulFetchAt": None,
    "lastNewArticleAt": None,
    "fetchedCount": 0,
    "newArticleCount": 0,
    "filteredCount": 0,
    "sources": [],
    "gnewsConfigured": bool(GNEWS_TOKEN),
}


def get_scraper_status() -> dict:
    with _STATUS_LOCK:
        return deepcopy(_SCRAPER_STATUS)


# Nairametrics covers the whole Nigerian economy. Only retain stories with a
# concrete MTN/telecom/digital-finance connection instead of filling the MTN
# Ghana feed with unrelated Nigerian business news.
NAIRAMETRICS_RELEVANCE_PATTERNS = (
    r"\bmtn\b",
    r"\bghana(?:ian)?\b",
    r"\btelecom(?:s|munications?)?\b",
    r"\bmobile (?:network|money|operator|subscriber|data)\b",
    r"\bmomo\b",
    r"\bfintech\b",
    r"\b5g\b",
    r"\bspectrum\b",
    r"\bcell(?:ular)? network\b",
    r"\bnetwork (?:operator|outage|infrastructure)\b",
    r"\bcyber(?:security|attack|crime|threat)\b",
    r"\bdigital payments?\b",
    r"\bmobile payments?\b",
)


def is_relevant_for_mtn_ghana(article: dict) -> bool:
    """Apply strict pre-storage filtering to broad regional news sources."""
    if article.get("source_name", "").casefold() != "nairametrics":
        return True

    text = f"{article.get('title', '')} {article.get('body', '')}".casefold()
    return any(re.search(pattern, text) for pattern in NAIRAMETRICS_RELEVANCE_PATTERNS)

# ── Source registry ───────────────────────────────────────────────────────────

RSS_SOURCES = [
    # ── Ghana local ──────────────────────────────────────────────────────────
    {
        "name": "JoyFM",
        "url": "https://www.myjoyonline.com/feed/",
        "category_hint": "ghana_local",
    },
    {
        "name": "Citi FM",
        "url": "https://citinewsroom.com/feed/",
        "category_hint": "ghana_local",
    },
    {
        "name": "Modern Ghana",
        "url": "https://www.modernghana.com/rss/news.aspx",
        "category_hint": "ghana_local",
    },
    {
        "name": "GhanaWeb",
        "url": "https://www.ghanaweb.com/GhanaHomePage/rss/",
        "category_hint": "ghana_local",
    },
    {
        "name": "Graphic Online",
        "url": "https://www.graphic.com.gh/feed",
        "category_hint": "ghana_local",
    },
    {
        "name": "Ghana Business News",
        "url": "https://www.ghanabusinessnews.com/feed/",
        "category_hint": "ghana_business",
    },
    {
        "name": "Pulse Ghana",
        "url": "https://www.pulse.com.gh/rss",
        "category_hint": "ghana_local",
    },
    # ── Tech & Telecom ────────────────────────────────────────────────────────
    {
        "name": "TechCabal",
        "url": "https://techcabal.com/feed/",
        "category_hint": "tech_telecom",
    },
    {
        "name": "Disrupt Africa",
        "url": "https://disrupt-africa.com/feed/",
        "category_hint": "tech_telecom",
    },
    # ── Africa / Global Finance ───────────────────────────────────────────────
    {
        "name": "BBC Africa",
        "url": "http://feeds.bbci.co.uk/news/world/africa/rss.xml",
        "category_hint": "global_finance",
    },
    {
        "name": "The Africa Report",
        "url": "https://www.theafricareport.com/feed/",
        "category_hint": "global_finance",
    },
    {
        "name": "African Business",
        "url": "https://african.business/feed/",
        "category_hint": "global_finance",
    },
    # ── Google News (aggregates social + traditional media) ───────────────────
    # Free — no API key. Covers Twitter/X mentions aggregated by Google News.
    {
        "name": "Google News: MTN Ghana",
        "url": "https://news.google.com/rss/search?q=MTN+Ghana+when:7d&hl=en&gl=GH&ceid=GH:en",
        "category_hint": "ghana_local",
    },
    {
        "name": "Google News: Ghana Telecom",
        "url": "https://news.google.com/rss/search?q=Ghana+telecom+NCA+regulation+when:7d&hl=en&gl=GH&ceid=GH:en",
        "category_hint": "regulatory",
    },
    {
        "name": "Google News: MoMo Ghana",
        "url": "https://news.google.com/rss/search?q=MoMo+mobile+money+Ghana+when:7d&hl=en&gl=GH&ceid=GH:en",
        "category_hint": "ghana_business",
    },
    # ── Additional Africa finance ─────────────────────────────────────────────
    {
        "name": "CNBC Africa",
        "url": "https://www.cnbcafrica.com/feed/",
        "category_hint": "global_finance",
    },
    {
        "name": "Nairametrics",
        "url": "https://nairametrics.com/feed/",
        "category_hint": "global_finance",
    },
]

# ── Trusted Ghana regulator / industry feeds (non-negotiable) ────────────────
RSS_SOURCES = RSS_SOURCES + TRUSTED_RSS_SOURCES


# ── HTTP helpers (browser-like, tolerant of bad government certificates) ──────

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
}


def _http_get(url: str, timeout: int = 20):
    """GET with a browser User-Agent. Retries ignoring SSL errors (some .gov.gh certs are invalid)."""
    import requests

    try:
        resp = requests.get(url, headers=BROWSER_HEADERS, timeout=timeout, allow_redirects=True)
    except requests.exceptions.SSLError:
        try:
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        except Exception:  # noqa: BLE001
            pass
        resp = requests.get(
            url, headers=BROWSER_HEADERS, timeout=timeout, allow_redirects=True, verify=False
        )
    # requests defaults to ISO-8859-1 for text/html without a charset → mojibake
    if not resp.encoding or resp.encoding.lower() == "iso-8859-1":
        resp.encoding = resp.apparent_encoding or "utf-8"
    return resp


# ── Parse helpers ─────────────────────────────────────────────────────────────

def _parse_published(entry: dict) -> Optional[datetime]:
    """Try multiple feedparser date fields, return UTC datetime or None."""
    for field in ("published_parsed", "updated_parsed"):
        val = entry.get(field)
        if val:
            try:
                return datetime(*val[:6], tzinfo=timezone.utc)
            except Exception:
                pass
    for field in ("published", "updated"):
        val = entry.get(field)
        if val:
            try:
                return parsedate_to_datetime(val).astimezone(timezone.utc)
            except Exception:
                pass
    return None


def _extract_body(entry: dict) -> str:
    """Pull the longest text we can find from the entry."""
    for field in ("content", "summary_detail", "description"):
        raw = entry.get(field)
        if isinstance(raw, list) and raw:
            raw = raw[0].get("value", "")
        if isinstance(raw, dict):
            raw = raw.get("value", "")
        if raw and len(raw) > 50:
            # Strip basic HTML tags cheaply
            try:
                from bs4 import BeautifulSoup as _BS
                return _BS(raw, "html.parser").get_text(separator=" ", strip=True)
            except ImportError:
                import re as _re
                return _re.sub(r"<[^>]+>", " ", raw).strip()
    return entry.get("summary", "")


def _parse_feed(source: dict):
    """
    Original behaviour: feedparser.parse(url).
    Trusted sources set browser_ua=True: fetch with a browser User-Agent first
    (government WAFs often reject feedparser's default UA), then fall back.
    """
    if source.get("browser_ua"):
        try:
            resp = _http_get(source["url"])
            if resp.status_code == 200:
                parsed = feedparser.parse(resp.content)
                if parsed.entries:
                    return parsed
        except Exception as exc:  # noqa: BLE001
            logger.debug("Browser-UA fetch failed for %s: %s", source["name"], exc)
    return feedparser.parse(source["url"])


def _articles_from_feed(feed, source_name: str, source_url: str) -> list[dict]:
    out = []
    for entry in feed.entries:
        url = entry.get("link") or entry.get("id")
        title = entry.get("title", "").strip()
        if not url or not title:
            continue
        out.append({
            "url": url,
            "title": title,
            "body": _extract_body(entry),
            "source_name": source_name,
            "source_url": source_url,
            "published_at": _parse_published(entry),
        })
    return out


# ═════════════════════════════════════════════════════════════════════════════
# HTML LISTING SCRAPER (for the sources that have no RSS feed)
# ═════════════════════════════════════════════════════════════════════════════

_MONTHS = r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
_DATE_PATTERNS = [
    re.compile(r"\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?"),
    re.compile(rf"\b\d{{1,2}}(?:st|nd|rd|th)?\s+{_MONTHS}\.?,?\s+\d{{4}}\b", re.I),
    re.compile(rf"\b{_MONTHS}\.?\s+\d{{1,2}}(?:st|nd|rd|th)?,?\s+\d{{4}}\b", re.I),
]

_LISTING_DENY = (
    "login", "log-in", "contact", "about", "privacy", "terms", "sitemap", "faq",
    "career", "tender", "gallery", "subscribe", "javascript", "download",
)


def _parse_any_date(text: str) -> Optional[datetime]:
    """Find and parse the first plausible date in a string. Returns aware UTC datetime or None."""
    if not text or _dtparser is None:
        return None
    for pat in _DATE_PATTERNS:
        m = pat.search(text)
        if not m:
            continue
        try:
            dt = _dtparser.parse(m.group(0), fuzzy=False)
        except Exception:  # noqa: BLE001
            continue
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt = dt.astimezone(timezone.utc)
        now = datetime.now(timezone.utc)
        if dt.year < 2000 or (dt - now).days > 1:   # ignore junk / future dates
            continue
        return dt
    return None


def _same_site(netloc_a: str, netloc_b: str) -> bool:
    strip = lambda n: n.lower().split(":")[0].removeprefix("www.")  # noqa: E731
    return strip(netloc_a) == strip(netloc_b)


def _anchor_text(a) -> str:
    text = a.get_text(" ", strip=True)
    if not text:
        text = a.get("title") or ""
    if not text:
        img = a.find("img")
        text = (img.get("alt") if img else "") or ""
    return re.sub(r"\s+", " ", text).strip()


def _extract_listing_links(html: str, listing_url: str, link_re, site_host: str) -> dict[str, dict]:
    """
    Return {absolute_url: {"hint": anchor text, "context": nearby text}} for article links.
    Strict pass uses the configured regex. If that finds nothing, a loose heuristic is used.
    """
    soup = BeautifulSoup(html, "html.parser")
    listing_path = urlparse(listing_url).path.rstrip("/")

    def collect(strict: bool) -> dict[str, dict]:
        found: dict[str, dict] = {}
        for a in soup.find_all("a", href=True):
            href = (a["href"] or "").strip()
            if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
                continue
            absolute, _ = urldefrag(urljoin(listing_url, href))
            p = urlparse(absolute)
            if p.scheme not in ("http", "https") or not _same_site(p.netloc, site_host):
                continue
            target = p.path + (f"?{p.query}" if p.query else "")
            text = _anchor_text(a)

            if strict:
                if not link_re.search(target):
                    continue
            else:
                low = target.lower()
                if len(text) < 30 or p.path.rstrip("/") == listing_path:
                    continue
                if any(word in low for word in _LISTING_DENY):
                    continue
                depth = len([seg for seg in p.path.split("/") if seg])
                if depth < 2 and not low.endswith((".php", ".html")):
                    continue

            parent = a.find_parent(["article", "li", "div", "tr"])
            context = parent.get_text(" ", strip=True)[:400] if parent else text
            prev = found.get(absolute)
            if prev is None or len(text) > len(prev["hint"]):
                found[absolute] = {"hint": text, "context": context}
        return found

    links = collect(strict=True)
    if not links:
        links = collect(strict=False)
        if links:
            logger.warning(
                "HTML listing %s: configured link pattern matched nothing — using loose heuristic (%d links)",
                listing_url, len(links),
            )
    return links


def _meta_content(soup, **attrs) -> Optional[str]:
    tag = soup.find("meta", attrs=attrs)
    if tag and tag.get("content"):
        return tag["content"].strip()
    return None


def _page_date(soup) -> Optional[datetime]:
    for attrs in (
        {"property": "article:published_time"},
        {"property": "og:published_time"},
        {"itemprop": "datePublished"},
        {"name": "article:published_time"},
        {"name": "date"},
        {"name": "pubdate"},
        {"name": "DC.date.issued"},
    ):
        val = _meta_content(soup, **attrs)
        dt = _parse_any_date(val or "")
        if dt:
            return dt
    for t in soup.find_all("time"):
        dt = _parse_any_date(t.get("datetime") or t.get_text(" ", strip=True))
        if dt:
            return dt
    for s in soup.find_all("script", type="application/ld+json"):
        m = re.search(r'"datePublished"\s*:\s*"([^"]+)"', s.string or s.get_text() or "")
        if m:
            dt = _parse_any_date(m.group(1))
            if dt:
                return dt
    return None


_MAIN_SELECTORS = (
    "article", "main", ".entry-content", ".post-content", ".article-content",
    ".news-content", ".blog-details", ".post-details", "#content", ".content",
)


def _main_text(soup) -> str:
    container = None
    for sel in _MAIN_SELECTORS:
        node = soup.select_one(sel)
        if node and len(node.get_text(" ", strip=True)) > 200:
            container = node
            break
    if container is None:
        container = soup.body or soup
    paras = [p.get_text(" ", strip=True) for p in container.find_all(["p", "li"])]
    paras = [p for p in paras if len(p) > 40]
    text = " ".join(paras)
    if len(text) < 200:
        text = container.get_text(" ", strip=True)
    return re.sub(r"\s+", " ", text).strip()[:8000]


def _parse_article_page(html: str, hint_title: str, hint_context: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")

    published = _page_date(soup)          # must run before scripts are removed

    title = _meta_content(soup, property="og:title") or ""
    if not title:
        h1 = soup.find("h1")
        title = h1.get_text(" ", strip=True) if h1 else ""
    if not title and soup.title:
        title = soup.title.get_text(" ", strip=True)
    title = re.sub(r"\s+", " ", title or hint_title or "").strip()
    title = re.split(r"\s+[|]\s+", title)[0].strip() or hint_title

    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "form", "noscript"]):
        tag.decompose()
    body = _main_text(soup)

    if published is None:
        published = _parse_any_date(body[:600]) or _parse_any_date(hint_context)

    return {"title": title, "body": body, "published_at": published}


def scrape_html_source(source: dict, known_urls: Optional[set[str]] = None,
                       max_new: int = 12, delay: float = 0.4) -> tuple[list[dict], dict]:
    """
    Scrape one feedless site. Returns (articles, health_result).
    Article pages already in the database (known_urls) are NOT fetched again.
    """
    name = source["name"]
    home = source["home"]
    checked_at = datetime.now(timezone.utc).isoformat()
    result = {
        "name": name, "url": home, "status": "Failed", "entryCount": 0,
        "checkedAt": checked_at, "error": None, "type": "html",
    }
    known_urls = known_urls or set()

    if BeautifulSoup is None:
        result["error"] = "beautifulsoup4 not installed (pip install beautifulsoup4)"
        return [], result

    # 1) WordPress-style sites: try a feed first (same logic as the RSS sources)
    for feed_url in source.get("feed_urls", []):
        try:
            feed = _parse_feed({"name": name, "url": feed_url, "browser_ua": True})
            if feed.entries:
                articles = _articles_from_feed(feed, name, feed_url)
                result.update(status="Healthy", entryCount=len(feed.entries), url=feed_url)
                logger.info("Scraped %d articles from %s (feed)", len(articles), name)
                return articles, result
        except Exception as exc:  # noqa: BLE001
            logger.debug("Feed %s failed for %s: %s", feed_url, name, exc)

    # 2) Read listing pages → article links
    link_re = re.compile(source["link_regex"])
    host = urlparse(home).netloc
    candidates: dict[str, dict] = {}
    last_error: Optional[str] = None

    for listing_url in source.get("listing_urls", []):
        try:
            resp = _http_get(listing_url)
            if resp.status_code != 200:
                last_error = f"HTTP {resp.status_code} for {listing_url}"
                continue
            for url, info in _extract_listing_links(resp.text, listing_url, link_re, host).items():
                candidates.setdefault(url, info)
        except Exception as exc:  # noqa: BLE001
            last_error = f"{listing_url}: {str(exc)[:120]}"
            logger.warning("Listing fetch failed for %s: %s", name, exc)
        time.sleep(delay)

    if not candidates:
        result["error"] = last_error or (
            "No article links found (the site layout may have changed or the page is JavaScript-rendered)"
        )
        logger.warning("HTML source %s: %s", name, result["error"])
        return [], result

    result.update(status="Healthy", entryCount=len(candidates))

    # 3) Fetch only NEW article pages
    articles: list[dict] = []
    fetched = 0
    cutoff = _scrape_cutoff()
    for url, info in candidates.items():
        if url in known_urls:
            continue
        listing_date = _parse_any_date(info.get("context", ""))
        if listing_date is not None and listing_date < cutoff:
            continue   # listing already shows it is older than SCRAPE_MAX_AGE_DAYS
        if fetched >= max_new:
            break
        fetched += 1
        try:
            resp = _http_get(url)
            if resp.status_code != 200:
                logger.debug("Article %s returned HTTP %s", url, resp.status_code)
                continue
            parsed = _parse_article_page(resp.text, info["hint"], info["context"])
            if not parsed["title"]:
                continue
            articles.append({
                "url": url,
                "title": parsed["title"],
                "body": parsed["body"],
                "source_name": name,
                "source_url": home,
                "published_at": parsed["published_at"],
            })
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to read article %s: %s", url, exc)
        time.sleep(delay)

    logger.info("Scraped %d new articles from %s (%d links on listing pages)", len(articles), name, len(candidates))
    return articles, result


# ── Core scrape function ──────────────────────────────────────────────────────

def scrape_all_sources(known_urls: Optional[set[str]] = None) -> list[dict]:
    """
    Scrape all RSS + HTML sources and return a list of raw article dicts.
    Each dict has: url, title, body, source_name, source_url, published_at
    Does NOT write to DB — caller handles persistence + deduplication.
    """
    articles = []
    source_results = []
    checked_at = datetime.now(timezone.utc).isoformat()

    # ── RSS / Atom feeds (original logic) ──
    for source in RSS_SOURCES:
        try:
            feed = _parse_feed(source)
            if feed.bozo and not feed.entries:
                logger.warning("Feed %s may be malformed: %s", source["name"], feed.bozo_exception)
                source_results.append({
                    "name": source["name"], "url": source["url"], "status": "Failed",
                    "entryCount": 0, "checkedAt": checked_at, "error": str(feed.bozo_exception),
                    "type": "rss",
                })
                continue
            articles.extend(_articles_from_feed(feed, source["name"], source["url"]))
            logger.info("Scraped %d articles from %s", len(feed.entries), source["name"])
            source_results.append({
                "name": source["name"], "url": source["url"],
                "status": "Degraded" if feed.bozo else "Healthy",
                "entryCount": len(feed.entries), "checkedAt": checked_at,
                "error": str(feed.bozo_exception) if feed.bozo else None,
                "type": "rss",
            })
        except Exception as exc:
            logger.error("Failed to scrape %s: %s", source["name"], exc)
            source_results.append({
                "name": source["name"], "url": source["url"], "status": "Failed",
                "entryCount": 0, "checkedAt": checked_at, "error": str(exc), "type": "rss",
            })

    # ── HTML listing sources (no feed available) ──
    for source in TRUSTED_HTML_SOURCES:
        try:
            html_articles, health = scrape_html_source(source, known_urls=known_urls)
            articles.extend(html_articles)
            source_results.append(health)
        except Exception as exc:  # one broken site must never stop the others
            logger.error("HTML source %s crashed: %s", source["name"], exc)
            source_results.append({
                "name": source["name"], "url": source["home"], "status": "Failed",
                "entryCount": 0, "checkedAt": checked_at, "error": str(exc)[:200], "type": "html",
            })

    with _STATUS_LOCK:
        _SCRAPER_STATUS["sources"] = source_results
        _SCRAPER_STATUS["fetchedCount"] = len(articles)
        if articles:
            _SCRAPER_STATUS["lastSuccessfulFetchAt"] = checked_at
    return articles


# ── GNews API (optional, free 100 req/day) ───────────────────────────────────

def _fetch_gnews(query: str = "MTN Ghana telecom", max_results: int = 10) -> list[dict]:
    """
    Fetch targeted articles from GNews free tier (100 req/day).
    Requires GNEWS_TOKEN env var — get one free at https://gnews.io/
    Returns same shape as scrape_all_sources().
    """
    if not GNEWS_TOKEN:
        return []
    try:
        import requests
        url = "https://gnews.io/api/v4/search"
        params = {
            "q": query,
            "token": GNEWS_TOKEN,
            "lang": "en",
            "max": max_results,
            "sortby": "publishedAt",
        }
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code != 200:
            logger.warning("GNews returned %s: %s", resp.status_code, resp.text[:200])
            return []
        data = resp.json().get("articles", [])
        articles = []
        for a in data:
            pub = a.get("publishedAt")
            try:
                pub_dt = datetime.fromisoformat(pub.replace("Z", "+00:00")) if pub else None
            except Exception:
                pub_dt = None
            articles.append({
                "url":         a.get("url", ""),
                "title":       a.get("title", "").strip(),
                "body":        a.get("content") or a.get("description") or "",
                "source_name": a.get("source", {}).get("name", "GNews"),
                "source_url":  a.get("source", {}).get("url", ""),
                "published_at": pub_dt,
            })
        logger.info("GNews returned %d articles for query '%s'", len(articles), query)
        return articles
    except Exception as exc:
        logger.error("GNews fetch failed: %s", exc)
        return []


# ── DB-persisting entry point ─────────────────────────────────────────────────

def run_scrape_and_store() -> int:
    """
    Called by the interval APScheduler job and the manual scrape endpoint.
    Returns number of NEW articles stored.
    """
    from ..models.database import SessionLocal
    from ..models.article import Article
    from .pipeline_service import process_article

    attempt_at = datetime.now(timezone.utc).isoformat()
    with _STATUS_LOCK:
        _SCRAPER_STATUS["lastAttemptAt"] = attempt_at

    # URLs of already-stored HTML-source articles → their pages are not fetched again
    html_names = [s["name"] for s in TRUSTED_HTML_SOURCES]
    known_html_urls: set[str] = set()
    try:
        with SessionLocal() as db:
            known_html_urls = {
                url for (url,) in db.query(Article.url).filter(Article.source_name.in_(html_names)).all()
            }
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not load known HTML-source URLs: %s", exc)

    raw_articles = scrape_all_sources(known_urls=known_html_urls)

    # Augment with targeted GNews search for MTN-specific articles
    raw_articles += _fetch_gnews("MTN Ghana telecom MoMo", max_results=10)
    raw_articles += _fetch_gnews("Ghana cedi inflation NCA regulation", max_results=10)

    before_filter = len(raw_articles)
    raw_articles = [article for article in raw_articles if is_relevant_for_mtn_ghana(article)]
    filtered_count = before_filter - len(raw_articles)
    if filtered_count:
        logger.info(
            "Filtered %d Nairametrics articles without an MTN Ghana relevance signal",
            filtered_count,
        )

    cutoff = _scrape_cutoff()
    before_age = len(raw_articles)
    raw_articles = [a for a in raw_articles if is_within_age_limit(a.get("published_at"), cutoff)]
    too_old_count = before_age - len(raw_articles)
    if too_old_count:
        logger.info(
            "Skipped %d articles older than %d days%s",
            too_old_count, SCRAPE_MAX_AGE_DAYS, "" if SCRAPE_KEEP_UNDATED else " (or with no publish date)",
        )

    with _STATUS_LOCK:
        _SCRAPER_STATUS["filteredCount"] = filtered_count
        _SCRAPER_STATUS["tooOldCount"] = too_old_count

    new_count = 0

    with SessionLocal() as db:
        candidate_urls = [raw["url"] for raw in raw_articles if raw.get("url")]
        existing_urls = {
            url for (url,) in db.query(Article.url).filter(Article.url.in_(candidate_urls)).all()
        }
        for raw in raw_articles:
            # Deduplication — UNIQUE constraint on url handles concurrent calls
            if raw["url"] in existing_urls:
                continue
            article = Article(
                url=raw["url"],
                title=raw["title"],
                body=raw["body"],
                source_name=(raw["source_name"] or "")[:100],
                source_url=raw["source_url"],
                published_at=raw["published_at"],
            )
            db.add(article)
            try:
                db.commit()
                db.refresh(article)
                new_count += 1
                existing_urls.add(raw["url"])
                # Immediately score the new article
                try:
                    process_article(article.id)
                except Exception as nlp_exc:
                    logger.error("NLP pipeline failed for %s: %s", article.id, nlp_exc)
            except Exception as db_exc:
                db.rollback()
                logger.debug("Skipped duplicate: %s (%s)", raw["url"][:60], db_exc)

    completed_at = datetime.now(timezone.utc).isoformat()
    with _STATUS_LOCK:
        _SCRAPER_STATUS["lastCompletedAt"] = completed_at
        _SCRAPER_STATUS["newArticleCount"] = new_count
        if new_count:
            _SCRAPER_STATUS["lastNewArticleAt"] = completed_at
    logger.info("Scrape complete — %d new articles stored", new_count)
    return new_count


# ── Direct Execution Support (For Manual Terminal Runs) ──────────────────────
if __name__ == "__main__":
    import argparse
    import sys
    from pathlib import Path

    parser = argparse.ArgumentParser(description="MTN QuantRisk scraper")
    parser.add_argument(
        "--check-html", action="store_true",
        help="Test ONLY the feedless HTML sources (no database writes) and print what was found",
    )
    cli = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

    if cli.check_html:
        print("\n" + "=" * 80)
        print("HTML SOURCE CHECK (no database writes)")
        print("=" * 80)
        for src in TRUSTED_HTML_SOURCES:
            arts, health = scrape_html_source(src, known_urls=set(), max_new=3)
            mark = "OK " if health["status"] == "Healthy" and arts else "!! "
            print(f"\n{mark}{src['name']}  -> {health['status']} | {health['entryCount']} links | {len(arts)} read")
            if health.get("error"):
                print(f"    error: {health['error']}")
            for a in arts:
                body_len = len(a["body"] or "")
                print(f"    - {a['title'][:80]}")
                print(f"      date={a['published_at']}  body={body_len} chars  {a['url']}")
        print("\n" + "=" * 80 + "\n")
    else:
        print("\n" + "=" * 80)
        print("MTN QUANTRISK - DIRECT SCRAPER RUN")
        print("=" * 80)
        print("Launching scraper pipeline...")
        new_articles = run_scrape_and_store()
        print("\n" + "=" * 80)
        print("SCRAPE RUN DIAGNOSTIC COMPLETE")
        print(f" -> Total New Articles Added & Processed: {new_articles}")
        print("=" * 80 + "\n")
