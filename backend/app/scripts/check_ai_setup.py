"""
================================================================================
MTN QuantRisk - AI SETUP CHECK  (safe to run any time; changes nothing)
================================================================================
Run from the backend folder:

    python app/scripts/check_ai_setup.py

It checks, in plain English:
  1. that your .env has the AI settings,
  2. that the AI account/token works,
  3. that the AI can write a real summary + implications for a sample news item.

At the end it prints PASS or FAIL and exactly what to fix.
================================================================================
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.services import llm_client                       # noqa: E402
from app.services.so_what_service import generate_ai_content  # noqa: E402

LINE = "=" * 78


def heading(text: str) -> None:
    print(f"\n{LINE}\n{text}\n{LINE}")


def main() -> int:
    heading("STEP 1 of 3 — Reading your settings (.env)")
    configured = llm_client.describe_configuration()
    if not configured:
        print("FAIL: No AI provider is set up.")
        print("  → Open backend/.env and add this line (with YOUR token, no spaces, no quotes):")
        print("        HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxx")
        print("  → Then run this check again.")
        return 1
    for line in configured:
        print(f"  Found: {line}")

    heading("STEP 2 of 3 — Testing the AI account")
    results = llm_client.diagnose()
    any_ok = False
    for r in results:
        mark = "OK  " if r["status"] == 200 and r["reply"] else "FAIL"
        print(f"  [{mark}] {r['provider']} / {r['model']}")
        print(f"         {r['explain']}")
        if r["status"] == 200 and r["reply"]:
            any_ok = True
    if not any_ok:
        print("\nFAIL: The AI could not be reached with the current settings. Fix the message above, then run this check again.")
        return 1

    heading("STEP 3 of 3 — Writing a sample summary and implications (takes up to a minute)")
    sample = generate_ai_content(
        "NCA directs mobile operators to complete SIM re-registration within 30 days",
        "The National Communications Authority has directed all mobile network operators in Ghana to "
        "ensure every active SIM card is registered with a valid Ghana Card within 30 days. Operators "
        "that fail to comply risk sanctions including fines, according to the directive issued in Accra.",
        source_name="Sample",
        category="governance",
        subcategory="Compliance",
        sentiment="neutral",
        severity=6.0,
        alert_tier="Warning",
        mtn_relevance=0.9,
    )
    if not sample:
        print("FAIL: The account works, but the AI did not return a usable answer.")
        print("  → Run this check once more (it can be a temporary glitch).")
        print("  → If it keeps failing, change the model: in .env set  HF_MODELS=meta-llama/Llama-3.3-70B-Instruct")
        return 1

    a = sample["analysis"]
    print(f"  Model used  : {a.get('generated_by')}")
    print(f"  Summary     : {sample['summary']}")
    print(f"  Matters     : {a['why_it_matters_to_mtn']}")
    print(f"  Impact      : {a['impact']}  ({a['impact_reason']})")
    print(f"  First action: {a['recommended_actions'][0]}")

    heading("RESULT: PASS ✔  — the AI is set up correctly.")
    print("You can now start the backend. News summaries and 'Implications' panels will fill in on their own.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())