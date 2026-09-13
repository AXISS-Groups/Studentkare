"""Clinician encounter-note draft tests."""
import time

from sqlalchemy import select

from core import workflow_models as M
from test_workflow_api import harness, register, login


def test_encounter_note_lifecycle(harness):
    client, factory, codes = harness
    _, _ = register(client, codes, "clin@example.test")
    with factory() as db:
        account = db.scalar(select(M.Account).where(M.Account.identifier == "clin@example.test"))
        account.role = "NMC_DOCTOR"
        db.commit()
    headers = login(client, codes, "clin@example.test")

    created = client.post("/api/encounters", json={"subjective": "Patient reports mild fever.", "objective": "Temp 100.4F.", "assessment": "Likely viral.", "plan": "Rest and hydrate."}, headers=headers).json()
    assert created["status"] == "DRAFT"
    note_id = created["id"]

    client.patch(f"/api/encounters/{note_id}", json={"assessment": "Likely viral infection."}, headers=headers)
    finalized = client.post(f"/api/encounters/{note_id}/finalize", headers=headers).json()
    assert finalized["status"] == "FINAL"

    items = client.get("/api/encounters", headers=headers).json()["items"]
    assert len(items) == 1
    assert items[0]["status"] == "FINAL"
    assert items[0]["assessment"] == "Likely viral infection."


def test_student_cannot_create_encounter(harness):
    client, _, codes = harness
    _, headers = register(client, codes, "student@example.test")
    assert client.post("/api/encounters", json={"subjective": "x", "objective": "y"}, headers=headers).status_code == 403
