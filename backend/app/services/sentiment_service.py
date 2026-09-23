from __future__ import annotations
"""
Sentiment analysis using HuggingFace Inference API → ProsusAI/finbert.

Modes (set SENTIMENT_MODE env var or change SENTIMENT_MODE below):
  - "model"       → FinBERT only (neutral if HF unavailable)
  - "lexicon"     → keyword lexicon only (no HF call)
  - "both"        → FinBERT if available, else lexicon, then context override
  - "hybrid_vote" → run BOTH FinBERT + lexicon, vote/merge, then context override

Get a free token at https://huggingface.co/settings/tokens
Set env var:  HF_TOKEN=
Optional:     SENTIMENT_MODE="hybrid_vote"
"""

import logging
import os
import re

logger = logging.getLogger(__name__)

# HF_TOKEN = os.environ.get("HF_TOKEN", "")
HF_TOKEN = os.environ.get("HF_TOKEN")
_FINBERT_URL = "https://router.huggingface.co/hf-inference/models/ProsusAI/finbert"

# ═══════════════════════════════════════════════════════════════════════════════
# SWITCH: change this OR set env SENTIMENT_MODE=model|lexicon|both|hybrid_vote
# ═══════════════════════════════════════════════════════════════════════════════
SENTIMENT_MODE = os.environ.get("SENTIMENT_MODE", "model").strip().lower()
# Valid: "model" | "lexicon" | "both" | "hybrid_vote"

# export SENTIMENT_MODE=model        # FinBERT only
# export SENTIMENT_MODE=lexicon      # keywords only
# export SENTIMENT_MODE=both         # FinBERT → lexicon fallback (default)
# export SENTIMENT_MODE=hybrid_vote  # run both and merge

# ── HuggingFace Inference API (FinBERT) ───────────────────────────────────────

def _hf_finbert(text: str) -> dict | None:
    """
    POST to HF Inference API. Returns sentiment dict or None on failure.
    FinBERT output: [[{"label": "positive", "score": 0.97}, ...]]
    """
    if not HF_TOKEN:
        return None
    try:
        import requests
        resp = requests.post(
            _FINBERT_URL,
            headers={"Authorization": f"Bearer {HF_TOKEN}"},
            json={"inputs": text[:512]},
            timeout=12,
        )
        if resp.status_code == 503:
            logger.debug("FinBERT model loading on HF (503)")
            return None
        if resp.status_code != 200:
            logger.warning("HF FinBERT returned %s", resp.status_code)
            return None

        payload = resp.json()
        inner = payload[0] if isinstance(payload, list) and isinstance(payload[0], list) else payload
        if not inner:
            return None
        best = max(inner, key=lambda x: x.get("score", 0))
        label = best["label"].lower()
        return {"sentiment": label, "sentiment_confidence": round(best["score"], 3)}
    except Exception as exc:
        logger.warning("HF FinBERT request failed: %s", exc)
        return None


# ── Lexicon ───────────────────────────────────────────────────────────────────

_POSITIVE_WORDS = [
    "growth", "profit", "revenue", "record", "increase", "expand", "launch",
    "award", "partnership", "investment", "success", "improve", "strong",
    "positive", "gain", "rise", "milestone", "achieve", "approve", "surge",
    "recovery", "dividend", "upgrade", "beat", "outperform", "innovation",
    "reaffirm", "commitment", "combat", "combating", "protect", "empower",
    "donate", "support", "win", "partner",
]
_NEGATIVE_WORDS = [
    "decline", "loss", "drop", "fall", "crisis", "fine", "penalty", "outage",
    "failure", "complaint", "concern", "risk", "threat", "breach", "hack",
    "reduce", "cut", "lay off", "debt", "scandal", "protest", "ban", "collapse",
    "downgrade", "miss", "shortfall", "warning", "fraud", "sue", "lawsuit",
]


def _lexicon_sentiment(text: str) -> dict:
    text_lower = text.lower()
    pos = sum(1 for w in _POSITIVE_WORDS if w in text_lower)
    neg = sum(1 for w in _NEGATIVE_WORDS if w in text_lower)
    if pos > neg:
        label, conf = "positive", min(0.9, 0.5 + pos * 0.05)
    elif neg > pos:
        label, conf = "negative", min(0.9, 0.5 + neg * 0.05)
    else:
        label, conf = "neutral", 0.6
    return {"sentiment": label, "sentiment_confidence": round(conf, 3)}


