"""
================================================================================
MTN QuantRisk - WHY IS (OR ISN'T) AN ARTICLE BEING EMAILED?
================================================================================
Read-only. Sends nothing, marks nothing. Run from the backend folder:

    python3 -m app.scripts.explain_email_eligibility
    python3 -m app.scripts.explain_email_eligibility --days 3 --show 8

It walks every article / alert through the SAME rules the senders use and prints how many
survive each rule, and which rule removed the rest. The final numbers come from the real
sender functions, so they always match what a real send would do.
================================================================================
"""
from __future__ import annotations

import argparse
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.models.database import SessionLocal                                  # noqa: E402
from app.models.article import Article                                        # noqa: E402
from app.models.alert import Alert                                            # noqa: E402
from app.models.risk_score import RiskScore                                   # noqa: E402
from app.services.email_service import load_sent_ids                          # noqa: E402
from app.services.so_what_service import is_usable_summary, parse_analysis    # noqa: E402
from app.config import email_config as cfg                                    # noqa: E402
from app.scripts.send_news_digest import fetch_top_articles_for_category      # noqa: E402
from app.scripts.send_alert_notifications import fetch_unsent_alerts          # noqa: E402

LINE = "=" * 78


def head(text: str) -> None:
    print(f"\n{LINE}\n{text}\n{LINE}")


def aware(dt: datetime | None, fallback: datetime) -> datetime:
    dt = dt or fallback
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def ai_complete(article: Article) -> bool:
    return is_usable_summary(article.summary) and bool(parse_analysis(article.analysis))


