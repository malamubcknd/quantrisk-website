"""
================================================================================
MTN QuantRisk - WHAT IS READY TO BE EMAILED, WHAT IS WAITING, AND WHY NOT?
================================================================================
Read-only. Sends nothing, marks nothing. Run from the backend folder (e.g. right
after `python3 -m app.services.scraper_service`):

    python3 -m app.scripts.explain_email_eligibility
    python3 -m app.scripts.explain_email_eligibility --show 10     # more example titles per reason
    python3 -m app.scripts.explain_email_eligibility --show 0      # numbers only

Nothing about the rules is hard-coded here. The report walks the SAME rule lists the
senders use (app/services/email_rules.py: NEWS_RULES, ALERT_RULES) and prints every
setting in app/config/email_config.py, so a new / changed / removed rule or setting
shows up automatically.

Every item lands in exactly ONE bucket:
    READY NOW  - would be emailed on the next real send (from the real selection code)
    WAITING    - held back for now, may go out on a later run
    NOT SENT   - dropped by a rule (reported under the FIRST rule it fails)
================================================================================
"""
from __future__ import annotations

import argparse
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.models.database import SessionLocal                                   # noqa: E402
from app.models.article import Article                                         # noqa: E402
from app.models.alert import Alert                                             # noqa: E402
from app.models.risk_score import RiskScore                                    # noqa: E402
from app.services.email_service import load_sent_ids                           # noqa: E402
from app.config import email_config as cfg                                     # noqa: E402
from app.services import email_rules as rules                                  # noqa: E402
from app.services import ai_activity_log, llm_client                           # noqa: E402
from app.services.aisummarizer_service import count_missing_ai_content         # noqa: E402

LINE = "=" * 78
READY = "READY NOW"
BUCKET_HELP = {
    READY: "would be emailed on the next real send",
    rules.WAITING: "held back for now - may go out on a later run",
    rules.NOT_SENT: "dropped by a rule - will not be emailed",
}
BUCKET_ORDER = (READY, rules.WAITING, rules.NOT_SENT)


def head(text: str) -> None:
    print(f"\n{LINE}\n{text}\n{LINE}")


def print_settings() -> None:
    """Every UPPER_CASE setting in email_config.py, so new settings appear without code changes."""
    head("0. SETTINGS (app/config/email_config.py)")
    names = [n for n in vars(cfg) if n.isupper() and not n.startswith("_")]
    width = max((len(n) for n in names), default=10)
    for name in names:
        print(f"  {name:<{width}} = {rules.describe_setting(getattr(cfg, name))}")


def print_rules(title: str, rule_list: list[rules.Rule], extra: list[str]) -> None:
    print(f"\n  {title} (checked in this order):")
    for i, rule in enumerate(rule_list, start=1):
        print(f"    {i}. [{rule.bucket}] {rule.reason()}")
    for line in extra:
        print(f"    +  {line}")


def print_breakdown(buckets: dict[str, dict[str, list]], show: int, describe) -> dict[str, int]:
    totals = {b: sum(len(v) for v in buckets[b].values()) for b in BUCKET_ORDER}
    for b in BUCKET_ORDER:
        print(f"  {totals[b]:>6}  {b:<10} {BUCKET_HELP[b]}")
    for b in BUCKET_ORDER:
        if not totals[b]:
            continue
        print(f"\n  {b}: {totals[b]} - by reason")
        for reason, items in sorted(buckets[b].items(), key=lambda kv: -len(kv[1])):
            print(f"    {len(items):>6}  {reason}")
            for item in items[:show]:
                print(f"              {describe(item)}")
            if show and len(items) > show:
                print(f"              ... and {len(items) - show} more")
    return totals


