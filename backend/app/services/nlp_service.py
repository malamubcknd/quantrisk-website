from __future__ import annotations
"""
NLP service — spaCy NER + keyword classifier + HF zero-shot category validation.
Supports dynamic MTN 2-layer universe mapping (6 Categories, 28 Clean Subcategories + Other).
"""

import logging
import os
import re
from typing import Optional

logger = logging.getLogger(__name__)

HF_TOKEN = os.environ.get("HF_TOKEN", "")
_ZEROSHOT_URL = "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli"
_CANDIDATE_LABELS = ["strategic", "governance", "financial", "technology", "operational", "external"]

# ── spaCy (optional) ──────────────────────────────────────────────────────────

_nlp = None

def _get_nlp():
    global _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load("en_core_web_sm")
            logger.info("spaCy en_core_web_sm loaded")
        except Exception as exc:
            logger.warning("spaCy not available (%s) — using keyword-only NER", exc)
            _nlp = False
    return _nlp if _nlp else None


# ── MTN relevance ─────────────────────────────────────────────────────────────

MTN_KEYWORDS = [
    "MTN", "MoMo", "MTN Ghana", "MTN GH", "MTN Group", "mobile money",
    "mtn.com.gh", "MTN Nigeria", "Y'ello", "MTNN",
]

GHANA_KEYWORDS = [
    "Ghana", "Accra", "Kumasi", "Cedi", "GHS", "NCA", "Bank of Ghana",
    "BoG", "AirtelTigo", "Vodafone Ghana", "telecom Ghana",
]


def compute_mtn_relevance(text: str) -> float:
    """
    Returns 0.0–1.0 based on how many MTN/Ghana keywords appear.
    Hard minimum 0.1 for any Ghana article (we scrape Ghana-focused sources).
    """
    text_lower = text.lower()
    mtn_hits = sum(1 for kw in MTN_KEYWORDS if kw.lower() in text_lower)
    ghana_hits = sum(1 for kw in GHANA_KEYWORDS if kw.lower() in text_lower)
    score = min(1.0, (mtn_hits * 0.35) + (ghana_hits * 0.1) + 0.1)
    return round(score, 3)


# ── Risk taxonomy classification (2-layer MTN Universe - No Numbering) ─────────

