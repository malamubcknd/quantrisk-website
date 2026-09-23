# from __future__ import annotations
# """
# Financial impact estimation — converts category + severity + mtn_relevance
# into GHS exposure range (min / mid / max).
# """

# # Base exposure in GHS (millions) per risk category — reviewed with MTN business
# CATEGORY_BASE_EXPOSURE_GHSm = {
#     "regulatory":   120.0,   # licence fines, tariff changes → large base
#     "fx_financial": 200.0,   # Cedi moves hit entire cost base
#     "competitive":   80.0,   # subscriber/ARPU pressure
#     "operational":   60.0,   # network outage revenue leakage
#     "political":     50.0,   # policy uncertainty
#     "reputational":  40.0,   # brand damage, churn trigger
# }

# DEFAULT_BASE = 60.0   # fallback for unknown category


# def estimate_impact(
#     category: str,
#     severity: float,      # 0.0–10.0
#     mtn_relevance: float, # 0.0–1.0
#     confidence: float,    # 0.0–1.0
# ) -> dict:
#     """
#     Returns { impact_ghs_min, impact_ghs_mid, impact_ghs_max } in GHS millions.
#     Formula: mid = base × (severity/10) × mtn_relevance × confidence
#     """
#     base = CATEGORY_BASE_EXPOSURE_GHSm.get(category, DEFAULT_BASE)
#     mid = base * (severity / 10.0) * mtn_relevance * max(confidence, 0.2)
#     return {
#         "impact_ghs_min": round(mid * 0.30, 2),
#         "impact_ghs_mid": round(mid, 2),
#         "impact_ghs_max": round(mid * 2.50, 2),
#     }


# def compute_alert_tier(severity: float, mtn_relevance: float) -> str | None:
#     """
#     Returns 'Critical' / 'Warning' / 'Watch' / None based on severity.
#     Only escalates when mtn_relevance is meaningful (≥ 0.25).
#     """
#     if mtn_relevance < 0.25:
#         return None
#     if severity >= 7.5:
#         return "Critical"
#     if severity >= 5.0:
#         return "Warning"
#     if severity >= 3.0:
#         return "Watch"
#     return None






# from __future__ import annotations
# """
# Financial impact estimation — converts category + severity + mtn_relevance
# into GHS exposure range (min / mid / max).
# """

# # Base exposure in GHS (millions) per risk category — updated with 6 MTN Ghana categories
# CATEGORY_BASE_EXPOSURE_GHSm = {
#     "financial":    200.0,   # Cedi moves, liquidity issues, performance hit entire cost base
#     "strategic":    150.0,   # long-term targets execution, regulatory shifts
#     "technology":   100.0,   # network downtime, cybersecurity breach, billing issues
#     "operational":   80.0,   # supply chain failure, distribution disruptions
#     "governance":    70.0,   # non-compliance fines, internal control failure, fraud
#     "external":      60.0,   # competitive market wars, legal disputes
#     "other":         20.0,   # low default baseline
# }

# DEFAULT_BASE = 50.0   # fallback for unknown categories


# def estimate_impact(
#     category: str,
#     severity: float,      # 0.0–10.0
#     mtn_relevance: float, # 0.0–1.0
#     confidence: float,    # 0.0–1.0
# ) -> dict:
#     """
#     Returns { impact_ghs_min, impact_ghs_mid, impact_ghs_max } in GHS millions.
#     Formula: mid = base × (severity/10) × mtn_relevance × confidence
#     """
#     base = CATEGORY_BASE_EXPOSURE_GHSm.get(category.lower(), DEFAULT_BASE)
#     mid = base * (severity / 10.0) * mtn_relevance * max(confidence, 0.2)
#     return {
#         "impact_ghs_min": round(mid * 0.30, 2),
#         "impact_ghs_mid": round(mid, 2),
#         "impact_ghs_max": round(mid * 2.50, 2),
#     }


