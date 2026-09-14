"""Finite workflow worker: python -m scripts.workflow_worker --once."""
from __future__ import annotations

import argparse
import json
import logging
import math
import time
from collections.abc import Callable

from sqlalchemy.orm import Session

from services.workflow_scheduler import ensure_scheduled_jobs, workflow_scheduler

logger = logging.getLogger("scripts.workflow_worker")
MAX_CYCLES = 100
DEFAULT_SLEEP_SECONDS = 60.0


def _validate_bounds(max_cycles: int, sleep_seconds: float) -> None:
    if type(max_cycles) is not int or not 1 <= max_cycles <= MAX_CYCLES:
        raise ValueError("max-cycles must be an integer between 1 and 100.")
    if not math.isfinite(sleep_seconds) or not 1 <= sleep_seconds <= 7200:
        raise ValueError("sleep-seconds must be finite and between 1 and 7200.")


def run_cycles(session_factory: Callable[[], Session], *, max_cycles: int,
               sleep_seconds: float = DEFAULT_SLEEP_SECONDS) -> list[dict]:
    """Run a fixed number of passes, closing each session before sleeping."""
    _validate_bounds(max_cycles, sleep_seconds)
    results = []
    for cycle in range(max_cycles):
        with session_factory() as db:
            ensure_scheduled_jobs(db)
            outcome = workflow_scheduler.run_due_jobs(db)
        results.append(outcome)
        print(json.dumps({"cycle": cycle + 1, "results": outcome}), flush=True)
        if cycle + 1 < max_cycles:
            time.sleep(sleep_seconds)
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run bounded, allowlisted workflow jobs on the configured database.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--once", action="store_true", help="Run one due-job pass and exit")
    mode.add_argument("--max-cycles", type=int, help="Run 1–100 passes and exit")
    parser.add_argument("--sleep-seconds", type=float, default=DEFAULT_SLEEP_SECONDS,
                        help="Delay between passes (1–7200 seconds; default: 60)")
    args = parser.parse_args(argv)
    max_cycles = 1 if args.once else args.max_cycles
    try:
        _validate_bounds(max_cycles, args.sleep_seconds)
    except ValueError as exc:
        parser.error(str(exc))

    # Parse/validate before importing database configuration. No app startup,
    # migrations, schema creation, or demo seeding is performed by this worker.
    from services.db_sql import SessionLocal
    from services.integration_config import load_from_db

    try:
        load_from_db()
        results = run_cycles(SessionLocal, max_cycles=max_cycles, sleep_seconds=args.sleep_seconds)
    except KeyboardInterrupt:
        return 130
    except Exception:
        logger.exception("Workflow worker stopped before completing its bounded run")
        return 1
    return 1 if any(status == "FAILED" for result in results for status in result.values()) else 0


if __name__ == "__main__":
    raise SystemExit(main())
