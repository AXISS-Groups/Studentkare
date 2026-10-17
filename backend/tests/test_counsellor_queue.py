"""The COUNSELLOR role and the live crisis follow-up queue.

The queue carries a student's name and a way to reach them, so it is limited to
a counsellor on that student's campus and the super admin. A campus
administrator, a clinician and a student are all refused.
"""
import pytest
from test_clinical_fulfilment import make_staff
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M

CRISIS_TEXT = "I want to end my life"


def _crisis(client, codes, identifier, university="Test University", factory=None):
    user, headers = register(client, codes, identifier)
    client.post("/api/care/navigate", json={"query": CRISIS_TEXT}, headers=headers)
    client.post("/api/auth/logout", headers=headers)
    if university != "Test University" and factory is not None:
        with factory() as db:
            account = db.get(M.Account, user["id"])
            account.profile = {**(account.profile or {}), "university": university}
            db.commit()
    return user


def _event_id(factory, account_id):
    with factory() as db:
        return db.query(M.CrisisEvent).filter_by(account_id=account_id).one().id


def _counsellor(client, codes, factory, account_id="counsellor", university="Test University"):
    make_staff(factory, account_id, "COUNSELLOR", f"{account_id}@example.test", "Neha Counsellor",
               profile={"university": university})
    return login(client, codes, f"{account_id}@example.test")


def test_queue_items_carry_the_minimum_and_never_the_message(harness):
    client, factory, codes = harness
    student = _crisis(client, codes, "crisis-min@example.test")
    headers = _counsellor(client, codes, factory)

    response = client.get("/api/ops/crisis-events", headers=headers)
    assert response.status_code == 200, response.text
    [item] = response.json()["items"]
    assert set(item) == {"id", "studentName", "contact", "kind", "createdAt", "acknowledgedAt", "outcome"}
    assert item["studentName"] == "Test Member"
    assert item["contact"] == student["email"]
    assert item["kind"] == "CRISIS_SELF_HARM"
    assert item["outcome"] == "PENDING" and item["acknowledgedAt"] is None
    assert CRISIS_TEXT not in response.text
    assert student["id"] not in response.text


def test_counsellor_on_another_campus_sees_an_empty_queue_and_gets_404(harness):
    client, factory, codes = harness
    student = _crisis(client, codes, "crisis-elsewhere@example.test")
    headers = _counsellor(client, codes, factory, "far-counsellor", university="Another College")

    queue = client.get("/api/ops/crisis-events", headers=headers).json()
    assert queue == {"items": [], "total": 0, "pending": 0}
    acknowledged = client.post(f"/api/ops/crisis-events/{_event_id(factory, student['id'])}/acknowledge",
                               json={"outcome": "CONTACTED"}, headers=headers)
    assert acknowledged.status_code == 404


def test_campus_matching_ignores_case_and_spacing(harness):
    client, factory, codes = harness
    _crisis(client, codes, "crisis-case@example.test")
    headers = _counsellor(client, codes, factory, "case-counsellor", university="  test   university ")
    assert client.get("/api/ops/crisis-events", headers=headers).json()["total"] == 1


def test_campus_admin_is_refused_the_queue_and_acknowledge(harness):
    client, factory, codes = harness
    student = _crisis(client, codes, "crisis-admin@example.test")
    make_staff(factory, "campus-admin", "CAMPUS_ADMIN", "campus-admin@example.test",
               profile={"university": "Test University"})
    headers = login(client, codes, "campus-admin@example.test")

    assert client.get("/api/ops/crisis-events", headers=headers).status_code == 403
    refused = client.post(f"/api/ops/crisis-events/{_event_id(factory, student['id'])}/acknowledge",
                          json={"outcome": "CONTACTED"}, headers=headers)
    assert refused.status_code == 403
    with factory() as db:
        assert db.query(M.CrisisEvent).one().outcome == "PENDING"


def test_student_is_refused_the_queue(harness):
    client, _factory, codes = harness
    _user, headers = register(client, codes, "crisis-nosy@example.test")
    assert client.get("/api/ops/crisis-events", headers=headers).status_code == 403


@pytest.mark.parametrize("outcome", ["CONTACTED", "ESCALATED", "NO_CONTACT_NEEDED", "UNREACHABLE"])
def test_counsellor_records_each_outcome_with_an_audit_entry(harness, outcome):
    client, factory, codes = harness
    student = _crisis(client, codes, f"crisis-{outcome.lower()}@example.test")
    headers = _counsellor(client, codes, factory)
    event_id = _event_id(factory, student["id"])

    done = client.post(f"/api/ops/crisis-events/{event_id}/acknowledge",
                       json={"outcome": outcome, "note": "Called the hostel warden."}, headers=headers)
    assert done.status_code == 200, done.text
    body = done.json()
    assert body["outcome"] == outcome and body["acknowledgedAt"]
    assert "note" not in body and "outcomeNote" not in body

    with factory() as db:
        row = db.get(M.CrisisEvent, event_id)
        assert row.acknowledged_by == "counsellor"
        assert row.outcome_note == "Called the hostel warden."
        assert db.query(M.WorkflowAudit).filter_by(action=f"CRISIS_FOLLOW_UP_{outcome}", resource_id=event_id).count() == 1
    queue = client.get("/api/ops/crisis-events", headers=headers).json()
    assert queue["pending"] == 0


