"""Durable request outcomes, provider uncertainty, and real Postgres concurrency."""
import importlib.util
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier, Event

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from test_rule_l import pg_db  # noqa: F401 — real migrated Postgres fixture
from test_sos import SOS, add_security, student
from test_workflow_api import harness, login  # noqa: F401 — fixtures

from core import workflow_models as M
from services import emergency_api, erasure


def test_every_request_reuses_its_recorded_outcome_after_closure(harness, monkeypatch):
    client, factory, codes = harness
    _, headers = student(client, codes, factory)
    sent = []
    monkeypatch.setattr(emergency_api, "_send_openwa", lambda *args: sent.append(args) or {"status": "sent"})
    first = client.post(SOS, headers=headers, json={"requestId": "first"}).json()["alert"]
    reused = client.post(SOS, headers=headers, json={"requestId": "second"}).json()["alert"]
    assert first["id"] == reused["id"]
    client.post(f"{SOS}/{first['id']}/cancel", headers=headers)
    new = client.post(SOS, headers=headers, json={"requestId": "third"}).json()["alert"]
    for key in ("first", "second"):
        retried = client.post(SOS, headers=headers, json={"requestId": key}).json()["alert"]
        checked = client.get(f"{SOS}/current", params={"requestId": key}).json()["alert"]
        assert retried == checked
        assert retried["id"] == first["id"] and retried["status"] == "CANCELLED"
    assert client.get(f"{SOS}/current").json()["alert"]["id"] == new["id"]
    assert len(sent) == 2


def test_request_lookup_is_account_owned_and_requires_auth(harness, monkeypatch):
    client, factory, codes = harness
    _, headers = student(client, codes, factory)
    monkeypatch.setattr(emergency_api, "_send_openwa", lambda *args: {"status": "skipped"})
    first = client.post(SOS, headers=headers, json={"requestId": "shared-key"}).json()["alert"]
    assert client.post(SOS, json={"requestId": "csrf-denied"}).status_code == 403
    client.post("/api/auth/logout", headers=headers)
    assert client.get(f"{SOS}/current?requestId=shared-key").status_code == 401
    _, other = student(client, codes, factory, identifier="other@example.test")
    assert client.get(f"{SOS}/current?requestId=shared-key").json()["alert"] is None
    second = client.post(SOS, headers=other, json={"requestId": "shared-key"}).json()["alert"]
    assert second["id"] != first["id"]
    client.post("/api/auth/logout", headers=other)
    login(client, codes, "s@x.test")
    assert client.get(f"{SOS}/current?requestId=shared-key").json()["alert"]["id"] == first["id"]


@pytest.mark.parametrize("key", ["", "a/b", "a?b", "a\n", "x" * 121])
def test_malformed_request_ids_are_rejected_before_creation(harness, key):
    client, factory, codes = harness
    _, headers = student(client, codes, factory)
    assert client.post(SOS, headers=headers, json={"requestId": key}).status_code == 422
    assert client.get(f"{SOS}/current", params={"requestId": key}).status_code == 422
    with factory() as db:
        assert db.scalar(select(M.SosAlert)) is None


@pytest.mark.parametrize("result, expected", [
    ({"status": "sent"}, "SENT"), ({"status": "skipped"}, "SKIPPED"),
    ({"status": "failed", "reason": "http_400"}, "FAILED"),
    ({"status": "failed", "reason": "http_503"}, "UNKNOWN"),
    ({"status": "failed", "reason": "unreachable (ReadTimeout)"}, "UNKNOWN"),
])
def test_provider_acceptance_is_never_inferred(monkeypatch, result, expected):
    monkeypatch.setattr(emergency_api, "_send_openwa", lambda *args: result)
    assert emergency_api._whatsapp("+91 98765 11111", "Synthetic SOS")[0] == expected


