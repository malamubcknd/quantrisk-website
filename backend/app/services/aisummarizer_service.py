from __future__ import annotations
"""
AI Summarizer Service — Hybrid Neural + High-Fidelity Context Synthesis
Generates rich, multi-sentence executive summaries guaranteed to bridge 
global/local news to specific MTN Ghana business risk/opportunity vectors.
"""

import logging
import os
import re
import threading
import time
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

HF_TOKEN = os.environ.get("HF_TOKEN", "").strip()

_HF_ENDPOINTS = [
    "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
    "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn",
]


def _clean_text_for_ai(title: str | None, body: str | None) -> str:
    """Strips web scraper noise, HTML tags, and publisher boilerplate."""
    t = str(title or "").strip()
    b = str(body or "").strip()
    raw = f"{t}. {b}"

    raw = re.sub(r'(?i)table of contents\s*', '', raw)
    raw = re.sub(r'(?i)what is the .*?\?', '', raw)
    raw = re.sub(r'(?i)read (?:also|more):?.*?(?=\.|$)', '', raw)
    raw = re.sub(r'(?i)click here.*?(?=\.|$)', '', raw)
    raw = re.sub(r'(?i)share this:?.*?(?=\.|$)', '', raw)
    raw = re.sub(r'\s*[-–—|]\s*(?:Asaase Radio|MyJoyOnline|Joy Online|Citi Newsroom|Graphic Online|BusinessGhana|GhanaWeb|B&FT Online|Daily Graphic).*$', '', raw)
    raw = re.sub(r'\s+', ' ', raw).strip()
    return raw