# ── Hybrid vote (true “both”) ─────────────────────────────────────────────────

def _hybrid_vote(model_result: dict | None, lexicon_result: dict) -> dict:
    """
    Merge FinBERT + lexicon into one verdict.

    Rules:
      1. If model missing → use lexicon only
      2. If labels agree → keep label, take max confidence (slightly boosted)
      3. If labels disagree → pick higher confidence; if within 0.08, prefer model
      4. If one is neutral and the other is polar → prefer the polar one if conf >= 0.55
    """
    if not model_result:
        return lexicon_result

    m_label = model_result["sentiment"]
    m_conf = model_result["sentiment_confidence"]
    l_label = lexicon_result["sentiment"]
    l_conf = lexicon_result["sentiment_confidence"]

    # Agree
    if m_label == l_label:
        return {
            "sentiment": m_label,
            "sentiment_confidence": round(min(0.98, max(m_conf, l_conf) + 0.03), 3),
        }

    # One neutral, one polar
    if m_label == "neutral" and l_label in ("positive", "negative") and l_conf >= 0.55:
        return {"sentiment": l_label, "sentiment_confidence": l_conf}
    if l_label == "neutral" and m_label in ("positive", "negative") and m_conf >= 0.55:
        return {"sentiment": m_label, "sentiment_confidence": m_conf}

    # Disagree on polarity — prefer higher confidence; model wins close calls
    if abs(m_conf - l_conf) <= 0.08:
        return {"sentiment": m_label, "sentiment_confidence": m_conf}
    if m_conf >= l_conf:
        return {"sentiment": m_label, "sentiment_confidence": m_conf}
    return {"sentiment": l_label, "sentiment_confidence": l_conf}


# ── Context-aware override ────────────────────────────────────────────────────

POSITIVE_CONTEXT_PATTERNS = [
    r"combat(?:ing|s|ed)?\s+(?:fraud|crime|scam|abuse|corruption)",
    r"fight(?:ing|s)?\s+(?:fraud|crime|scam|abuse|corruption)",
    r"tackl(?:ing|es|ed)\s+(?:fraud|crime|scam|abuse|corruption)",
    r"prevent(?:ing|s|ed)?\s+(?:fraud|crime|attack|breach|scam)",
    r"protect(?:ing|s|ed)?\s+(?:customers|users|subscribers|consumers)",
    r"reaffirm(?:s|ed|ing)?\s+commitment",
    r"commitment\s+to\s+(?:combat|fight|tackle|prevent|protect)",
    r"launch(?:es|ed|ing)?\s+(?:new|innovative|initiative)",
    r"invest(?:s|ed|ing|ment)?\s+in",
    r"expand(?:s|ed|ing|sion)?",
    r"partner(?:s|ed|ing|ship)?\s+with",
    r"win(?:s|ning)?\s+(?:award|contract|customer)",
    r"donat(?:es|ed|ing|ion)",
    r"support(?:s|ed|ing)?\s+(?:community|education|health|customers)",
    r"empower(?:s|ed|ing|ment)",
    r"innovat(?:es|ed|ing|ion)",
    r"upgrade(?:s|d)?\s+(?:network|system|service)",
    r"improv(?:es|ed|ing|ement)",
    r"achiev(?:es|ed|ing|ement)",
    r"grow(?:s|ing|th)",
    r"record\s+(?:profit|revenue|growth|subscribers)",
    r"boost(?:s|ed|ing)?",
    r"strengthen(?:s|ed|ing)?",
    r"hacker(?:ton)?",
]

