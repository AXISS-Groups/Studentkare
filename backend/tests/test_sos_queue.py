"""Campus queue regression proof on SQLite and a fresh migrated PostgreSQL database."""
import time

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session
from test_rule_l import pg_db  # noqa: F401 — pytest fixture
from test_workflow_api import harness  # noqa: F401 — pytest fixture

from core import settings_registry as R
from core import workflow_models as M
from services import emergency_api


@pytest.fixture(params=["sqlite", "postgres"])
def queue_db(request):
    R.reset_cache()
    if request.param == "postgres":
        engine, _, _, _ = request.getfixturevalue("pg_db")
        db = Session(engine)
    else:
        _, factory, _ = request.getfixturevalue("harness")
        db = factory()
    try:
        yield db
    finally:
        db.rollback()
        db.close()
        R.reset_cache()


def queue_user(db, campus, role="CAMPUS_ADMIN"):
    account = M.Account(id="queue-staff", identifier="queue-staff@example.test", channel="EMAIL",
                        full_name="Synthetic Staff", role=role, active=True, staff_campus=campus,
                        profile={"university": "Other Campus"}, created_at=time.time())
    db.add(account)
    db.flush()
    return {"id": account.id, "role": account.role}


def seed_alert(db, alert_id, campus, created_at, status="ACTIVE"):
    student_id = f"student-{alert_id}"
    db.add(M.Account(id=student_id, identifier=f"{student_id}@example.test", channel="EMAIL",
                     full_name="Synthetic Adult", role="STUDENT", active=True, profile={},
                     created_at=time.time()))
    db.flush()
    db.add(M.SosAlert(id=alert_id, account_id=student_id, campus=campus, location_note="",
                     status=status, created_at=created_at))
    db.flush()


def items(db, user, open_only=True):
    return emergency_api.list_sos(open_only=open_only, user=user, db=db)["items"]


def test_older_own_campus_open_alert_survives_more_than_100_newer_other_campus_alerts(queue_db):
    db = queue_db
    user = queue_user(db, "iit hyderabad")
    seed_alert(db, "own-old", "IIT Hyderabad", 1)
    for index in range(110):
        seed_alert(db, f"other-{index}", "BITS Pilani", index + 2)
    assert [item["id"] for item in items(db, user)] == ["own-old"]


def test_open_filter_precedes_cap_and_queue_has_stable_tie_order(queue_db):
    db = queue_db
    user = queue_user(db, "Own Campus")
    for alert_id in ("a", "c", "b"):
        seed_alert(db, alert_id, "Own Campus", 1, "ACKNOWLEDGED" if alert_id == "b" else "ACTIVE")
    for index in range(110):
        seed_alert(db, f"closed-{index:03}", "Own Campus", index + 2, "RESOLVED")
    expected = ["c", "b", "a"]
    assert [item["id"] for item in items(db, user)] == expected
    assert [item["id"] for item in items(db, user)] == expected
    assert len(items(db, user, open_only=False)) == 100


def test_unicode_casefold_and_collapsed_whitespace_match_the_action_scope(queue_db):
    db = queue_db
    user = queue_user(db, "strasse campus")
    seed_alert(db, "matching", "  STRAẞE\t  CAMPUS\n", 1)
    seed_alert(db, "other", "Straße Campus East", 2)
    assert [item["id"] for item in items(db, user)] == ["matching"]
    assert emergency_api._scoped_alert(db, user, "matching").id == "matching"
    with pytest.raises(HTTPException) as denied:
        emergency_api._scoped_alert(db, user, "other")
    assert denied.value.status_code == 404


def test_super_admin_keeps_global_access_and_stable_cap(queue_db):
    db = queue_db
    user = queue_user(db, "", role="SUPER_ADMIN")
    for index in range(110):
        seed_alert(db, f"global-{index:03}", "Campus A" if index % 2 else "Campus B", index)
    result = items(db, user)
    assert len(result) == 100
    assert [item["id"] for item in result] == [f"global-{index:03}" for index in range(109, 9, -1)]
    assert {item["campus"] for item in result} == {"Campus A", "Campus B"}


def test_unassigned_staff_fail_closed_despite_self_service_profile(queue_db):
    db = queue_db
    user = queue_user(db, "")
    seed_alert(db, "other", "Other Campus", 1)
    with pytest.raises(HTTPException) as denied:
        items(db, user)
    assert denied.value.status_code == 403


def test_queue_uses_registry_override_after_campus_filter(queue_db):
    db = queue_db
    user = queue_user(db, "Own Campus")
    db.add(M.SettingOverride(key="emergency.sos_queue_cap", value=2,
                             updated_by=user["id"], updated_at=time.time()))
    for index in range(3):
        seed_alert(db, f"own-{index}", "Own Campus", index)
        seed_alert(db, f"other-{index}", "Other Campus", index + 10)
    assert [item["id"] for item in items(db, user)] == ["own-2", "own-1"]
