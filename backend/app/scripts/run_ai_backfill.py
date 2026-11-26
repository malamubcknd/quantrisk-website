"""
================================================================================
MTN QuantRisk - RUN THE AI BACKFILL NOW
================================================================================
Writes the AI summary + implications for every article that still needs them,
instead of waiting for the automatic cycles (start-up pass + every 10 minutes).

Run from the backend folder:

    python app/scripts/run_ai_backfill.py              # up to 300 articles
    python app/scripts/run_ai_backfill.py --limit 1000 # more

Safe to run any time and to stop with Ctrl+C: finished articles stay finished,
the rest are picked up next time. Newest articles are done first.
================================================================================
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.models.database import init_db                                  # noqa: E402
from app.services import llm_client                                      # noqa: E402
from app.services.aisummarizer_service import (                          # noqa: E402
    count_missing_ai_content,
    fill_missing_ai_content,
)

BATCH = 25


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate missing AI summaries and implications now")
    parser.add_argument("--limit", type=int, default=300, help="maximum number of articles to process (default 300)")
    args = parser.parse_args()

    init_db()

    if not llm_client.is_available():
        print("The AI is not available — check HF_TOKEN in backend/.env and run:")
        print("    python app/scripts/check_ai_setup.py")
        return 1

    waiting = count_missing_ai_content()
    print(f"Articles waiting for AI summary / implications: {waiting}")
    if waiting == 0:
        print("Nothing to do — every article is complete.")
        return 0

    target = min(waiting, args.limit)
    done_total = 0
    started = time.time()

    try:
        while done_total < target:
            done = fill_missing_ai_content(limit=min(BATCH, target - done_total), source="manual script")
            if done == 0:
                print("Stopped: no more articles could be completed right now "
                      "(either none are left, or the AI is temporarily unavailable).")
                break
            done_total += done
            rate = done_total / max(time.time() - started, 1) * 60
            print(f"  completed {done_total}/{target}   (~{rate:.0f} per minute)")
    except KeyboardInterrupt:
        print("\nStopped by you. Finished articles are saved.")

    print(f"\nDone: {done_total} article(s) completed. Still waiting: {count_missing_ai_content()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())