def test_unknown_outcome_is_rejected(harness):
    client, factory, codes = harness
    student = _crisis(client, codes, "crisis-badoutcome@example.test")
    headers = _counsellor(client, codes, factory)
    response = client.post(f"/api/ops/crisis-events/{_event_id(factory, student['id'])}/acknowledge",
                           json={"outcome": "RESOLVED"}, headers=headers)
    assert response.status_code == 422


def test_counsellor_is_not_staff_for_any_other_gate(harness):
    """Least privilege: the new role earns the crisis queue and nothing else."""
    client, factory, codes = harness
    headers = _counsellor(client, codes, factory)
    assert client.get("/api/ops/sos", headers=headers).status_code == 403          # campus admin gate
    assert client.get("/api/v1/pharmacy/rx-reviews", headers=headers).status_code == 403  # staff gate
    assert client.get("/api/ops/accounts", headers=headers).status_code == 403     # super admin gate


def test_super_admin_creates_a_counsellor_only_with_a_campus(harness):
    client, factory, codes = harness
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    headers = login(client, codes, "root@example.test")

    missing = client.post("/api/ops/accounts", headers=headers, json={
        "identifier": "new-counsellor@example.test", "channel": "EMAIL", "fullName": "New Counsellor", "role": "COUNSELLOR"})
    assert missing.status_code == 422

    created = client.post("/api/ops/accounts", headers=headers, json={
        "identifier": "new-counsellor@example.test", "channel": "EMAIL", "fullName": "New Counsellor",
        "role": "COUNSELLOR", "university": "Test University"})
    assert created.status_code == 201, created.text
    with factory() as db:
        row = db.get(M.Account, created.json()["id"])
        assert row.role == "COUNSELLOR" and row.profile == {"university": "Test University"}

    listed = client.get("/api/ops/accounts?role=COUNSELLOR", headers=headers).json()["items"]
    assert [(item["role"], item["campus"]) for item in listed] == [("COUNSELLOR", "Test University")]

    moved = client.patch(f"/api/ops/accounts/{created.json()['id']}/campus", headers=headers,
                         json={"university": "Another College"})
    assert moved.status_code == 200, moved.text


@pytest.mark.parametrize("role", ["CAMPUS_ADMIN", "NMC_DOCTOR"])
def test_crisis_events_never_reach_campus_admins_or_clinicians_through_the_ops_feed(harness, role):
    """The feed is scoped by domain, not campus: crisis events (a student id and a
    crisis kind) stay out of it for everyone but the super admin, on any campus."""
    client, factory, codes = harness
    student = _crisis(client, codes, "feed-own@example.test")
    _crisis(client, codes, "feed-other@example.test", university="Another College", factory=factory)
    make_staff(factory, "feed-staff", role, "feed-staff@example.test", profile={"university": "Test University"})
    headers = login(client, codes, "feed-staff@example.test")

    for path in ("/api/ops/feed", "/api/ops/feed?domain=SAFETY", "/api/ops/feed?unacknowledgedOnly=true"):
        response = client.get(path, headers=headers)
        assert response.status_code == 200, response.text
        body = response.json()
        assert not any(item["kind"] == "CRISIS_GATE_TRIGGERED" or item["resourceType"] == "crisis_event"
                       for item in body["items"])
        assert student["id"] not in response.text
        assert body["critical"] == 0
    assert client.get("/api/ops/feed/counts", headers=headers).json()["domains"].get("SAFETY", 0) == 0

    with factory() as db:
        event_ids = [row.id for row in db.query(M.OpsEvent).filter_by(kind="CRISIS_GATE_TRIGGERED")]
    assert len(event_ids) == 2
    for event_id in event_ids:
        assert client.post(f"/api/ops/feed/{event_id}/acknowledge", headers=headers).status_code == 404


def test_counsellor_cannot_read_the_ops_feed_and_uses_the_scoped_queue_instead(harness):
    client, factory, codes = harness
    _crisis(client, codes, "feed-counsellor@example.test")
    headers = _counsellor(client, codes, factory)
    assert client.get("/api/ops/feed", headers=headers).status_code == 403
    assert client.get("/api/ops/feed/counts", headers=headers).status_code == 403
    assert client.get("/api/ops/crisis-events", headers=headers).json()["total"] == 1


def test_super_admin_still_sees_crisis_events_and_their_counts_in_the_feed(harness):
    client, factory, codes = harness
    _crisis(client, codes, "feed-root-student@example.test")
    _crisis(client, codes, "feed-root-other@example.test", university="Another College", factory=factory)
    make_staff(factory, "feed-root", "SUPER_ADMIN", "feed-root@example.test")
    headers = login(client, codes, "feed-root@example.test")
    feed = client.get("/api/ops/feed?domain=SAFETY", headers=headers).json()
    assert [item["kind"] for item in feed["items"]].count("CRISIS_GATE_TRIGGERED") == 2
    assert client.get("/api/ops/feed/counts", headers=headers).json()["domains"]["SAFETY"] == 2
    assert client.post(f"/api/ops/feed/{feed['items'][0]['id']}/acknowledge", headers=headers).status_code == 200