TAXONOMY = {
    "strategic": {
        "Strategic & Execution": [
            "portfolio", "strategic execution", "top strategic", "strategic initiatives",
            "business execution", "corporate goals", "vision 2025", "long-term objectives",
            "strategic direction", "execution failure"
        ],
        "Regulatory & Stakeholders": [
            "regulatory change", "nca", "communications authority", "legislation", "influence regulation",
            "government stakeholder", "policy maker", "stakeholders", "regulatory requirements"
        ],
        "Products and Innovation": [
            "innovation", "industry development", "disruptive tech", "new products",
            "product launch", "market disruption", "telecom services", "digital solutions"
        ],
        "M&A, Divestitures and Strategic Partnerships": [
            "merger", "acquisition", "divestiture", "disposal", "joint venture", "takeover",
            "strategic partnership", "m&a", "partnership management"
        ]
    },
    "governance": {
        "Compliance": [
            "compliance", "non-compliance", "laws", "regulations", "internal policy", "procedures",
            "audit findings", "regulatory compliance", "policy breach"
        ],
        "Internal Control Environment": [
            "internal control", "mitigate", "remediation", "audit control", "control failure",
            "process gaps", "control environment"
        ],
        "Fraud and Financial Crime": [
            "fraud", "financial crime", "embezzlement", "bribe", "corruption", "laundering", "aml",
            "insider threat", "scam"
        ],
        "Governance": [
            "board of directors", "decision-making", "governance structure", "fiduciary duty",
            "governance failure", "shareholder meeting", "executive management"
        ],
        "Social and Ethics": [
            "ethics", "ethical standards", "social expectation", "environmental expectation",
            "whistleblower", "code of conduct", "social responsibility", "csr"
        ]
    },
    "financial": {
        "Financial Markets": [
            "exchange rate", "volatility", "cedi", "forex", "fx", "dollar", "currency", "devaluation",
            "depreciation", "appreciation", "currency hedging"
        ],
        "Liquidity and Funding": [
            "liquidity", "short-term", "funding cost", "debt repayment", "credit facility",
            "capital structure", "obligations", "interest rate", "cash flow"
        ],
        "Tax": [
            "tax", "taxation", "gra", "ghana revenue authority", "transfer pricing", "tax audit",
            "customs", "vat", "corporate tax"
        ],
        "Financial Accounting and Reporting": [
            "accounting", "reporting error", "inaccuracy", "audit restatement", "ifrs", "financial statements",
            "accounting standards"
        ],
        "Credit Risk": [
            "credit risk", "counterparty", "default", "bad debt", "receivable", "debt collection",
            "borrower default"
        ],
        "Financial Performance & Returns": [
            "revenue", "profit", "ebitda", "arpu", "shareholder expectation", "earnings", "dividend",
            "financial health", "returns"
        ]
    },
    "technology": {
        "Network": [
            "network performance", "outage", "downtime", "fibre cut", "4g", "5g", "spectrum",
            "cell tower", "base station", "signal", "telecom network", "bts"
        ],
        "Information Technology": [
            "information technology", "system failure", "legacy system", "software bug", "billing system",
            "it infrastructure", "erp", "migration"
        ],
        "Information Security": [
            "information security", "cybersecurity", "cyber attack", "data breach", "hack", "ransomware",
            "confidentiality", "credentials leak", "phishing"
        ]
    },
    "operational": {
        "Supply Chain": [
            "supply chain", "vendor", "supplier", "procurement", "inventory shortage", "logistics",
            "single-source"
        ],
        "Sales and Distribution": [
            "sales", "distribution", "inventory", "customer onboarding", "sim registration",
            "agents", "distributor", "dealer"
        ],
        "Customer Experience": [
            "customer experience", "customer satisfaction", "churn", "service level", "cx",
            "customer care", "nps", "complaints"
        ],
        "Continuity Risk": [
            "business continuity", "disaster recovery", "resilience", "major disruption",
            "crisis management"
        ],
        "Human Capital": [
            "human capital", "talent retention", "key person", "strike", "labor dispute", "skills",
            "recruitment", "turnover"
        ],
        "Environment": [
            "carbon footprint", "waste management", "climate change", "flooding", "environmental impact",
            "green energy", "e-waste"
        ],
        "Reputation, Branding and Marketing": [
            "reputation", "brand damage", "marketing campaign", "pr", "public relations",
            "negative publicity", "backlash", "controversy"
        ]
    },
    "external": {
        "Competition": [
            "competition", "competitor", "vodafone", "telecel", "airteltigo", "market share",
            "price war", "pricing pressure", "rivalry"
        ],
        "Legal": [
            "legal", "contractual", "litigation", "lawsuit", "court", "arbitration", "dispute",
            "legal counsel", "damages"
        ],
        "Political and Macroeconomy": [
            "political", "macroeconomic", "gdp", "election", "inflation", "monetary policy",
            "sovereign rating", "government debt", "npp", "ndc"
        ]
    }
}

CATEGORY_WEIGHTS = {
    "strategic": 1.2,
    "financial": 1.1,
    "technology": 1.1,
    "operational": 1.0,
    "governance": 0.9,
    "external": 0.8,
}


def classify_risk_category_and_subcategory(text: str) -> tuple[str, str, float, dict]:
    """
    Classifies risk into one of MTN's 6 categories and 28 subcategories (names without number prefixes).
    Returns (category, subcategory, raw_score_0_to_10, keyword_hits_per_subcategory).
    """
    text_lower = text.lower()
    subcat_hits = {}

    for cat, subcats in TAXONOMY.items():
        for subcat, keywords in subcats.items():
            count = 0
            for kw in keywords:
                pattern = re.compile(r'\b' + re.escape(kw.lower()) + r'\b')
                count += len(pattern.findall(text_lower))
            subcat_hits[subcat] = count

    best_subcat = None
    best_subcat_count = 0
    for subcat, count in subcat_hits.items():
        if count > best_subcat_count:
            best_subcat_count = count
            best_subcat = subcat

    if best_subcat_count == 0 or not best_subcat:
        return "other", "Other", 1.0, subcat_hits

    best_cat = "other"
    for cat, subcats in TAXONOMY.items():
        if best_subcat in subcats:
            best_cat = cat
            break

    weight = CATEGORY_WEIGHTS.get(best_cat, 1.0)
    raw_score = min(10.0, best_subcat_count * 1.5 * weight)
    return best_cat, best_subcat, round(raw_score, 2), subcat_hits


