"""Request telemetry: complete coverage, and the personal data it must never hold.

The point of this module is that the endpoints deliberately kept off the ops feed —
a student's vitals, dose logs, preferences — are still *counted*, so the platform is
observable without anyone's clinical record appearing on an operator's screen.
"""
import asyncio
import threading
import time
from contextlib import contextmanager
from types import SimpleNamespace

import pytest
from starlette.requests import Request
from starlette.responses import Response
from test_clinical_fulfilment import make_staff
from test_workflow_api import harness as _harness  # noqa: F401 — pytest fixture
from test_workflow_api import login, register

from core import workflow_models as M
from services import activity_telemetry as T


@pytest.fixture
def harness(_harness, monkeypatch):
    """The base harness, with telemetry pointed at the same in-memory engine.

    The middleware opens its own session deliberately, which means it sits outside
    FastAPI's dependency overrides; this is where a test wires it up.
    """
    client, factory, codes = _harness
    monkeypatch.setattr(T, "session_factory", factory)
    yield client, factory, codes


def counters(factory):
    with factory() as db:
        return db.query(M.ActivityCounter).all()


# ── Aggregation ───────────────────────────────────────────────────────────────

def test_repeated_requests_fold_into_one_counter(harness):
    """A row per request would not survive real traffic; a row per hour will."""
    client, factory, _codes = harness
    now = time.time()
    with factory() as db:
        for _ in range(50):
            T.record(db, route="/api/health/readings", method="POST", actor_role="STUDENT",
                     status_code=201, latency_ms=10.0, at=now)

    rows = counters(factory)
    assert len(rows) == 1
    assert rows[0].count == 50
    assert rows[0].total_latency_ms == 500.0


def test_latency_is_tracked_as_total_and_max(harness):
    client, factory, _codes = harness
    now = time.time()
    with factory() as db:
        for latency in (10.0, 250.0, 30.0):
            T.record(db, route="/api/orders", method="POST", actor_role="STUDENT",
                     status_code=201, latency_ms=latency, at=now)
    row = counters(factory)[0]
    assert row.max_latency_ms == 250.0
    assert row.total_latency_ms == 290.0


def test_role_status_and_hour_are_separate_buckets(harness):
    client, factory, _codes = harness
    now = time.time()
    with factory() as db:
        T.record(db, route="/api/orders", method="POST", actor_role="STUDENT", status_code=201, latency_ms=5, at=now)
        T.record(db, route="/api/orders", method="POST", actor_role="VENDOR", status_code=201, latency_ms=5, at=now)
        T.record(db, route="/api/orders", method="POST", actor_role="STUDENT", status_code=409, latency_ms=5, at=now)
        T.record(db, route="/api/orders", method="POST", actor_role="STUDENT", status_code=201, latency_ms=5,
                 at=now - 7200)
    assert len(counters(factory)) == 4


def test_status_codes_collapse_to_a_class(harness):
    client, factory, _codes = harness
    now = time.time()
    with factory() as db:
        T.record(db, route="/api/orders", method="POST", actor_role="STUDENT", status_code=200, latency_ms=1, at=now)
        T.record(db, route="/api/orders", method="POST", actor_role="STUDENT", status_code=201, latency_ms=1, at=now)
        T.record(db, route="/api/orders", method="POST", actor_role="STUDENT", status_code=404, latency_ms=1, at=now)
    rows = {row.status_class: row.count for row in counters(factory)}
    assert rows == {"2xx": 2, "4xx": 1}


def test_summary_errors_belong_to_the_matching_method(harness):
    _client, factory, _codes = harness
    with factory() as db:
        for method, status in (("GET", 200), ("POST", 400), ("POST", 503)):
            T.record(db, route="/api/orders", method=method, actor_role="STUDENT",
                     status_code=status, latency_ms=10)
        report = T.summary(db)

    assert {item["method"]: item["errorCount"] for item in report["items"]} == {
        "GET": 0, "POST": 2,
    }
    assert report["totalRequests"] == 3
    assert report["totalErrors"] == 2


@pytest.mark.parametrize("limit", [1, 200])
def test_window_totals_include_routes_beyond_the_ranked_limit(harness, limit):
    _client, factory, _codes = harness
    with factory() as db:
        for index in range(205):
            T.record(db, route=f"/api/example-{index}", method="GET", actor_role="STUDENT",
                     status_code=500 if index == 204 else 200, latency_ms=10)
        report = T.summary(db, limit=limit)

    assert len(report["items"]) == limit
    assert report["totalRequests"] == 205
    assert report["totalErrors"] == 1


def test_summary_prefix_and_hour_filter_apply_to_all_totals(harness, monkeypatch):
    _client, factory, _codes = harness
    now = 1800000000.0
    monkeypatch.setattr(T.time, "time", lambda: now)
    with factory() as db:
        T.record(db, route="/api/orders", method="GET", actor_role="STUDENT",
                 status_code=200, latency_ms=10, at=now)
        T.record(db, route="/api/orders", method="POST", actor_role="STUDENT",
                 status_code=400, latency_ms=10, at=now)
        T.record(db, route="/api/other", method="GET", actor_role="STUDENT",
                 status_code=500, latency_ms=10, at=now)
        T.record(db, route="/api/orders", method="POST", actor_role="STUDENT",
                 status_code=500, latency_ms=10, at=now - 2 * T.HOUR)
        report = T.summary(db, hours=1, route_prefix=" /api/orders ", limit=1)

    assert report["totalRequests"] == 2
    assert report["totalErrors"] == 1