def main() -> int:
    parser = argparse.ArgumentParser(description="Explain email eligibility")
    parser.add_argument("--days", type=int, default=cfg.MAX_AGE_DAYS, help="look-back window (default: MAX_AGE_DAYS)")
    parser.add_argument("--show", type=int, default=5, help="example articles to list per reason (default 5)")
    args = parser.parse_args()

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=args.days)

    # ── 0. configuration ────────────────────────────────────────────────────
    head("0. SETTINGS THE SENDERS ARE USING (app/config/email_config.py)")
    print(f"  SEND_EMAILS               = {cfg.SEND_EMAILS}   (False = nothing is ever sent, only previewed)")
    print(f"  NEWS_MIN_MTN_RELEVANCE    = {cfg.NEWS_MIN_MTN_RELEVANCE}   (article must score at least this to be in a digest)")
    print(f"  NEWS_TOP_N                = {cfg.NEWS_TOP_N}   (articles per category per digest)")
    print(f"  MAX_AGE_DAYS              = {cfg.MAX_AGE_DAYS}   (older items are skipped)")
    print(f"  ALERT_TIERS_TO_SEND       = {cfg.ALERT_TIERS_TO_SEND}")
    print(f"  Digest categories + recipients:")
    if not cfg.NEWS_RECIPIENTS:
        print("    !! NEWS_RECIPIENTS is EMPTY — no category will ever be processed.")
    for cat, rec in cfg.NEWS_RECIPIENTS.items():
        to = [x for x in rec.get("to", []) if x and x.strip()]
        print(f"    {cat:<12} to: {len(to)} recipient(s)" + ("" if to else "   !! NO 'to' ADDRESS — this category is skipped"))

    sent_news = load_sent_ids(cfg.SENT_NEWS_LOG)
    sent_alerts = load_sent_ids(cfg.SENT_ALERTS_LOG)
    print(f"  Already-sent log          : {len(sent_news)} article id(s), {len(sent_alerts)} alert id(s)")

    with SessionLocal() as db:
        # ── 1. news digest funnel ───────────────────────────────────────────
        head(f"1. NEWS DIGEST — articles in the last {args.days} day(s), rule by rule")
        rows = db.query(Article, RiskScore).join(RiskScore, RiskScore.article_id == Article.id).all()

        in_window = []
        seen = set()
        for article, risk in rows:
            when = aware(article.published_at or article.scraped_at, now)
            if when >= cutoff and (article.id, risk.id) not in seen:
                seen.add((article.id, risk.id))
                in_window.append((article, risk))

        digest_cats = {c for c, r in cfg.NEWS_RECIPIENTS.items() if any(x and x.strip() for x in r.get("to", []))}
        stages: list[tuple[str, int]] = [("A. scored articles in the window (what the News page counts)", len(in_window))]
        reasons: dict[str, list[tuple[Article, RiskScore]]] = defaultdict(list)

        survivors = []
        for article, risk in in_window:
            cat = (risk.category or "").lower()
            if cat not in digest_cats:
                reasons[f"category '{cat or '?'}' has no digest / no recipients"].append((article, risk))
            else:
                survivors.append((article, risk))
        stages.append(("B. category is a digest category WITH a 'to' address", len(survivors)))

        nxt = []
        for article, risk in survivors:
            if (risk.mtn_relevance or 0) < cfg.NEWS_MIN_MTN_RELEVANCE:
                reasons[f"relevance below {cfg.NEWS_MIN_MTN_RELEVANCE}"].append((article, risk))
            else:
                nxt.append((article, risk))
        survivors = nxt
        stages.append((f"C. relevance >= {cfg.NEWS_MIN_MTN_RELEVANCE}", len(survivors)))

        nxt = []
        for article, risk in survivors:
            if article.id in sent_news:
                reasons["already sent before"].append((article, risk))
            else:
                nxt.append((article, risk))
        survivors = nxt
        stages.append(("D. not already sent", len(survivors)))

        nxt = []
        for article, risk in survivors:
            if not ai_complete(article):
                reasons["AI summary / implications not finished yet"].append((article, risk))
            else:
                nxt.append((article, risk))
        survivors = nxt
        stages.append(("E. AI summary AND implications finished", len(survivors)))

        for label, n in stages:
            print(f"  {n:>5}   {label}")

        # real selection (top N per category) using the actual sender code
        picked_total = 0
        per_cat = {}
        for cat in cfg.NEWS_RECIPIENTS:
            if cat not in digest_cats:
                continue
            picked, waiting = fetch_top_articles_for_category(db, cat, sent_news, now)
            per_cat[cat] = (len(picked), waiting)
            picked_total += len(picked)
        print(f"  {picked_total:>5}   F. SELECTED to send (top {cfg.NEWS_TOP_N} per category) — this is what a real run emails")

        print("\n  Per category   (selected / still waiting for the AI):")
        for cat, (n, w) in per_cat.items():
            print(f"    {cat:<12} {n} / {w}")

        print("\n  What removed the articles:")
        for reason, items in sorted(reasons.items(), key=lambda kv: -len(kv[1])):
            print(f"    {len(items):>5}  {reason}")

        # relevance distribution is the usual culprit
        buckets = Counter()
        for _, risk in in_window:
            r = risk.mtn_relevance or 0
            buckets["< 0.50" if r < 0.5 else "0.50 – 0.79" if r < 0.8 else "0.80 – 0.99" if r < 1.0 else "1.00"] += 1
        print("\n  Relevance spread of the articles in the window:")
        for k in ("< 0.50", "0.50 – 0.79", "0.80 – 0.99", "1.00"):
            print(f"    {k:<12} {buckets.get(k, 0)}")

        shown = 0
        low = reasons.get(f"relevance below {cfg.NEWS_MIN_MTN_RELEVANCE}", [])
        if low and args.show:
            print(f"\n  Examples removed for low relevance:")
            for article, risk in sorted(low, key=lambda x: -(x[1].mtn_relevance or 0))[: args.show]:
                print(f"    {risk.mtn_relevance:.2f}  [{risk.category}]  {article.title[:70]}  — {article.source_name}")
                shown += 1

        # ── 2. alert funnel ─────────────────────────────────────────────────
        head(f"2. ALERT EMAIL — alerts in the last {args.days} day(s), rule by rule")
        alert_rows = (
            db.query(Alert, Article)
            .join(Article, Article.id == Alert.article_id)
            .all()
        )
        a_window = [(a, art) for a, art in alert_rows if aware(a.created_at, now) >= cutoff]
        a_tier = [(a, art) for a, art in a_window if a.tier in cfg.ALERT_TIERS_TO_SEND]
        a_unsent = [(a, art) for a, art in a_tier if a.id not in sent_alerts]
        a_ai = [(a, art) for a, art in a_unsent if ai_complete(art)]
        for n, label in (
            (len(a_window), "A. alerts raised in the window"),
            (len(a_tier), f"B. tier is one of {cfg.ALERT_TIERS_TO_SEND}"),
            (len(a_unsent), "C. not already sent"),
            (len(a_ai), "D. AI summary AND implications finished"),
        ):
            print(f"  {n:>5}   {label}")
        ready, waiting = fetch_unsent_alerts(db, sent_alerts)
        print(f"  {len(ready):>5}   E. READY to send (real sender; {waiting} still waiting for the AI)")
        print("  (Alerts have no relevance threshold and no per-category cap: every qualifying alert is included.)")

    # ── 3. verdict ──────────────────────────────────────────────────────────
    head("WHAT THIS MEANS")
    if not cfg.NEWS_RECIPIENTS or not digest_cats:
        print("  The digest has no category with a recipient, so it can never send. Fix NEWS_RECIPIENTS ('to').")
    elif picked_total == 0:
        top = max(reasons.items(), key=lambda kv: len(kv[1]))[0] if reasons else "no articles in the window"
        print(f"  Nothing is eligible. The biggest reason is: {top}.")
    else:
        print(f"  {picked_total} article(s) would be emailed on the next real run.")
    return 0


if __name__ == "__main__":
    sys.exit(main())