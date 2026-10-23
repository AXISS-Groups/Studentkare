"""Workflow worker.

Finite:        python -m scripts.workflow_worker --once | --max-cycles N
Long-running:  python -m scripts.workflow_worker --loop [--poll-seconds 15]

--loop runs until SIGTERM/SIGINT, finishing the current pass before it exits.
Every job run takes a lease on its ScheduledJob row, so several workers or
backend replicas may run side by side without running the same job twice.
"""
from __future__ import annotations

import argparse
import json
import logging
import math
import os
import signal
import threading
import time
from collections.abc import Callable
from pathlib import Path

from sqlalchemy.orm import Session

from services.workflow_scheduler import (
    LEASE_SECONDS,
    WORKER_POLL_SECONDS,
    ensure_scheduled_jobs,
    run_worker_loop,
    workflow_scheduler,
)

logger = logging.getLogger("scripts.workflow_worker")
MAX_CYCLES = 100
DEFAULT_SLEEP_SECONDS = 60.0


def _validate_bounds(max_cycles: int, sleep_seconds: float) -> None:
    if type(max_cycles) is not int or not 1 <= max_cycles <= MAX_CYCLES:
        raise ValueError("max-cycles must be an integer between 1 and 100.")
    if not math.isfinite(sleep_seconds) or not 1 <= sleep_seconds <= 7200:
        raise ValueError("sleep-seconds must be finite and between 1 and 7200.")


def _validate_poll(poll_seconds: float) -> None:
    if not math.isfinite(poll_seconds) or not 1 <= poll_seconds <= 300:
        raise ValueError("poll-seconds must be finite and between 1 and 300.")


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


def start_watchdog(stop: threading.Event, last_pass: list[float], limit_seconds: float,
                   exit_process: Callable[[int], None] = os._exit) -> threading.Thread:
    """Exit the process when no pass has completed for ``limit_seconds`` (audit JOB-05).

    Docker Compose restarts a container that exits, not one that is only
    "unhealthy", so a hung pass would otherwise stall every job until someone
    noticed. By then the job's lease has expired and another worker may claim it,
    so exiting is also what keeps this worker from finishing a run twice over.
    """
    def watch() -> None:
        while not stop.wait(min(limit_seconds / 10, 30)):
            if time.monotonic() - last_pass[0] > limit_seconds:
                logger.error("No worker pass completed in %ss; exiting for a restart", int(limit_seconds))
                exit_process(1)
                return

    thread = threading.Thread(target=watch, name="workflow-watchdog", daemon=True)
    thread.start()
    return thread


def run_loop(session_factory: Callable[[], Session], stop: threading.Event, *,
             poll_seconds: float = WORKER_POLL_SECONDS, heartbeat_file: str = "",
             watchdog_seconds: float = LEASE_SECONDS + WORKER_POLL_SECONDS) -> int:
    """Poll until ``stop`` is set. Prints only passes that ran something and
    touches ``heartbeat_file`` after every completed pass (for healthchecks).
    Exits the process if no pass completes within ``watchdog_seconds``."""
    _validate_poll(poll_seconds)
    last_pass = [time.monotonic()]

    def on_pass(outcome: dict) -> None:
        last_pass[0] = time.monotonic()
        if outcome:
            print(json.dumps({"results": outcome}), flush=True)
        if heartbeat_file:
            Path(heartbeat_file).touch()

    if watchdog_seconds:
        start_watchdog(stop, last_pass, watchdog_seconds)
    return run_worker_loop(session_factory, stop, poll_seconds=poll_seconds, on_pass=on_pass)


def install_stop_handlers(stop: threading.Event) -> None:
    """SIGTERM (docker stop, Dokploy redeploy) and SIGINT end the loop cleanly."""
    def handle(signum, frame):
        stop.set()

    signal.signal(signal.SIGTERM, handle)
    signal.signal(signal.SIGINT, handle)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run allowlisted workflow jobs on the configured database.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--once", action="store_true", help="Run one due-job pass and exit")
    mode.add_argument("--max-cycles", type=int, help="Run 1–100 passes and exit")
    mode.add_argument("--loop", action="store_true", help="Run until SIGTERM/SIGINT")
    parser.add_argument("--sleep-seconds", type=float, default=DEFAULT_SLEEP_SECONDS,
                        help="Delay between finite passes (1–7200 seconds; default: 60)")
    parser.add_argument("--poll-seconds", type=float, default=float(WORKER_POLL_SECONDS),
                        help=f"--loop: delay between passes (1–300 seconds; default: {WORKER_POLL_SECONDS})")
    parser.add_argument("--heartbeat-file", default="",
                        help="--loop: file touched after each completed pass")
    args = parser.parse_args(argv)
    max_cycles = 1 if args.once else args.max_cycles
    try:
        if args.loop:
            _validate_poll(args.poll_seconds)
        else:
            _validate_bounds(max_cycles, args.sleep_seconds)
    except ValueError as exc:
        parser.error(str(exc))

    # Parse/validate before importing database configuration. No app startup,
    # migrations, schema creation, or demo seeding is performed by this worker.
    from services.db_sql import SessionLocal
    from services.integration_config import load_from_db

    if args.loop:
        logging.basicConfig(level=logging.INFO)
        stop = threading.Event()
        install_stop_handlers(stop)
        try:
            load_from_db()
        except Exception as exc:
            # Fail closed: exit and let the restart policy retry, rather than
            # deliver with integrations silently unconfigured.
            logger.error("Could not load integration config (%s); exiting", type(exc).__name__)
            return 1
        passes = run_loop(SessionLocal, stop, poll_seconds=args.poll_seconds,
                          heartbeat_file=args.heartbeat_file)
        print(json.dumps({"stopped": True, "passes": passes}), flush=True)
        return 0

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
