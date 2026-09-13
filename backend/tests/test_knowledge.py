"""Approved knowledge sources and read-only care navigator tests."""
import time

from core import workflow_models as M
from test_workflow_api import harness, register, login


def test_navigator_answers_from_approved_sources(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "navigator@example.test")
    with factory() as db:
        db.add(M.Account(id="admin", identifier="admin@example.test", channel="EMAIL", full_name="Admin", role="SUPER_ADMIN", active=True, profile={}, created_at=time.time()))
        db.commit()

    # Student cannot publish knowledge.
    assert client.post("/api/ops/knowledge", json={"title": "How appointments work", "content": "Book from the appointments tab. Providers confirm.", "category": "appointments"}, headers=headers).status_code == 403

    admin_headers = login(client, codes, "admin@example.test")
    client.post("/api/ops/knowledge", json={"title": "How appointments work", "content": "Book a time from available slots. A provider confirms before it becomes a confirmed appointment.", "category": "appointments"}, headers=admin_headers)
    client.post("/api/ops/knowledge", json={"title": "Uploading records", "content": "Upload PDF, PNG or JPEG records from your health vault. They stay private to your account.", "category": "records"}, headers=admin_headers)

    # Log back in as student (cookie replaced).
    student_headers = login(client, codes, "navigator@example.test")
    res = client.post("/api/care/navigate", json={"query": "How do I book an appointment?"}, headers=student_headers).json()
    assert res["confident"] is True
    assert len(res["citations"]) >= 1
    assert res["citations"][0]["sourceId"]

    sources = client.get("/api/knowledge/sources", headers=student_headers).json()["items"]
    assert len(sources) == 2


def test_navigator_refuses_without_approved_source(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "navigator2@example.test")
    res = client.post("/api/care/navigate", json={"query": "What is the meaning of life?"}, headers=headers).json()
    assert res["confident"] is False
    assert res["citations"] == []
