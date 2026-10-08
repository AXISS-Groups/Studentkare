"""DPDP erasure: 7-day window, everything removed from live tables, sealed archive, audited access."""
import time

from cryptography.fernet import Fernet
from sqlalchemy import select
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services.erasure import GRACE_SECONDS, process_due_erasures

URL = "/api/records/deletion-request"


def configure(monkeypatch, days="30"):
    monkeypatch.setenv("DPDP_ARCHIVE_KEY", Fernet.generate_key().decode())
    monkeypatch.setenv("DPDP_ARCHIVE_RETENTION_DAYS", days)


def student_with_data(client, codes, factory, identifier="gone@x.test"):
    user, headers = register(client, codes, identifier)
    with factory() as db:
        db.add(M.Document(id="d1", account_id=user["id"], title="CBC", category="LAB", filename="c.pdf",
                          mime_type="application/pdf", content=b"%PDF", created_at=time.time()))
        db.add(M.Reading(id="r1", account_id=user["id"], metric="WEIGHT", value=60, recorded_at=time.time(), source="USER"))
        db.commit()
    return user, headers


def age_request(factory, account_id, seconds=GRACE_SECONDS + 1):
    with factory() as db:
        db.get(M.DeletionRequest, account_id).requested_at -= seconds
        db.commit()


def test_request_is_scheduled_seven_days_out_and_cancellable(harness, monkeypatch):
    client, factory, codes = harness
    configure(monkeypatch, "45")
    _, headers = register(client, codes)
    first = client.post(URL, headers=headers).json()
    assert first["status"] == "PENDING"
    assert round(first["scheduledFor"] - first["requestedAt"]) == GRACE_SECONDS
    assert first["archiveRetentionDays"] == 45
    assert client.post(URL, headers=headers).json()["requestedAt"] == first["requestedAt"]  # idempotent
    assert client.delete(URL, headers=headers).json()["status"] == "CANCELLED"
    assert client.delete(URL, headers=headers).status_code == 409


def test_nothing_is_erased_inside_the_window(harness, monkeypatch):
    client, factory, codes = harness
    configure(monkeypatch)
    user, headers = student_with_data(client, codes, factory)
    client.post(URL, headers=headers)
    with factory() as db:
        assert process_due_erasures(db)["summary"]["erased"] == 0
        db.commit()
        assert db.get(M.Account, user["id"]) is not None


def test_erasure_removes_every_live_row_and_seals_an_archive(harness, monkeypatch):
    client, factory, codes = harness
    configure(monkeypatch)
    user, headers = student_with_data(client, codes, factory)
    client.post(URL, headers=headers)
    age_request(factory, user["id"])
    with factory() as db:
        result = process_due_erasures(db)["summary"]
        db.commit()
    assert result["erased"] == 1
    with factory() as db:
        assert db.get(M.Account, user["id"]) is None
        assert db.get(M.Document, "d1") is None
        assert db.get(M.Reading, "r1") is None
        assert db.scalar(select(M.Session).where(M.Session.account_id == user["id"])) is None
        assert db.scalar(select(M.OutboxEvent).where(M.OutboxEvent.account_id == user["id"])) is None
        archive = db.scalar(select(M.ErasureArchive).where(M.ErasureArchive.former_account_id == user["id"]))
        assert archive is not None and archive.row_count >= 4
        assert b"CBC" not in archive.sealed  # encrypted, not plain JSON
    assert client.get("/api/auth/session").json()["user"] is None


def test_erasure_fails_closed_without_key_or_retention(harness, monkeypatch):
    client, factory, codes = harness
    monkeypatch.delenv("DPDP_ARCHIVE_KEY", raising=False)
    monkeypatch.delenv("DPDP_ARCHIVE_RETENTION_DAYS", raising=False)
    user, headers = student_with_data(client, codes, factory)
    client.post(URL, headers=headers)
    age_request(factory, user["id"])
    with factory() as db:
        summary = process_due_erasures(db)["summary"]
        db.commit()
        assert summary["erased"] == 0 and summary["blocked"]
        assert db.get(M.Account, user["id"]) is not None


def test_archive_opens_only_for_a_super_admin_with_a_reason_and_is_destroyed_later(harness, monkeypatch):
    client, factory, codes = harness
    configure(monkeypatch, "10")
    user, headers = student_with_data(client, codes, factory)
    client.post(URL, headers=headers)
    age_request(factory, user["id"])
    with factory() as db:
        process_due_erasures(db)
        db.commit()
        archive_id = db.scalar(select(M.ErasureArchive.id))

    admin, h = register(client, codes, "sa@x.test")
    assert client.post(f"/api/ops/erasure/archives/{archive_id}/open", headers=h, json={"reason": "Court order 12/2026 request"}).status_code == 403
    with factory() as db:
        db.get(M.Account, admin["id"]).role = "SUPER_ADMIN"
        db.commit()
    assert client.post(f"/api/ops/erasure/archives/{archive_id}/open", headers=h, json={"reason": "short"}).status_code == 422
    opened = client.post(f"/api/ops/erasure/archives/{archive_id}/open", headers=h, json={"reason": "Court order 12/2026 request"})
    assert opened.status_code == 200
    assert "care_documents" in opened.json()["archive"]["tables"]
    with factory() as db:
        assert db.scalar(select(M.OpsEvent).where(M.OpsEvent.kind == "ERASURE_ARCHIVE_OPENED")) is not None
        process_due_erasures(db, now=time.time() + 11 * 86400)
        db.commit()
        assert db.get(M.ErasureArchive, archive_id).sealed == b""
    assert client.post(f"/api/ops/erasure/archives/{archive_id}/open", headers=h, json={"reason": "Court order 12/2026 request"}).status_code == 410