def test_unexpected_provider_exception_keeps_attempts_and_continues(harness, monkeypatch):
    client, factory, codes = harness
    _, headers = student(client, codes, factory)
    add_security(factory)
    attempts = []

    def send(*args):
        attempts.append(args)
        if len(attempts) == 1:
            raise RuntimeError("Sensitive provider response must not be exposed")
        return {"status": "sent"}

    monkeypatch.setattr(emergency_api, "_send_openwa", send)
    response = client.post(SOS, headers=headers, json={"requestId": "interrupted"})
    assert response.status_code == 201
    deliveries = response.json()["alert"]["deliveries"]
    assert [row["status"] for row in deliveries] == ["SENT", "UNKNOWN", "SENT"]
    assert "Sensitive" not in response.text


def test_erasure_collects_request_receipts_and_deliveries(harness, monkeypatch):
    client, factory, codes = harness
    user, headers = student(client, codes, factory)
    monkeypatch.setattr(emergency_api, "_send_openwa", lambda *args: {"status": "skipped"})
    client.post(SOS, headers=headers, json={"requestId": "erase-me"})
    with factory() as db:
        collected = erasure._collect(db, db.get(M.Account, user["id"]))
        assert collected["care_sos_requests"][0]["request_id"] == "erase-me"
        assert collected["care_sos_deliveries"]


def test_erasure_removes_receipts_from_live_tables(harness, monkeypatch):
    from cryptography.fernet import Fernet

    client, factory, codes = harness
    user, headers = student(client, codes, factory)
    monkeypatch.setenv("DPDP_ARCHIVE_KEY", Fernet.generate_key().decode())
    monkeypatch.setenv("DPDP_ARCHIVE_RETENTION_DAYS", "30")
    monkeypatch.setattr(emergency_api, "_send_openwa", lambda *args: {"status": "skipped"})
    client.post(SOS, headers=headers, json={"requestId": "erase-me"})
    client.post("/api/records/deletion-request", headers=headers)
    with factory() as db:
        db.get(M.DeletionRequest, user["id"]).requested_at -= erasure.grace_seconds(db) + 1
        db.commit()
        assert erasure.process_due_erasures(db)["summary"]["erased"] == 1
        db.commit()
        assert db.scalar(select(M.SosRequest)) is None
        assert db.scalar(select(M.SosAlert)) is None
        assert db.scalar(select(M.SosDelivery)) is None


def test_process_exit_after_commit_preserves_outcome_and_retry_does_not_resend(harness, monkeypatch):
    client, factory, codes = harness
    user, _ = student(client, codes, factory)
    add_security(factory)
    attempts = []

    def interrupted(*args):
        attempts.append(args)
        if len(attempts) == 2:
            raise SystemExit("Synthetic process termination")
        return {"status": "sent"}

    monkeypatch.setattr(emergency_api, "_send_openwa", interrupted)
    with factory() as db:
        with pytest.raises(SystemExit):
            emergency_api.raise_sos(emergency_api.SosInput(requestId="restart"), user=user, db=db)
    with factory() as db:
        checked = emergency_api.current_sos(requestId="restart", user=user, db=db)["alert"]
        assert [row["status"] for row in checked["deliveries"]] == ["SENT", "SENT", "UNKNOWN"]
        retried = emergency_api.raise_sos(emergency_api.SosInput(requestId="restart"), user=user, db=db)["alert"]
        assert retried == checked
        assert len(attempts) == 2


def test_pg_two_connections_start_creation_together(pg_db, monkeypatch):
    engine, *_ = pg_db
    account_id = uuid.uuid4().hex
    user = {"id": account_id, "role": "STUDENT"}
    with Session(engine) as db:
        db.add(M.Account(id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL",
                         full_name="Synthetic Adult", role="STUDENT", active=True, created_at=time.time(),
                         profile={"emergencyContactPhone": "+91 98765 11111"}))
        db.commit()
    start = Barrier(2)
    accepted = []
    monkeypatch.setattr(emergency_api, "_send_openwa", lambda *args: accepted.append(args) or {"status": "sent"})

    def create():
        with Session(engine) as db:
            # Force both independent connections to exist before either can create.
            db.connection()
            start.wait(timeout=20)
            return emergency_api.raise_sos(emergency_api.SosInput(requestId=uuid.uuid4().hex), user=user, db=db)

    with ThreadPoolExecutor(max_workers=2) as pool:
        requests = [pool.submit(create) for _ in range(2)]
        outcomes = [request.result(timeout=20) for request in requests]
    assert outcomes[0]["alert"]["id"] == outcomes[1]["alert"]["id"]
    assert len(accepted) == 1