# def compute_alert_tier(severity: float, mtn_relevance: float) -> str | None:
#     """
#     Returns 'Critical' / 'Warning' / 'Watch' / None based on severity.
#     Only escalates when mtn_relevance is meaningful (≥ 0.25).
#     """
#     if mtn_relevance < 0.50:
#         return None
#     if severity >= 8.0:
#         return "Critical"
#     if severity >= 6.0:
#         return "Warning"
#     if severity >= 5.0:
#         return "Watch"
#     return None


from __future__ import annotations
"""
Financial impact estimation — converts category + severity + mtn_relevance
into GHS exposure range. Built on MTN Ghana's ~12.5 Billion GHS Annual Revenue baseline.
"""

# Real-world baseline: MTN Ghana annual revenue is approx 12.5 Billion GHS.
MTN_ANNUAL_REVENUE_GHS = 12500.0  # In Millions (12.5B)

# Maximum percentage of annual revenue at risk per category if a Severity 10 event occurs.
# Based on standard telecom ERM risk distribution.
CATEGORY_MAX_REVENUE_LOSS_PCT = {
    "financial":    0.08,  # 8% of revenue at risk (1 Billion GHS)
    "strategic":    0.06,  # 6% of revenue at risk (750M GHS)
    "technology":   0.05,  # 5% of revenue at risk (625M GHS)
    "operational":  0.04,  # 4% of revenue at risk (500M GHS)
    "governance":   0.03,  # 3% of revenue at risk (375M GHS)
    "external":     0.03,  # 3% of revenue at risk (375M GHS)
    "other":        0.01,  # 1%
}

def estimate_impact(
    category: str,
    severity: float,      # 0.0–10.0
    mtn_relevance: float, # 0.0–1.0
    confidence: float,    # 0.0–1.0
    sentiment: str = "neutral"
) -> dict:
    """
    Returns { impact_ghs_min, impact_ghs_mid, impact_ghs_max } in GHS millions.
    If sentiment is positive, financial risk is 0 (it's good news).
    """
    if sentiment == "positive" or severity < 0.5:
        return {"impact_ghs_min": 0.0, "impact_ghs_mid": 0.0, "impact_ghs_max": 0.0}

    # 1. What is the absolute worst case loss for this category?
    max_loss_pct = CATEGORY_MAX_REVENUE_LOSS_PCT.get(category.lower(), 0.01)
    worst_case_ghs_m = MTN_ANNUAL_REVENUE_GHS * max_loss_pct

    # 2. Scale by how severe the event is, and how relevant it is to MTN
    # Formula: Worst Case * (Severity/10) * Relevance
    mid_impact = worst_case_ghs_m * (severity / 10.0) * mtn_relevance

    # 3. Dynamic uncertainty spread based on AI confidence. 
    # High confidence = +/- 20%. Low confidence = +/- 60%
    uncertainty_margin = 1.0 - confidence  # If confidence is 0.8, margin is 0.2 (20%)
    uncertainty_margin = max(0.15, min(0.60, uncertainty_margin)) # Bound between 15% and 60%

    min_impact = mid_impact * (1.0 - uncertainty_margin)
    max_impact = mid_impact * (1.0 + uncertainty_margin)

    return {
        "impact_ghs_min": round(min_impact, 2),
        "impact_ghs_mid": round(mid_impact, 2),
        "impact_ghs_max": round(max_impact, 2),
    }


def compute_alert_tier(severity: float, mtn_relevance: float, sentiment: str = "neutral") -> str | None:
    """
    Returns 'Critical' / 'Warning' / 'Watch' / None.
    Uses 'Effective Severity' (severity * relevance) so global news doesn't trigger false Criticals.
    Ignores positive news.
    """
    if mtn_relevance < 0.25 or sentiment == "positive" or sentiment == "neutral":
        return None

    # EFFECTIVE SEVERITY: A severity 10 event with 0.3 relevance is effectively a 3.0 to MTN.
    effective_severity = severity * mtn_relevance

    if effective_severity >= 7.0:
        return "Critical"
    if effective_severity >= 5.0:
        return "Warning"
    if effective_severity >= 3.0:
        return "Watch"
        
    return None
