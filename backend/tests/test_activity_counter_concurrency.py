"""Real independent database transactions must preserve every counter increment."""
import os
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from postgres_support import psycopg_url, requires_postgres
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.schema import CreateSchema, DropSchema

from core import workflow_models as M
from services import activity_telemetry as T


@pytest.fixture(params=["sqlite", "postgres"])
def counter_engine(request, tmp_path):
    if request.param == "sqlite":
        engine = create_engine(f"sqlite:///{tmp_path / 'counters.sqlite'}")
        M.ActivityCounter.__table__.create(engine)
        yield engine
        engine.dispose()
        return

    # Uses the suite's required/optional Postgres policy, with a private schema.
    marker = requires_postgres.mark
    if marker.args[0]:
        pytest.skip(marker.kwargs["reason"])
    engine = create_engine(psycopg_url(os.environ["DATABASE_URL"]))
    schema = f"activity_test_{uuid.uuid4().hex}"
    with engine.begin() as db:
        db.execute(CreateSchema(schema))
    scoped = engine.execution_options(schema_translate_map={None: schema})
    try:
        M.ActivityCounter.__table__.create(scoped)
        yield scoped
    finally:
        with engine.begin() as db:
            db.execute(DropSchema(schema, cascade=True))
        engine.dispose()


@pytest.mark.parametrize("preseed", [False, True])
def test_parallel_transactions_preserve_counts_and_latency(counter_engine, preseed):
    factory = sessionmaker(bind=counter_engine)
    now = T.bucket_for(time.time()) * T.HOUR + 100
    workers, repeats = 8, 20
    start = threading.Barrier(workers)
    reads = threading.Barrier(workers)
    first_read = threading.local()

    if preseed:
        with factory() as db:
            T.record(db, route="/api/orders", method="POST", actor_role="STUDENT",
                     status_code=201, latency_ms=0, at=now + 50)

    def synchronize_legacy_reads(_connection, _cursor, statement, *_args):
        # A regression to read/modify/write deterministically reads stale values.
        # Atomic upserts issue no SELECT and do not need this synchronization.
        if statement.lstrip().upper().startswith("SELECT") and "care_activity_counters" in statement:
            if not getattr(first_read, "seen", False):
                first_read.seen = True
                reads.wait(timeout=10)

    event.listen(counter_engine, "after_cursor_execute", synchronize_legacy_reads)

    def count(worker):
        start.wait(timeout=10)
        with factory() as db:
            for index in range(repeats):
                T.record(db, route="/api/orders", method="POST", actor_role="STUDENT",
                         status_code=201, latency_ms=worker + 1, at=now + index)

    try:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            list(pool.map(count, range(workers)))
    finally:
        event.remove(counter_engine, "after_cursor_execute", synchronize_legacy_reads)

    with factory() as db:
        rows = db.scalars(select(M.ActivityCounter)).all()
        assert len(rows) == 1
        row = rows[0]
        assert row.count == workers * repeats + int(preseed)
        assert row.total_latency_ms == repeats * sum(range(1, workers + 1))
        assert row.max_latency_ms == workers
        assert row.last_at == now + (50 if preseed else repeats - 1)


def test_filtered_window_totals_on_each_database(counter_engine, monkeypatch):
    """Exercise the grouped window query on the actual production dialect too."""
    factory = sessionmaker(bind=counter_engine)
    now = 1800000000.0
    monkeypatch.setattr(T.time, "time", lambda: now)
    with factory() as db:
        for route, method, status, at in (
            ("/api/orders", "GET", 200, now),
            ("/api/orders", "POST", 500, now),
            ("/api/other", "GET", 400, now),
            ("/api/orders", "POST", 400, now - 2 * T.HOUR),
        ):
            T.record(db, route=route, method=method, actor_role="STUDENT",
                     status_code=status, latency_ms=10, at=at)
        report = T.summary(db, hours=1, route_prefix="/api/orders", limit=1)

    assert len(report["items"]) == 1
    assert report["totalRequests"] == 2
    assert report["totalErrors"] == 1
    assert report["items"][0]["method"] == "GET"
    assert report["items"][0]["errorCount"] == 0
