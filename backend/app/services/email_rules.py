"""
================================================================================
MTN QuantRisk - EMAIL ELIGIBILITY RULES (single source of truth)
================================================================================
Every rule that decides whether an article / alert is emailed lives HERE, once.

  - app/scripts/send_news_digest.py          uses NEWS_RULES + select_news_for_category()
  - app/scripts/send_alert_notifications.py  uses ALERT_RULES + alert_delivery_blocker()
  - app/scripts/explain_email_eligibility.py walks the same lists to explain the numbers

To change the rules, edit only this file (thresholds stay in app/config/email_config.py).
Add / remove / reorder a Rule in the list and both the senders and the report follow.

A Rule:
    key     short id
    bucket  NOT_SENT (dropped for good) or WAITING (may pass on a later run)
    reason  text shown in the report; a function so it always shows the live config value
    passes  function(item, ctx) -> True when the item is allowed through

Rules are checked in order; an item is reported under the FIRST rule it fails.
================================================================================
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

from app.config import email_config as cfg
from app.services.so_what_service import is_usable_summary, parse_analysis

NOT_SENT = "NOT SENT"
WAITING = "WAITING"


def setting(name: str, default: Any = None) -> Any:
    """Read an email_config value at call time (missing / commented-out settings fall back)."""
    return getattr(cfg, name, default)


def recipients(rec: Optional[dict]) -> list[str]:
    """Non-blank 'to' addresses of a recipients dict."""
    return [x.strip() for x in ((rec or {}).get("to") or []) if x and str(x).strip()]


def aware(dt: Optional[datetime], fallback: datetime) -> datetime:
    dt = dt or fallback
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def ai_complete(article) -> bool:
    return is_usable_summary(article.summary) and bool(parse_analysis(article.analysis))


@dataclass
class Rule:
    key: str
    bucket: str
    reason: Callable[[], str]
    passes: Callable[[Any, "Context"], bool]


@dataclass
class Context:
    """Everything a rule may need, computed once per run from the live config."""
    now: datetime
    sent_ids: set[str]
    max_age_days: int = field(default_factory=lambda: setting("MAX_AGE_DAYS", 7))
    min_relevance: float = field(default_factory=lambda: setting("NEWS_MIN_MTN_RELEVANCE", 0.0))
    alert_tiers: list = field(default_factory=lambda: list(setting("ALERT_TIERS_TO_SEND", []) or []))

    @property
    def cutoff(self) -> datetime:
        return self.now - timedelta(days=self.max_age_days)

    @property
    def digest_categories(self) -> set[str]:
        """Categories whose articles are selected (and always go to Head of Risks)."""
        return {c.lower() for c in news_categories()}

    @property
    def team_categories(self) -> set[str]:
        """Categories that ALSO get their own team email (have a 'to' address in NEWS_RECIPIENTS)."""
        news = setting("NEWS_RECIPIENTS", None) or {}
        return {c.lower() for c, r in news.items() if recipients(r)}


def news_categories() -> list[str]:
    """NEWS_CATEGORIES, falling back to the NEWS_RECIPIENTS keys when it is not set."""
    cats = setting("NEWS_CATEGORIES", None) or list((setting("NEWS_RECIPIENTS", None) or {}).keys())
    return [c.lower() for c in cats]


# ── Items the rules look at ──────────────────────────────────────────────────

@dataclass
class NewsItem:
    article: Any
    risk: Any            # latest RiskScore, or None when the article was never scored

    def when(self, now: datetime) -> datetime:
        return aware(self.article.published_at or self.article.scraped_at, now)

    @property
    def category(self) -> str:
        return (self.risk.category or "").lower() if self.risk else ""


@dataclass
class AlertItem:
    alert: Any
    article: Any
    risk: Any


# ── NEWS DIGEST RULES (in order) ─────────────────────────────────────────────

NEWS_RULES: list[Rule] = [
    Rule("sent", NOT_SENT,
         lambda: "already emailed (in the sent log)",
         lambda it, ctx: it.article.id not in ctx.sent_ids),
    Rule("age", NOT_SENT,
         lambda: f"too old (more than MAX_AGE_DAYS = {setting('MAX_AGE_DAYS')} days)",
         lambda it, ctx: it.when(ctx.now) >= ctx.cutoff),
    Rule("scored", NOT_SENT,
         lambda: "never scored (not relevant to MTN Ghana, or the pipeline failed)",
         lambda it, ctx: it.risk is not None),
    Rule("category", NOT_SENT,
         lambda: f"category is not in NEWS_CATEGORIES = {news_categories()}",
         lambda it, ctx: it.category in ctx.digest_categories),
    Rule("relevance", NOT_SENT,
         lambda: f"MTN relevance below NEWS_MIN_MTN_RELEVANCE = {setting('NEWS_MIN_MTN_RELEVANCE')}",
         lambda it, ctx: (it.risk.mtn_relevance or 0) >= ctx.min_relevance),
    Rule("ai", WAITING,
         lambda: "AI summary / implications not finished yet",
         lambda it, ctx: ai_complete(it.article)),
]

# Applied after NEWS_RULES: only the best NEWS_TOP_N per category are sent in one run.
TOP_N_REASON = lambda: f"passes every rule but not in the top NEWS_TOP_N = {setting('NEWS_TOP_N')} for its category"  # noqa: E731


def first_failed_rule(item: Any, rules: list[Rule], ctx: Context) -> Optional[Rule]:
    for rule in rules:
        if not rule.passes(item, ctx):
            return rule
    return None


def news_rank_score(item: NewsItem, now: datetime) -> float:
    """Rank by recency (30%) + relevance (40%) + severity (30%)."""
    age_hours = max((now - item.when(now)).total_seconds() / 3600, 0)
    recency = max(1.0 - (age_hours / 168), 0)
    relevance = item.risk.mtn_relevance or 0
    severity = (item.risk.severity or 0) / 10.0
    return (recency * 0.30) + (relevance * 0.40) + (severity * 0.30)


def select_news_for_category(db, category: str, ctx: Context) -> tuple[list[NewsItem], int]:
    """
    The news selection used by the sender: candidates in `category` that pass every
    NEWS_RULE, ranked, top NEWS_TOP_N. Returns (selected, number held back in WAITING rules).
    """
    from app.models.article import Article
    from app.models.risk_score import RiskScore

    rows = (
        db.query(Article, RiskScore)
        .join(RiskScore, RiskScore.article_id == Article.id)
        .filter(RiskScore.category == category)
        .all()
    )
    passing: list[NewsItem] = []
    waiting = 0
    seen: set[str] = set()
    for article, risk in rows:
        if article.id in seen:
            continue
        item = NewsItem(article, risk)
        failed = first_failed_rule(item, NEWS_RULES, ctx)
        if failed is None:
            seen.add(article.id)
            passing.append(item)
        elif failed.bucket == WAITING:
            waiting += 1
    passing.sort(key=lambda it: news_rank_score(it, ctx.now), reverse=True)
    return passing[: setting("NEWS_TOP_N", 0)], waiting


# ── ALERT RULES (in order) ───────────────────────────────────────────────────

ALERT_RULES: list[Rule] = [
    Rule("sent", NOT_SENT,
         lambda: "already emailed (in the sent log)",
         lambda it, ctx: it.alert.id not in ctx.sent_ids),
    Rule("age", NOT_SENT,
         lambda: f"too old (more than MAX_AGE_DAYS = {setting('MAX_AGE_DAYS')} days)",
         lambda it, ctx: aware(it.alert.created_at, ctx.now) >= ctx.cutoff),
    Rule("tier", NOT_SENT,
         lambda: f"tier not in ALERT_TIERS_TO_SEND = {setting('ALERT_TIERS_TO_SEND')}",
         lambda it, ctx: it.alert.tier in ctx.alert_tiers),
    Rule("scored", NOT_SENT,
         lambda: "article has no risk score",
         lambda it, ctx: it.risk is not None),
    Rule("ai", WAITING,
         lambda: "AI summary / implications not finished yet",
         lambda it, ctx: ai_complete(it.article)),
]


def head_of_risks_recipients() -> list[str]:
    return recipients(setting("HEAD_OF_RISKS_RECIPIENTS", None))


def news_delivery_blocker() -> Optional[str]:
    """Why the news sender cannot send to anyone, or None. Team lists are optional."""
    if head_of_risks_recipients():
        return None
    news = setting("NEWS_RECIPIENTS", None) or {}
    if any(recipients(r) for r in news.values()):
        return None
    return "no 'to' address in HEAD_OF_RISKS_RECIPIENTS or any NEWS_RECIPIENTS team"


def alert_delivery_blocker() -> Optional[str]:
    """Why the alert sender cannot send to anyone, or None. The team list is optional."""
    if head_of_risks_recipients() or recipients(setting("ALERT_RECIPIENTS", None)):
        return None
    return "no 'to' address in HEAD_OF_RISKS_RECIPIENTS or ALERT_RECIPIENTS"


def describe_setting(value: Any) -> str:
    """Short, readable form of any email_config value (recipient lists shown as counts)."""
    if isinstance(value, dict) and ("to" in value or "cc" in value):
        cc = [x for x in (value.get("cc") or []) if x and str(x).strip()]
        return f"{len(recipients(value))} to, {len(cc)} cc"
    if isinstance(value, dict) and value and all(isinstance(v, dict) and "to" in v for v in value.values()):
        return ", ".join(f"{k}: {len(recipients(v))} to" for k, v in value.items())
    text = repr(value)
    return text if len(text) <= 90 else text[:87] + "..."
