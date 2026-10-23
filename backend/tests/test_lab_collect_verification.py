"""WP-15 StaffCollect: a lab records a sample as collected only for the student it just verified.

The app keeps "Sample collected" shut until the counter has verified this
booking's student; the server enforces the same rule on PATCH /lab-orders/{id}
(SAMPLE_COLLECTED). The proof is a 200 from POST /identity/verify by the same
signed-in counter account, for this student, within
lab.collect_verification_minutes.
"""
import time

import pytest
from sqlalchemy import select
from test_clinical_fulfilment import make_provider, make_staff
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import settings_registry as R
from core import workflow_models as M
from services.clinical_api import COLLECT_NEEDS_VERIFICATION, student_verified_at_counter

WINDOW_KEY = "lab.collect_verification_minutes"


@pytest.fixture(autouse=True)
def _fresh_settings():
    R.reset_cache()
    yield
    R.reset_cache()


def student_with_pass(client, codes, identifier):
    """A student who has issued their pass; returns (user, live pass code). Signs them out."""
    user, headers = register(client, codes, identifier)
    card = client.post("/api/identity", headers=headers)
    assert card.status_code == 201, card.text
    client.post("/api/auth/logout", headers=headers)
    return user, card.json()["code"]


def booked(client, factory, codes):
    """Two students with passes; the first has an ASSIGNED booking at lab-1 (owned by labco)."""
    make_staff(factory, "labco", "VENDOR", "labco@example.test")
    make_provider(factory, "lab-1", "labco", "LAB", pincode="500001")
    make_staff(factory, "otherlab", "VENDOR", "otherlab@example.test")
    make_provider(factory, "lab-2", "otherlab", "LAB", pincode="500001")
    student, headers = register(client, codes, "collect-me@example.test")
    order = client.post("/api/lab-orders", json={"labId": "lab-1", "testPanel": ["CBC"]}, headers=headers)
    assert order.status_code == 201, order.text
    code = client.post("/api/identity", headers=headers).json()["code"]
    client.post("/api/auth/logout", headers=headers)
    other, other_code = student_with_pass(client, codes, "someone-else@example.test")
    lab = login(client, codes, "labco@example.test")
    assigned = client.patch(f"/api/lab-orders/{order.json()['id']}", json={"status": "ASSIGNED", "collectorName": "P. Rao"},
                            headers=lab)
    assert assigned.status_code == 200, assigned.text
    return order.json()["id"], student, code, other, other_code, lab


def collect(client, order_id, headers):
    return client.patch(f"/api/lab-orders/{order_id}", json={"status": "SAMPLE_COLLECTED", "sampleId": "T-5521-B"},
                        headers=headers)


def status_of(factory, order_id):
    with factory() as db:
        return db.get(M.LabOrder, order_id).status


def test_verified_here_then_collected(harness):
    client, factory, codes = harness
    order_id, student, code, *_rest, lab = booked(client, factory, codes)
    verified = client.post("/api/identity/verify", headers=lab, json={"code": code})
    assert verified.status_code == 200, verified.text
    response = collect(client, order_id, lab)
    assert response.status_code == 200, response.text
    assert status_of(factory, order_id) == "SAMPLE_COLLECTED"


def test_unverified_student_cannot_be_collected(harness):
    client, factory, codes = harness
    order_id, *_rest, lab = booked(client, factory, codes)
    response = collect(client, order_id, lab)
    assert response.status_code == 409
    assert response.json()["detail"] == COLLECT_NEEDS_VERIFICATION
    assert status_of(factory, order_id) == "ASSIGNED"
    with factory() as db:
        assert db.get(M.LabOrder, order_id).sample_id == ""


def test_verifying_a_different_student_does_not_unlock_this_booking(harness):
    client, factory, codes = harness
    order_id, _student, _code, _other, other_code, lab = booked(client, factory, codes)
    assert client.post("/api/identity/verify", headers=lab, json={"code": other_code}).status_code == 200
    assert collect(client, order_id, lab).status_code == 409
    assert status_of(factory, order_id) == "ASSIGNED"


def test_an_expired_verification_does_not_count(harness, monkeypatch):
    client, factory, codes = harness
    order_id, student, code, *_rest, lab = booked(client, factory, codes)
    assert client.post("/api/identity/verify", headers=lab, json={"code": code}).status_code == 200
    window = R.get_declaration(WINDOW_KEY).default * 60
    with factory() as db:
        assert student_verified_at_counter(db, "labco", student["id"]) is True
        later = time.time() + window + 1
        assert student_verified_at_counter(db, "labco", student["id"], now=later) is False
    real_time = time.time
    monkeypatch.setattr(time, "time", lambda: real_time() + window + 1)
    assert collect(client, order_id, lab).status_code == 409
    assert status_of(factory, order_id) == "ASSIGNED"


def test_the_window_comes_from_the_settings_registry(harness):
    client, factory, codes = harness
    order_id, student, code, *_rest, lab = booked(client, factory, codes)
    assert client.post("/api/identity/verify", headers=lab, json={"code": code}).status_code == 200
    with factory() as db:
        db.merge(M.SettingOverride(key=WINDOW_KEY, value=1, updated_by="test", updated_at=time.time()))
        db.commit()
    R.reset_cache()
    with factory() as db:
        assert student_verified_at_counter(db, "labco", student["id"], now=time.time() + 59) is True
        assert student_verified_at_counter(db, "labco", student["id"], now=time.time() + 61) is False


def test_another_partners_verification_does_not_count(harness):
    client, factory, codes = harness
    order_id, student, code, *_rest, lab = booked(client, factory, codes)
    client.post("/api/auth/logout", headers=lab)
    other_lab = login(client, codes, "otherlab@example.test")
    assert client.post("/api/identity/verify", headers=other_lab, json={"code": code}).status_code == 200
    # The other partner cannot collect a booking that is not theirs at all...
    assert collect(client, order_id, other_lab).status_code == 403
    client.post("/api/auth/logout", headers=other_lab)
    # ...and their verification does not let this lab collect either.
    lab = login(client, codes, "labco@example.test")
    assert collect(client, order_id, lab).status_code == 409
    assert status_of(factory, order_id) == "ASSIGNED"
    with factory() as db:
        verifiers = db.scalars(select(M.WorkflowAudit.actor_id).where(
            M.WorkflowAudit.action == "DIGITAL_ID_VERIFIED", M.WorkflowAudit.resource_id == student["id"])).all()
        assert verifiers == ["otherlab"]
