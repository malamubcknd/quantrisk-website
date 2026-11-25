"""
================================================================================
MTN QuantRisk - NEW SOURCE FEED CHECKER
================================================================================
Finds and tests a working RSS/Atom feed for each of the 14 required regulator /
industry sources, using the SAME method the scraper uses (feedparser).

Run from the backend folder:
    python app/scripts/check_new_sources.py

It prints, per site, which feed URL works (and its latest headline), then prints
a ready-to-paste RSS_SOURCES block for the working ones and a list of sites that
have NO usable feed (those need an HTML-listing scraper instead).

A report is also saved to app/scripts/new_sources_report.json.
================================================================================
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.parse import urljoin, urlparse

import feedparser
import requests

try:
    from bs4 import BeautifulSoup
except ImportError:  # discovery from <link rel="alternate"> is skipped without bs4
    BeautifulSoup = None

requests.packages.urllib3.disable_warnings()  # some .gov.gh sites have bad certificates

# (name, url you gave, category_hint for RSS_SOURCES)
SOURCES = [
    ("Data Protection Commission", "https://dpc.gov.gh/", "regulatory"),
    ("National Insurance Commission", "https://nic.gov.gh/", "regulatory"),
    ("National Communications Authority", "https://nca.org.gh/", "regulatory"),
    ("National Identification Authority", "https://nia.gov.gh/", "regulatory"),
    ("Ghana Investment Promotion Centre", "https://www.ghana.gov.gh/mdas/ad4daaa174/", "regulatory"),
    ("Ministry of Communications, Digital Technology & Innovations", "https://moc.gov.gh/", "regulatory"),
    ("Ghana Telecom Chamber", "https://www.telecomschamber.org/", "tech_telecom"),
    ("Securities and Exchange Commission", "https://sec.gov.gh/", "regulatory"),
    ("National Information Technology Agency", "https://nita.gov.gh/", "regulatory"),
    ("Cyber Security Authority", "https://csa.gov.gh/", "regulatory"),
    ("Ghana Revenue Authority", "https://gra.gov.gh/", "regulatory"),
    ("Office of the Registrar of Companies", "https://orc.gov.gh/index.php", "regulatory"),
    ("Ghana Investment Fund for Electronic Communications", "https://gifec.gov.gh/", "regulatory"),
    ("Environmental Protection Authority", "https://www.epa.gov.gh/new/", "regulatory"),
]

COMMON_FEED_PATHS = [
    "feed/", "feed", "rss", "rss.xml", "index.php/feed", "?feed=rss2", "news/feed/",
    "category/news/feed/", "feed/atom/", "atom.xml", "blog/feed/", "feeds/news",
]

HEADERS = {
    # A browser-like User-Agent: many government sites block the default python UA
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
}


def _get(url: str, timeout: int = 20) -> tuple[requests.Response | None, bool, str | None]:
    """GET with a retry that ignores SSL errors. Returns (response, ssl_problem, error)."""
    try:
        return requests.get(url, headers=HEADERS, timeout=timeout), False, None
    except requests.exceptions.SSLError:
        try:
            return requests.get(url, headers=HEADERS, timeout=timeout, verify=False), True, None
        except Exception as exc:  # noqa: BLE001
            return None, True, str(exc)[:120]
    except Exception as exc:  # noqa: BLE001
        return None, False, str(exc)[:120]


def test_feed(url: str) -> dict:
    """Return a result dict; 'ok' is True only for a real feed with entries."""
    resp, ssl_problem, err = _get(url)
    result = {"url": url, "ok": False, "entries": 0, "latest": None, "ssl_problem": ssl_problem, "note": err}
    if resp is None:
        return result
    result["status"] = resp.status_code
    if resp.status_code != 200:
        result["note"] = f"HTTP {resp.status_code}"
        return result
    ctype = resp.headers.get("Content-Type", "").lower()
    parsed = feedparser.parse(resp.content)
    if parsed.entries:
        result["ok"] = True
        result["entries"] = len(parsed.entries)
        result["latest"] = (parsed.entries[0].get("title") or "").strip()[:90]
        result["note"] = None
    else:
        result["note"] = "not a feed (HTML page)" if "html" in ctype else "no entries"
    return result


def discover_from_homepage(home_url: str) -> list[str]:
    """Read <link rel="alternate" type="application/rss+xml"> tags from the homepage."""
    if BeautifulSoup is None:
        return []
    resp, _, _ = _get(home_url)
    if resp is None or resp.status_code != 200:
        return []
    soup = BeautifulSoup(resp.text, "html.parser")
    found = []
    for tag in soup.find_all("link", rel=lambda v: v and "alternate" in v):
        t = (tag.get("type") or "").lower()
        if "rss" in t or "atom" in t or "xml" in t:
            href = tag.get("href")
            if href:
                found.append(urljoin(home_url, href))
    return found


def candidate_urls(home_url: str) -> list[str]:
    parsed = urlparse(home_url)
    roots = {home_url if home_url.endswith("/") else home_url + "/", f"{parsed.scheme}://{parsed.netloc}/"}
    urls: list[str] = list(discover_from_homepage(home_url))
    for root in roots:
        for path in COMMON_FEED_PATHS:
            urls.append(urljoin(root, path))
    seen, ordered = set(), []
    for u in urls:
        if u not in seen:
            seen.add(u)
            ordered.append(u)
    return ordered


def main() -> None:
    report = []
    print("\n" + "=" * 80)
    print("CHECKING 14 REQUIRED SOURCES FOR A WORKING RSS/ATOM FEED")
    print("=" * 80)

    for name, home, hint in SOURCES:
        print(f"\n▶ {name}  ({home})")
        working = None
        tried = 0
        for url in candidate_urls(home):
            tried += 1
            res = test_feed(url)
            if res["ok"]:
                working = res
                break
        if working:
            flag = "  [SSL certificate problem]" if working["ssl_problem"] else ""
            print(f"   ✅ FEED: {working['url']}  ({working['entries']} entries){flag}")
            print(f"      latest: {working['latest']}")
        else:
            print(f"   ❌ no working feed after {tried} attempts → needs an HTML scraper")
        report.append({"name": name, "home": home, "hint": hint, "feed": working, "attempts": tried})

    ok = [r for r in report if r["feed"]]
    bad = [r for r in report if not r["feed"]]

    print("\n" + "=" * 80)
    print(f"RESULT: {len(ok)} of {len(SOURCES)} sources have a working feed")
    print("=" * 80)

    if ok:
        print("\n# Paste into RSS_SOURCES (scraper_service.py) — working feeds only:\n")
        for r in ok:
            print("    {")
            print(f'        "name": "{r["name"]}",')
            print(f'        "url": "{r["feed"]["url"]}",')
            print(f'        "category_hint": "{r["hint"]}",')
            print("    },")

    if bad:
        print("\n# NO USABLE FEED (send me this list — they need an HTML listing scraper):")
        for r in bad:
            print(f"   - {r['name']}  {r['home']}")

    out = Path(__file__).with_name("new_sources_report.json")
    out.write_text(json.dumps(report, indent=2))
    print(f"\nFull report saved to {out}\n")


if __name__ == "__main__":
    sys.exit(main())