@pytest.mark.parametrize("same_key", [True, False])
def test_pg_concurrent_requests_commit_one_alert_and_send_once(pg_db, monkeypatch, same_key):
    engine, *_ = pg_db
    account_id = uuid.uuid4().hex
    user = {"id": account_id, "role": "STUDENT"}
    with Session(engine) as db:
        db.add(M.Account(id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL",
                         full_name="Synthetic Adult", role="STUDENT", active=True, created_at=time.time(),
                         profile={"emergencyContactPhone": "+91 98765 11111"}))
        db.commit()
    entered, release = Event(), Event()
    accepted = []

    def send(*args):
        accepted.append(args)
        entered.set()
        assert release.wait(timeout=20)
        return {"status": "sent"}

    monkeypatch.setattr(emergency_api, "_send_openwa", send)
    first_key = uuid.uuid4().hex
    second_key = first_key if same_key else uuid.uuid4().hex

    def raise_alert(key):
        with Session(engine) as db:
            return emergency_api.raise_sos(emergency_api.SosInput(requestId=key), user=user, db=db)

    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(raise_alert, first_key)
        try:
            assert entered.wait(timeout=20)
            second = pool.submit(raise_alert, second_key).result(timeout=20)
            # The committed outcome is visible while the original POST is delayed.
            assert second["alreadyActive"] is True
            assert second["alert"]["deliveries"][-1]["status"] == "UNKNOWN"
            with Session(engine) as db:
                checked = emergency_api.current_sos(requestId=first_key, user=user, db=db)["alert"]
                assert checked["id"] == second["alert"]["id"]
                # A real concurrent operator acknowledgement must survive the final response.
                row = db.get(M.SosAlert, checked["id"])
                row.status, row.acknowledged_at = "ACKNOWLEDGED", time.time()
                db.commit()
        finally:
            release.set()
        original = first.result(timeout=20)
    assert original["alert"]["id"] == second["alert"]["id"]
    assert original["alert"]["status"] == "ACKNOWLEDGED"
    assert len(accepted) == 1
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(M.SosAlert).where(M.SosAlert.account_id == account_id)) == 1
        assert db.scalar(select(func.count()).select_from(M.OpsEvent).where(
            M.OpsEvent.subject_id == account_id, M.OpsEvent.kind == "SOS_RAISED")) == 1
        db.add(M.SosAlert(id=uuid.uuid4().hex, account_id=account_id, status="ACTIVE", created_at=time.time()))
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()


def test_pg_migration_refuses_duplicate_open_records_without_changing_them(pg_db):
    engine, *_ = pg_db
    path = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "a8c4f2e6d190_sos_request_receipts.py"
    spec = importlib.util.spec_from_file_location("sos_receipts_migration", path)
    assert spec and spec.loader
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    # Rolled back scratch transaction: preserve the fixture's migrated schema.
    with engine.connect() as conn:
        transaction = conn.begin()
        try:
            conn.execute(text("DROP INDEX uq_care_sos_alerts_open_account"))
            account_id = uuid.uuid4().hex
            with Session(bind=conn, join_transaction_mode="create_savepoint") as db:
                db.add(M.Account(id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL",
                                 full_name="Synthetic Adult", role="STUDENT", active=True, profile={}, created_at=time.time()))
                db.flush()
                for status in ("ACTIVE", "ACKNOWLEDGED"):
                    db.add(M.SosAlert(id=uuid.uuid4().hex, account_id=account_id, status=status, created_at=time.time()))
                db.commit()
            with Operations.context(MigrationContext.configure(conn)):
                with pytest.raises(RuntimeError, match="operator review"):
                    migration.upgrade()
            assert conn.execute(text("SELECT COUNT(*) FROM care_sos_alerts WHERE account_id = :id"), {"id": account_id}).scalar() == 2
        finally:
            transaction.rollback()