def _ago(iso: str | None) -> str:
    if not iso:
        return "never"
    try:
        then = datetime.fromisoformat(iso)
    except ValueError:
        return iso
    mins = int((datetime.now(timezone.utc) - then).total_seconds() // 60)
    when = then.astimezone().strftime("%d %b %H:%M")
    if mins < 60:
        return f"{when}  ({mins} min ago)"
    if mins < 48 * 60:
        return f"{when}  ({mins // 60} h ago)"
    return f"{when}  ({mins // 1440} days ago)"


def print_ai_status(email_waiting_ai: int) -> bool:
    """Health of the AI summarizer, from app/logs/ai_status.json + ai_summarizer.log. Returns True if healthy."""
    head("3. AI SUMMARIZER (app/logs/ai_summarizer.log, app/logs/ai_status.json)")
    st = ai_activity_log.read_status()
    available = llm_client.is_available()
    queue = count_missing_ai_content()

    print(f"  AI provider available now : {'yes' if available else 'NO'}")
    for line in llm_client.describe_configuration():
        print(f"      {line}")
    print(f"  Articles waiting for AI   : {queue}   ({email_waiting_ai} of them are waiting to be EMAILED - done first)")
    today = st.get("today") or {}
    print(f"  Today                     : {today.get('succeeded', 0)} succeeded, {today.get('failed', 0)} failed")
    print(f"  Last success              : {_ago(st.get('last_success_at'))}"
          + (f"  [{st.get('last_success_model')}]" if st.get("last_success_model") else ""))
    print(f"  Last failure              : {_ago(st.get('last_failure_at'))}"
          + (f"  - {st.get('last_failure_reason')}" if st.get("last_failure_reason") else ""))
    if st.get("last_provider_issue"):
        print(f"  Last provider problem     : {_ago(st.get('last_provider_issue_at'))}  - {st['last_provider_issue']}")
    run = st.get("run") or {}
    if run:
        print(f"  Backfill run ({run.get('state')}) : from {run.get('source')}, started {_ago(run.get('started_at'))}")
        print(f"      queued {run.get('queued')} ({run.get('priority_queued')} email-priority), limit {run.get('limit')}: "
              f"{run.get('done')} done ({run.get('priority_done')} email-priority), {run.get('failed')} failed"
              + (f" - stopped: {run['stopped_reason']}" if run.get("stopped_reason") else ""))
    else:
        print("  Backfill run              : none recorded yet (runs at API start-up and every "
              f"{os.getenv('AI_BACKFILL_INTERVAL_MINUTES', '10')} min while the API server is running)")

    lines = ai_activity_log.tail(8)
    if lines:
        print("\n  Latest log lines:")
        for ln in lines:
            print(f"    {ln[:150]}")

    # Verdict
    problems = []
    if not available:
        problems.append("no AI provider is available - check HF_TOKEN / LLM_PROVIDERS in backend/.env "
                        "(python app/scripts/check_ai_setup.py)")
    last_ok, last_bad = st.get("last_success_at"), st.get("last_failure_at")
    if last_bad and (not last_ok or last_bad > last_ok):
        problems.append(f"the most recent AI attempt failed: {st.get('last_failure_reason')}")
    if queue and not st.get("run"):
        problems.append("articles are waiting but no backfill has run - start the API server, or run "
                        "python app/scripts/run_ai_backfill.py")
    print()
    if problems:
        for p_ in problems:
            print(f"  !! {p_}")
    else:
        print("  AI summarizer looks healthy.")
    return not problems


def main() -> int:
    parser = argparse.ArgumentParser(description="Show what is ready / waiting / not sent, and why")
    parser.add_argument("--show", type=int, default=5, help="example items to list per reason (default 5, 0 = none)")
    args = parser.parse_args()

    now = datetime.now(timezone.utc)
    print_settings()

    news_ctx = rules.Context(now=now, sent_ids=load_sent_ids(rules.setting("SENT_NEWS_LOG")))
    alert_ctx = rules.Context(now=now, sent_ids=load_sent_ids(rules.setting("SENT_ALERTS_LOG")))

    with SessionLocal() as db:
        # ── 1. NEWS ─────────────────────────────────────────────────────────
        latest: dict[str, RiskScore] = {}
        for risk in db.query(RiskScore).all():
            cur = latest.get(risk.article_id)
            if cur is None or rules.aware(risk.scored_at, now) > rules.aware(cur.scored_at, now):
                latest[risk.article_id] = risk

        ready_ids: set[str] = set()
        for cat in sorted(news_ctx.digest_categories):
            selected, _ = rules.select_news_for_category(db, cat, news_ctx)
            ready_ids.update(it.article.id for it in selected)

        items = [rules.NewsItem(a, latest.get(a.id)) for a in db.query(Article).all()]
        items.sort(key=lambda it: it.when(now), reverse=True)     # newest examples first

        news_blocker = rules.news_delivery_blocker()
        news_buckets: dict[str, dict[str, list]] = {b: defaultdict(list) for b in BUCKET_ORDER}
        for it in items:
            failed = rules.first_failed_rule(it, rules.NEWS_RULES, news_ctx)
            if failed:
                news_buckets[failed.bucket][failed.reason()].append(it)
            elif it.article.id in ready_ids and news_blocker:
                news_buckets[rules.WAITING][f"passes every rule, but {news_blocker}"].append(it)
            elif it.article.id in ready_ids:
                news_buckets[READY][f"top {rules.setting('NEWS_TOP_N')} in its category"].append(it)
            else:
                news_buckets[rules.WAITING][rules.TOP_N_REASON()].append(it)

        team_cats = sorted(news_ctx.team_categories)
        head(f"1. NEWS DIGEST - {len(items)} articles in the database")
        print_rules("Rules", rules.NEWS_RULES, [
            rules.TOP_N_REASON(),
            "delivery: " + (news_blocker or (
                f"Head of Risks gets every selected article ({len(rules.head_of_risks_recipients())} recipient(s)); "
                f"team emails for: {', '.join(team_cats) if team_cats else 'none'}")),
        ])
        print()

        def describe_news(it: rules.NewsItem) -> str:
            rel = f"{it.risk.mtn_relevance:.2f}" if it.risk and it.risk.mtn_relevance is not None else " -  "
            return f"{it.when(now):%d %b}  rel {rel}  [{it.category or '-'}]  {(it.article.title or '')[:58]}"

        news_totals = print_breakdown(news_buckets, args.show, describe_news)

        # ── 2. ALERTS ───────────────────────────────────────────────────────
        alert_items = []
        seen: set[str] = set()
        for alert, art in db.query(Alert, Article).join(Article, Article.id == Alert.article_id).all():
            if alert.id not in seen:
                seen.add(alert.id)
                alert_items.append(rules.AlertItem(alert, art, latest.get(art.id)))
        alert_items.sort(key=lambda it: rules.aware(it.alert.created_at, now), reverse=True)

        blocker = rules.alert_delivery_blocker()
        alert_buckets: dict[str, dict[str, list]] = {b: defaultdict(list) for b in BUCKET_ORDER}
        for it in alert_items:
            failed = rules.first_failed_rule(it, rules.ALERT_RULES, alert_ctx)
            if failed:
                alert_buckets[failed.bucket][failed.reason()].append(it)
            elif blocker:
                alert_buckets[rules.WAITING][f"passes every rule, but {blocker}"].append(it)
            else:
                alert_buckets[READY]["passes every rule"].append(it)

        head(f"2. ALERT EMAIL - {len(alert_items)} alerts in the database")
        print_rules("Rules", rules.ALERT_RULES, ["delivery: " + (blocker or "recipients configured - OK")])
        print()

        def describe_alert(it: rules.AlertItem) -> str:
            return (f"{rules.aware(it.alert.created_at, now):%d %b}  {it.alert.tier or '-':<8} "
                    f"[{it.alert.category or '-'}]  {(it.alert.headline or '')[:58]}")

        alert_totals = print_breakdown(alert_buckets, args.show, describe_alert)

    # ── 3. AI summarizer ────────────────────────────────────────────────────
    email_waiting_ai = sum(
        len(v) for b in (news_buckets, alert_buckets)
        for k, v in b[rules.WAITING].items() if k == next(r.reason() for r in rules.NEWS_RULES if r.key == "ai")
    )
    ai_ok = print_ai_status(email_waiting_ai)

    # ── 4. verdict ──────────────────────────────────────────────────────────
    head("SUMMARY")
    if not rules.setting("SEND_EMAILS", True):
        print("  !! SEND_EMAILS is False - a real run only logs, it does not send.")
    if news_blocker:
        print(f"  !! News: {news_blocker} - nothing can be sent.")
    if blocker:
        print(f"  !! Alerts: {blocker}.")
    if not ai_ok:
        print("  !! AI summarizer has a problem - see section 3. Items 'waiting for the AI' will not go out until it is fixed.")
    for label, totals, buckets in (("News  ", news_totals, news_buckets), ("Alerts", alert_totals, alert_buckets)):
        line = ", ".join(f"{totals[b]} {b.lower()}" for b in BUCKET_ORDER)
        print(f"  {label}: {line}")
        if not totals[READY] and totals[rules.NOT_SENT]:
            top = max(buckets[rules.NOT_SENT].items(), key=lambda kv: len(kv[1]))[0]
            print(f"           biggest reason: {top}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