def test_slow_counter_database_does_not_block_the_event_loop(monkeypatch):
    entered = threading.Event()
    release = threading.Event()
    recorded = []

    @contextmanager
    def slow_session():
        entered.set()
        release.wait(timeout=2)
        yield object()

    monkeypatch.setattr(T, "session_factory", slow_session)
    monkeypatch.setattr(T, "record", lambda _db, **metadata: recorded.append(metadata))
    request = Request({"type": "http", "path": "/api/items/private-id", "method": "GET",
                       "route": SimpleNamespace(path="/api/items/{item_id}")})
    request.state.actor_role = "STUDENT"
    response = Response(status_code=200)

    async def call_next(_request):
        return response

    async def scenario():
        middleware = T.ActivityTelemetryMiddleware(None)
        pending = asyncio.create_task(middleware.dispatch(request, call_next))
        try:
            assert await asyncio.to_thread(entered.wait, 2)
            # The loop must run while the counter's database call is still blocked.
            assert not pending.done()
        finally:
            release.set()
            assert await pending is response

    asyncio.run(scenario())
    assert len(recorded) == 1
    assert recorded[0]["route"] == "/api/items/{item_id}"
    assert recorded[0]["actor_role"] == "STUDENT"


def test_counter_session_failure_preserves_the_response(monkeypatch):
    def broken_session():
        raise RuntimeError("counter database unavailable")

    monkeypatch.setattr(T, "session_factory", broken_session)
    request = Request({"type": "http", "path": "/api/orders", "method": "GET"})
    response = Response(status_code=200)

    async def call_next(_request):
        return response

    assert asyncio.run(T.ActivityTelemetryMiddleware(None).dispatch(request, call_next)) is response


def test_telemetry_never_raises_on_a_broken_session():
    """A counter failing must not turn into a failed request."""
    class Broken:
        rolled_back = False

        def get_bind(self):
            return SimpleNamespace(dialect=SimpleNamespace(name="sqlite"))

        def execute(self, *_a, **_k):
            raise RuntimeError("database is on fire")

        def rollback(self):
            self.rolled_back = True

    db = Broken()
    T.record(db, route="/api/orders", method="POST", actor_role="STUDENT",
             status_code=201, latency_ms=1.0)  # must not raise
    assert db.rolled_back


def test_normalized_counter_keys_reuse_the_same_row(harness):
    _client, factory, _codes = harness
    table = M.ActivityCounter.__table__
    with factory() as db:
        for _ in range(2):
            T.record(db, route="/" + "a" * table.c.route.type.length,
                     method="M" * (table.c.method.type.length + 1),
                     actor_role="R" * (table.c.actor_role.type.length + 1),
                     status_code=200, latency_ms=10)
    rows = counters(factory)
    assert len(rows) == 1
    assert rows[0].count == 2
    assert len(rows[0].route) == table.c.route.type.length


def test_empty_summary_has_zero_totals(harness):
    _client, factory, _codes = harness
    with factory() as db:
        assert T.summary(db) == {
            "items": [], "windowHours": 24, "totalRequests": 0, "totalErrors": 0,
        }


def test_activity_endpoint_returns_full_filtered_totals(harness):
    client, factory, codes = harness
    make_staff(factory, "admin", "SUPER_ADMIN", "admin@example.test")
    headers = login(client, codes, "admin@example.test")
    with factory() as db:
        for route, method, status in (("/api/example", "GET", 200),
                                      ("/api/example", "POST", 500),
                                      ("/api/other", "GET", 400)):
            T.record(db, route=route, method=method, actor_role="STUDENT",
                     status_code=status, latency_ms=10)
    response = client.get("/api/ops/telemetry/activity",
                          params={"routePrefix": "/api/example", "limit": 1}, headers=headers)
    assert response.status_code == 200
    report = response.json()
    assert len(report["items"]) == 1
    assert report["totalRequests"] == 2
    assert report["totalErrors"] == 1
    assert report["items"][0]["method"] == "GET"
    assert report["items"][0]["errorCount"] == 0


# ── The boundary this module exists to hold ───────────────────────────────────