def _hf_summarize(text: str) -> str | None:
    """POST to HuggingFace Inference API with safety fallbacks."""
    token = os.environ.get("HF_TOKEN", "").strip() or HF_TOKEN
    if not token or len(text.strip()) < 80:
        return None

    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "inputs": text[:1500],
        "parameters": {"max_length": 130, "min_length": 40, "do_sample": False},
        "options": {"wait_for_model": True}
    }

    for endpoint in _HF_ENDPOINTS:
        try:
            import requests
            resp = requests.post(endpoint, headers=headers, json=payload, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    res = data[0].get("summary_text", "").strip()
                    if res and len(res) > 30:
                        return res
        except Exception:
            continue
    return None


def _synthesize_mtn_impact(title: str, category: str) -> str:
    """
    Expert system to generate smart business vectors 
    translating any headline to MTN Ghana's commercial landscape.
    """
    t_lower = title.lower()
    cat = (category or "").lower().strip()

    # 1. Device Launches (e.g. OPPO, iPhone, Huawei)
    if any(kw in t_lower for kw in ["oppo", "huawei", "samsung", "iphone", "xiaomi", "flagship", "smartphone", "device", "cameras"]):
        return "This flagship device launch presents an opportunity for MTN Ghana to drive high-value data package subscriptions, stimulate 4G/5G network utilization, and expand device ecosystem partnerships."

    # 2. Mobile Money / Fintech
    if any(kw in t_lower for kw in ["momo", "mobile money", "fintech", "payment", "wallet", "cashless", "bank", "remittance"]):
        return "This directly influences MTN Ghana's Mobile Money (MoMo) ecosystem growth, digital service adoption curves, and transactional commission revenues in the region."

    # 3. Earnings / Performance / Profit
    if any(kw in t_lower for kw in ["profit", "growth", "dividend", "revenue", "results", "h1", "h2", "fy", "quarterly"]):
        return "This financial milestone highlights strong underlying operational performance and robust liquidity management, supporting MTN Ghana's aggressive infrastructure reinvestment and dividend strategies."

    # 4. Regulatory / Taxes / Government
    if any(kw in t_lower for kw in ["nca", "tax", "government", "ministry", "policy", "regulatory", "court", "lawsuit", "compliance", "fine"]):
        return "This regulatory development warrants careful compliance oversight and active stakeholder engagement to minimize potential margin compression and operating friction."

    # 5. Network / Technology Infrastructure
    if any(kw in t_lower for kw in ["network", "spectrum", "fiber", "submarine", "internet", "outage", "data price", "tariffs"]):
        return "This bears immediate implications for MTN Ghana's network resilience, spectrum strategy, capital expenditure allocations, and digital consumer trust."

    # Category Fallbacks
    if "financial" in cat:
        return "For MTN Ghana, this development highlights critical macro-financial exposure, interest rate/inflation metrics, and operating cost trajectories."
    elif "strategic" in cat or "regulatory" in cat:
        return "This shift alters the regulatory playing field, potentially requiring MTN Ghana to recalibrate its domestic tariff compliance and retail distribution models."
    elif "technology" in cat:
        return "This highlights infrastructure development and technology optimization vectors relevant to MTN Ghana's ongoing 4G/5G network capitalization."

    return "This presents operational and commercial risk considerations relevant to MTN Ghana's domestic telecom market share and digital business lines."


def _generate_high_fidelity_fallback(title: str, body: str, category: str) -> str:
    """Constructs a beautifully cohesive, multi-sentence executive summary when neural API is offline."""
    clean_title = re.sub(r'\s*[-–—|]\s*(?:Asaase Radio|MyJoyOnline|Joy Online|Citi Newsroom|Graphic Online|BusinessGhana|GhanaWeb|B&FT Online|Daily Graphic).*$', '', title).strip().rstrip('.')
    
    # Extract clean body text
    body_snippet = ""
    if body and len(body.strip()) > 50:
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', body) if len(s.strip()) > 30]
        # Clean sentences, filtering out titles or junk
        valid = [
            s for s in sentences 
            if clean_title.lower() not in s.lower() 
            and "table of content" not in s.lower()
            and "click here" not in s.lower()
        ]
        if valid:
            body_snippet = valid[0].rstrip('.') + '.'

    impact_statement = _synthesize_mtn_impact(clean_title, category)

    if body_snippet:
        return f"{clean_title}. {body_snippet} {impact_statement}"
    return f"{clean_title}. {impact_statement}"


def generate_ai_summary(
    title: str | None, 
    body: str | None = "", 
    category: str | None = "", 
    mtn_relevance: float = 1.0,
    sentiment: str | None = "neutral"
) -> str:
    """Generates an executive-grade AI summary combining neural output with mandatory MTN impact analysis."""
    t = str(title or "").strip()
    b = str(body or "").strip()
    c = str(category or "").strip()

    if not t:
        return "Summary not available"

    clean_text = _clean_text_for_ai(t, b)
    impact_statement = _synthesize_mtn_impact(t, c)

    # 1. Try Hugging Face Neural Model
    hf_summary = _hf_summarize(clean_text)
    if hf_summary:
        # Avoid duplication if HF already mentioned MTN Ghana
        if "mtn" in hf_summary.lower():
            return hf_summary
        return f"{hf_summary} {impact_statement}"

    # 2. Local Expert Fallback
    return _generate_high_fidelity_fallback(t, b, c)


def backfill_missing_summaries_async():
    """Background worker that regenerates missing, failed, or basic summaries on startup."""
    def _worker():
        from ..models.database import SessionLocal
        from ..models.article import Article
        from ..models.risk_score import RiskScore

        time.sleep(3)
        logger.info("Starting background summary backfill...")

        with SessionLocal() as db:
            # We select None, empty, "Summary not available", or basic one-sentence fallback placeholders
            unsummarized = (
                db.query(Article)
                .join(RiskScore, RiskScore.article_id == Article.id)
                .filter(
                    (Article.summary == None) | 
                    (Article.summary == "") | 
                    (Article.summary == "Summary not available") |
                    (Article.summary.like("%. Presents %")) # Cleans up outdated simple fallback placeholders
                )
                .all()
            )
            article_ids = [a.id for a in unsummarized]

        logger.info("Found %d articles to summarize/upgrade.", len(article_ids))

        success_count = 0
        for aid in article_ids:
            with SessionLocal() as db:
                art = db.get(Article, aid)
                if not art:
                    continue
                risk_score = db.query(RiskScore).filter(RiskScore.article_id == aid).first()
                cat = risk_score.category if risk_score else ""
                sent = risk_score.sentiment if risk_score else "neutral"
                rel = risk_score.mtn_relevance if risk_score else 1.0

                art.summary = generate_ai_summary(
                    title=art.title,
                    body=art.body or "",
                    category=cat,
                    mtn_relevance=rel,
                    sentiment=sent
                )
                db.commit()
                success_count += 1
                logger.info("[%d/%d] Summarized: %s", success_count, len(article_ids), art.title[:45])
            time.sleep(0.5)

        logger.info("Summary backfill complete. %d articles processed.", success_count)

    t = threading.Thread(target=_worker, daemon=True)
    t.start()