NEGATIVE_CONTEXT_PATTERNS = [
    r"suffer(?:s|ed|ing)?\s+(?:from|breach|attack|outage|loss)",
    r"hit\s+by",
    r"fined\s+(?:for|by)",
    r"fine\s+(?:of|imposed)",
    r"loses?\s+(?:customer|market|revenue|licence|license)",
    r"declin(?:es|ed|ing)",
    r"disrupt(?:s|ed|ion)",
    r"\boutage\b",
    r"\bdowntime\b",
    r"\bblackout\b",
    r"\bscandal\b",
    r"sued?\s+by",
    r"lawsuit\s+against",
    r"\bstrike\b",
    r"protest\s+against",
    r"accused\s+of",
    r"investigat(?:ed|ion)\s+(?:for|over|into)",
    r"suspend(?:s|ed|ing)",
    r"breach(?:es|ed)?",
    r"hack(?:ed|ing)?",
    r"ransomware",
]


def refine_sentiment(text: str, ai_sentiment: str, ai_confidence: float) -> tuple[str, float]:
    """
    Domain override for MTN context.
    Example: "reaffirms commitment to combating fraud" → positive
    """
    text_lower = text.lower()

    positive_matches = sum(1 for p in POSITIVE_CONTEXT_PATTERNS if re.search(p, text_lower))
    negative_matches = sum(1 for p in NEGATIVE_CONTEXT_PATTERNS if re.search(p, text_lower))

    if positive_matches >= 1 and ai_sentiment == "negative":
        if ai_confidence < 0.95 or positive_matches >= 2:
            return "positive", round(min(0.85, 0.5 + positive_matches * 0.15), 3)

    if negative_matches >= 1 and ai_sentiment == "positive":
        if ai_confidence < 0.95 or negative_matches >= 2:
            return "negative", round(min(0.85, 0.5 + negative_matches * 0.15), 3)

    if positive_matches >= 1 and negative_matches >= 1:
        return "neutral", 0.6

    if positive_matches >= 1 and ai_sentiment == "positive":
        return "positive", round(min(0.95, ai_confidence + 0.05), 3)
    if negative_matches >= 1 and ai_sentiment == "negative":
        return "negative", round(min(0.95, ai_confidence + 0.05), 3)

    return ai_sentiment, ai_confidence


# ── Main entry point ──────────────────────────────────────────────────────────

def run_sentiment(text: str, mode: str | None = None) -> dict:
    """
    Returns { sentiment, sentiment_confidence, mode_used }

    mode override (optional): "model" | "lexicon" | "both" | "hybrid_vote"
    If mode is None, uses SENTIMENT_MODE global/env switch.
    """
    active_mode = (mode or SENTIMENT_MODE or "both").strip().lower()
    if active_mode not in {"model", "lexicon", "both", "hybrid_vote"}:
        logger.warning("Unknown SENTIMENT_MODE=%r — defaulting to 'both'", active_mode)
        active_mode = "both"

    # ── 1) Raw result by mode ─────────────────────────────────────────────────
    if active_mode == "model":
        result = _hf_finbert(text)
        if not result:
            # Pure model mode: do NOT fall back to lexicon
            result = {"sentiment": "neutral", "sentiment_confidence": 0.5}
            logger.debug("model mode: HF unavailable → neutral fallback")

    elif active_mode == "lexicon":
        result = _lexicon_sentiment(text)

    elif active_mode == "hybrid_vote":
        model_result = _hf_finbert(text)
        lexicon_result = _lexicon_sentiment(text)
        result = _hybrid_vote(model_result, lexicon_result)
        logger.debug(
            "hybrid_vote: model=%s lexicon=%s → %s",
            model_result, lexicon_result, result,
        )

    else:  # "both"  (default: model preferred, lexicon fallback)
        result = _hf_finbert(text)
        if not result:
            result = _lexicon_sentiment(text)
            logger.debug("both mode: HF unavailable → lexicon fallback")

    raw_sentiment = result["sentiment"]
    raw_confidence = result["sentiment_confidence"]

    # ── 2) Always apply MTN context override ──────────────────────────────────
    final_sentiment, final_confidence = refine_sentiment(
        text, raw_sentiment, raw_confidence
    )

    if final_sentiment != raw_sentiment:
        logger.info(
            "Sentiment override [%s]: '%s' (%.2f) → '%s' (%.2f) | text[:80]=%r",
            active_mode, raw_sentiment, raw_confidence,
            final_sentiment, final_confidence, text[:80],
        )

    return {
        "sentiment": final_sentiment,
        "sentiment_confidence": final_confidence,
        "mode_used": active_mode,  # useful for debugging / UI later
    }