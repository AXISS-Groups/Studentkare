"""Audit M6: erasure reaches the commerce rows keyed by account id, and the export
includes the student's own care records."""
import time

from cryptography.fernet import Fernet
from sqlalchemy import JSON, Boolean, Float, Integer, insert, select
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services.erasure import COMMERCE_ACCOUNT_TABLES, process_due_erasures

DAY = 86400


def commerce_row(table, account_id, row_id):
    """A row with every required column filled, keyed to ``account_id``."""
    values = {}
    for column in table.columns:
        if column.name == "account_id":
            values[column.name] = account_id
        elif column.primary_key or column.unique:
            values[column.name] = f"{row_id}-{column.name}"
        elif column.nullable or column.default is not None or column.server_default is not None:
            continue
        elif isinstance(column.type, Boolean):
            values[column.name] = False
        elif isinstance(column.type, (Integer, Float)):
            values[column.name] = 1
        elif isinstance(column.type, JSON):
            values[column.name] = {}
        else:
            values[column.name] = f"{row_id}-{column.name}"[:20]
    return values


def test_erasure_removes_the_commerce_rows_and_nobody_elses(harness, monkeypatch):  # noqa: F811
    client, factory, codes = harness
    monkeypatch.setenv("DPDP_ARCHIVE_KEY", Fernet.generate_key().decode())
    monkeypatch.setenv("DPDP_ARCHIVE_RETENTION_DAYS", "30")
    user, headers = register(client, codes, "gone@x.test")
    tables = [M.Base.metadata.tables[name] for name in COMMERCE_ACCOUNT_TABLES]
    with factory() as db:
        for n, table in enumerate(tables):
            db.execute(insert(table).values(commerce_row(table, user["id"], f"mine{n}")))
            db.execute(insert(table).values(commerce_row(table, "someone-else", f"theirs{n}")))
        db.commit()
    assert client.post("/api/records/deletion-request", headers=headers).status_code in (200, 201)
    with factory() as db:
        db.get(M.DeletionRequest, user["id"]).requested_at -= 60 * DAY
        db.commit()
        assert process_due_erasures(db)["summary"]["erased"] == 1
        db.commit()
    with factory() as db:
        for table in tables:
            owners = db.scalars(select(table.c.account_id)).all()
            assert owners == ["someone-else"], table.name


def test_export_includes_the_students_own_care_records_only(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = register(client, codes, "me@x.test")
    now = time.time()
    with factory() as db:
        db.add(M.Account(id="doc", identifier="doc@x.test", channel="EMAIL", full_name="Dr", role="NMC_DOCTOR",
                         active=True, profile={}, created_at=now))
        db.add(M.Account(id="other", identifier="o@x.test", channel="EMAIL", full_name="Other", role="STUDENT",
                         active=True, profile={}, created_at=now))
        db.add(M.CatalogEntry(id="consult", provider_id="doc", kind="consultation", name="Consult", brand="Clinic",
                              category="consultation", description="d", pack="1", price_paise=0, stock=0,
                              active=True, requires_prescription=False, preparation=""))
        db.add(M.AvailabilitySlot(id="slot", provider_id="doc", catalog_item_id="consult", slot_start="2026-10-10T09:00",
                                  slot_end="2026-10-10T09:15", capacity=2, booked=2, active=True))
        for owner in (user["id"], "other"):
            db.add(M.Appointment(id=f"apt-{owner}", account_id=owner, provider_id="doc", catalog_item_id="consult",
                                 slot_id="slot", status="COMPLETED", created_at=now, updated_at=now))
            db.add(M.Prescription(id=f"rx-{owner}", prescriber_id="doc", prescriber_reg_no="NMC-1", patient_id=owner,
                                  issued_at=now, valid_until=now + DAY, status="ISSUED", advice="", allergy_check={}))
            db.add(M.PrescriptionItem(id=f"it-{owner}", prescription_id=f"rx-{owner}", generic_name="Paracetamol",
                                      schedule_class="OTC"))
            db.add(M.EncounterNote(id=f"note-{owner}", account_id="doc", patient_id=owner, assessment="Viral fever",
                                   status="FINAL", created_at=now, updated_at=now))
            db.add(M.CrisisEvent(id=f"crisis-{owner}", account_id=owner, kind="CRISIS_SELF_HARM", surface="AYUSH",
                                 created_at=now, outcome_note="counsellor's private note"))
        db.add(M.EncounterNote(id="draft", account_id="doc", patient_id=user["id"], assessment="draft",
                               status="DRAFT", created_at=now, updated_at=now))
        db.commit()

    data = client.get("/api/records/export", headers=headers).json()
    assert [a["id"] for a in data["appointments"]] == [f"apt-{user['id']}"]
    assert [p["id"] for p in data["prescriptions"]] == [f"rx-{user['id']}"]
    assert data["prescriptions"][0]["items"][0]["genericName"] == "Paracetamol"
    assert [n["id"] for n in data["visitNotes"]] == [f"note-{user['id']}"]          # never a draft
    assert [c["id"] for c in data["crisisEvents"]] == [f"crisis-{user['id']}"]
    assert "counsellor's private note" not in str(data)
    assert data["consents"] and all("version" in c for c in data["consents"])     # the signup consent