def test_counters_hold_no_identifying_data(harness):
    """The whole justification for counting instead of publishing."""
    client, factory, codes = harness
    student, headers = register(client, codes, "telemetry-pt@example.test")
    client.post("/api/health/readings", json={"metric": "heart", "value": 72,
                                              "recordedAt": "2026-01-01T10:00:00.000Z"}, headers=headers)

    with factory() as db:
        rows = db.query(M.ActivityCounter).all()
        assert rows, "the request should have been counted"
        # Only the text columns can carry data; ids and timestamps are opaque and a
        # substring search across them produces coincidental matches.
        text = " ".join(f"{row.route} {row.method} {row.actor_role} {row.status_class}" for row in rows)
        numeric_columns = {"count", "total_latency_ms", "max_latency_ms", "bucket", "last_at"}
        assert {column.name for column in M.ActivityCounter.__table__.columns} == {
            "id", "route", "method", "actor_role", "status_class"} | numeric_columns, (
            "a new column was added to the counters table — check it cannot carry personal data")

    assert student["id"] not in text
    assert "telemetry-pt@example.test" not in text
    assert text.count("/api/health/readings") >= 1
    # The reading value never reaches the table: the only numbers stored are the
    # counters themselves, which are asserted above to be the full column set.


def test_path_parameters_are_stored_as_templates(harness):
    """/health/readings/{reading_id} must never be stored with the id filled in."""
    client, factory, codes = harness
    _student, headers = register(client, codes, "telemetry-del@example.test")
    client.delete("/api/health/readings/some-private-reading-id", headers=headers)

    with factory() as db:
        routes = [row.route for row in db.query(M.ActivityCounter).all()]
    assert not any("some-private-reading-id" in route for route in routes)
    assert any("{reading_id}" in route for route in routes), routes


def test_an_unknown_path_is_not_echoed_into_the_table(harness):
    """A 404 on a caller-chosen path must not put their text in the database."""
    client, factory, _codes = harness
    client.get("/api/not-a-real-endpoint-<script>alert(1)</script>")
    with factory() as db:
        routes = [row.route for row in db.query(M.ActivityCounter).all()]
    assert not any("script" in route for route in routes)


# ── The endpoints the feed deliberately excludes are still visible ────────────

def test_routine_clinical_activity_is_counted_even_though_it_is_not_published(harness):
    client, factory, codes = harness
    _student, headers = register(client, codes, "telemetry-vitals@example.test")
    for value in (70, 74, 78):
        client.post("/api/health/readings", json={"metric": "heart", "value": value,
                                                  "recordedAt": "2026-01-01T10:00:00.000Z"}, headers=headers)
    make_staff(factory, "admin", "SUPER_ADMIN", "admin@example.test")

    admin_headers = login(client, codes, "admin@example.test")
    report = client.get("/api/ops/telemetry/activity", headers=admin_headers).json()
    readings = [item for item in report["items"] if item["route"].endswith("/health/readings")
                and item["method"] == "POST"]
    assert readings and readings[0]["count"] >= 3

    # And the feed still does not carry them — the two must not converge.
    feed = client.get("/api/ops/feed", headers=admin_headers).json()
    assert not any("readings" in item["resourceType"] for item in feed["items"])


def test_report_breaks_down_by_role_and_hour(harness):
    client, factory, codes = harness
    _student, headers = register(client, codes, "telemetry-role@example.test")
    client.get("/api/profile", headers=headers)
    make_staff(factory, "admin", "SUPER_ADMIN", "admin@example.test")

    admin_headers = login(client, codes, "admin@example.test")
    report = client.get("/api/ops/telemetry/activity", headers=admin_headers).json()
    assert report["byRole"].get("STUDENT", 0) >= 1
    assert report["hourly"] and report["hourly"][-1]["count"] >= 1
    assert report["totalRequests"] >= 1


def test_errors_are_counted_per_route(harness):
    client, factory, codes = harness
    _student, headers = register(client, codes, "telemetry-err@example.test")
    client.get("/api/health/documents/does-not-exist/file", headers=headers)
    make_staff(factory, "admin", "SUPER_ADMIN", "admin@example.test")

    admin_headers = login(client, codes, "admin@example.test")
    report = client.get("/api/ops/telemetry/activity", headers=admin_headers).json()
    assert report["totalErrors"] >= 1


def test_telemetry_is_super_admin_only(harness):
    client, factory, codes = harness
    _student, headers = register(client, codes, "telemetry-nosy@example.test")
    assert client.get("/api/ops/telemetry/activity", headers=headers).status_code == 403

    make_staff(factory, "vendor", "VENDOR", "vendor@example.test")
    vendor_headers = login(client, codes, "vendor@example.test")
    assert client.get("/api/ops/telemetry/activity", headers=vendor_headers).status_code == 403


def test_health_checks_are_not_counted(harness):
    """Probes would dominate the table and tell nobody anything."""
    client, factory, _codes = harness
    for _ in range(5):
        client.get("/api/health")
    with factory() as db:
        assert db.query(M.ActivityCounter).filter(M.ActivityCounter.route.contains("/api/health")).count() == 0


@pytest.mark.parametrize("hours,expected", [(1, 1), (24, 24)])
def test_window_is_bounded_by_hours(harness, hours, expected):
    client, factory, codes = harness
    _student, _headers = register(client, codes, f"telemetry-win{hours}@example.test")
    make_staff(factory, "admin", "SUPER_ADMIN", "admin@example.test")
    admin_headers = login(client, codes, "admin@example.test")
    report = client.get(f"/api/ops/telemetry/activity?hours={hours}", headers=admin_headers).json()
    assert report["windowHours"] == expected