# ── spaCy NER ─────────────────────────────────────────────────────────────────

def extract_entities(text: str) -> dict:
    nlp = _get_nlp()
    if nlp:
        try:
            doc = nlp(text[:5000])
            return {
                "orgs":      [ent.text for ent in doc.ents if ent.label_ == "ORG"][:10],
                "money":     [ent.text for ent in doc.ents if ent.label_ == "MONEY"][:10],
                "locations": [ent.text for ent in doc.ents if ent.label_ in ("GPE", "LOC")][:10],
                "persons":   [ent.text for ent in doc.ents if ent.label_ == "PERSON"][:10],
            }
        except Exception as exc:
            logger.warning("spaCy NER failed: %s", exc)

    text_lower = text.lower()
    orgs = [kw for kw in ["MTN", "NCA", "Bank of Ghana", "Vodafone", "AirtelTigo", "GRA", "IMF"]
            if kw.lower() in text_lower]
    return {"orgs": orgs, "money": [], "locations": [], "persons": []}


# ── HF Zero-shot category classifier ─────────────────────────────────────────

def _hf_zeroshot_category(text: str) -> dict | None:
    if not HF_TOKEN:
        return None
    try:
        import requests
        resp = requests.post(
            _ZEROSHOT_URL,
            headers={"Authorization": f"Bearer {HF_TOKEN}"},
            json={
                "inputs": text[:800],
                "parameters": {"candidate_labels": _CANDIDATE_LABELS, "multi_label": False},
            },
            timeout=20,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        labels = data.get("labels", [])
        scores = data.get("scores", [])
        if not labels:
            return None
        score_dict = {l: round(s, 4) for l, s in zip(labels, scores)}
        top_cat = max(score_dict, key=score_dict.get)
        return {"category": top_cat, "scores": score_dict}
    except Exception as exc:
        logger.debug("HF zero-shot failed: %s", exc)
        return None


# ── Main entry point ──────────────────────────────────────────────────────────

def run_nlp(title: str, body: str) -> dict:
    full_text = f"{title} {body}"
    mtn_relevance = compute_mtn_relevance(full_text)
    kw_category, kw_subcategory, kw_severity, subcat_hits = classify_risk_category_and_subcategory(full_text)
    entities = extract_entities(full_text)

    zs = _hf_zeroshot_category(full_text[:800])
    if zs and zs["scores"].get(zs["category"], 0) > 0.55:
        category = zs["category"]
        valid_subcats = TAXONOMY.get(category, {})
        best_sub = "Other"
        best_sub_cnt = -1
        for sub in valid_subcats:
            if subcat_hits.get(sub, 0) > best_sub_cnt:
                best_sub_cnt = subcat_hits[sub]
                best_sub = sub
        subcategory = best_sub
        
        zs_conf = zs["scores"][category]
        severity = round(kw_severity * 0.6 + (zs_conf * 10) * 0.4, 2)
        confidence = round(min(1.0, zs_conf * 0.8 + 0.2), 3)
    else:
        category = kw_category
        subcategory = kw_subcategory
        severity = kw_severity
        best_hits = subcat_hits.get(subcategory, 0)
        confidence = min(1.0, best_hits * 0.15 + 0.2)

    return {
        "mtn_relevance": mtn_relevance,
        "category": category,
        "subcategory": subcategory,
        "severity": round(severity, 2),
        "confidence": round(confidence, 3),
        "entities": entities,
        "keyword_hits": subcat_hits,
    }