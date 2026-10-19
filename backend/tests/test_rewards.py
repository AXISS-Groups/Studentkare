"""Points ledger, invite-a-friend referrals and action medals.

Rule L (AGENTS.md guardrail 4): points are never earned for a body metric, a
reading, a result or adding a health record; medals come from whether a record
exists, never from a value; the ledger lives on the commerce plane and its code
never touches a clinical table.
"""
import ast
import time
from pathlib import Path

import pytest
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from test_workflow_api import SIGNUP_CONSENT, harness, login  # noqa: F401 — harness is a fixture

from core import rule_l
from core import workflow_models as M
from services import rewards
from services.medals import MEDALS

BACKEND = Path(__file__).resolve().parents[1]
HEALTH_WORDS = ("STEP", "WEIGHT", "BMI", "HEART", "WATER", "HYDRAT", "READING", "RESULT", "VITAL", "RECORD",
                "DOCUMENT", "LAB", "CAMP", "VACCIN", "SLEEP", "MOOD", "BLOOD", "MEDIC", "STREAK", "EXERCISE")


def signup(client, codes, email, roll, ref=None, dob="2000-03-14"):
    assert client.post("/api/auth/otp/send", json={"identifier": email, "channel": "EMAIL", "intent": "SIGNUP"}).status_code == 200
    checked = client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).json()
    body = {"fullName": "Test Student", "dob": dob, "university": "Test University", "rollNumber": roll,
            "consent": SIGNUP_CONSENT}
    if ref is not None:
        body["referralCode"] = ref
    result = client.post("/api/auth/signup", headers={"X-CSRF-Token": checked["csrfToken"]}, json=body)
    assert result.status_code == 201, result.text
    return result.json(), {"X-CSRF-Token": result.json()["csrfToken"]}


def add_campus_admin(factory):
    with factory() as db:
        if not db.get(M.Account, "campusadmin"):
            db.add(M.Account(id="campusadmin", identifier="campus@example.test", channel="EMAIL", full_name="Campus Admin",
                             role="CAMPUS_ADMIN", active=True, profile={"university": "Test University"},
                             created_at=time.time()))
            db.commit()


def verify(client, codes, factory, student_email, account_id, roll, status="VERIFIED", headers=None):
    headers = headers or login(client, codes, student_email)
    client.post("/api/campus/verification", json={"university": "Test University", "rollNumber": roll}, headers=headers)
    add_campus_admin(factory)
    staff = login(client, codes, "campus@example.test")
    response = client.patch(f"/api/ops/campus/{account_id}", json={"status": status}, headers=staff)
    assert response.status_code == 200, response.text


def inviter_with_code(client, codes, email="inviter@example.test", roll="INV-1"):
    created, headers = signup(client, codes, email, roll)
    me = client.get("/api/referrals/me", headers=headers)
    assert me.status_code == 200, me.text
    return created["user"]["id"], me.json()["code"]


def ledger(factory, account_id):
    with factory() as db:
        return db.scalars(select(M.PointsEntry).where(M.PointsEntry.account_id == account_id)).all()


# --- the reason list and the plane -------------------------------------------


def test_reasons_are_exactly_the_non_health_ones():
    assert rewards.REASONS == ("REFERRAL_VERIFIED", "REVERSAL")
    for reason in rewards.REASONS:
        assert not any(word in reason for word in HEALTH_WORDS), reason


def test_database_refuses_any_other_reason(harness):
    _, factory, _ = harness
    with factory() as db:
        db.add(M.Account(id="s1", identifier="s1@example.test", channel="EMAIL", full_name="S", role="STUDENT",
                         active=True, profile={}, created_at=time.time()))
        db.commit()
        for bad in ("STEPS_GOAL", "HEALTH_RECORD_ADDED", "READING_ADDED"):
            db.add(M.PointsEntry(id=f"x-{bad}", account_id="s1", amount=10, reason=bad, idempotency_key=bad,
                                 created_at=time.time()))
            with pytest.raises(IntegrityError):
                db.flush()
            db.rollback()
        with pytest.raises(ValueError):
            rewards.award(db, account_id="s1", amount=10, reason="HEALTH_RECORD_ADDED", key="k")


def test_ledger_tables_are_commerce_plane():
    for table in ("care_points_ledger", "care_referral_codes", "care_referrals"):
        assert rule_l.TABLE_PLANES[table] == rule_l.COMMERCE
        assert table not in rule_l.GRANT_MATRIX[rule_l.CLINICAL_ROLE]
        assert table in rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]


def _models_used(path: Path) -> set[str]:
    tree = ast.parse(path.read_text())
    return {node.attr for node in ast.walk(tree)
            if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name) and node.value.id == "M"}


def test_rewards_logic_never_touches_a_clinical_table():
    tables = {cls.__name__: getattr(cls, "__tablename__", None) for cls in vars(M).values() if isinstance(cls, type)}
    used = _models_used(BACKEND / "services" / "rewards.py")
    clinical = [name for name in used if tables.get(name) and rule_l.TABLE_PLANES.get(tables[name]) == rule_l.CLINICAL]
    assert clinical == []


def test_ledger_code_never_edits_or_deletes_an_entry():
    for name in ("rewards.py", "rewards_api.py"):
        source = (BACKEND / "services" / name).read_text()
        assert "delete(M.PointsEntry" not in source and "update(M.PointsEntry" not in source
        assert ".amount =" not in source and "db.delete(" not in source


def test_points_and_referral_endpoints_run_on_the_commerce_session():
    from services.commerce_session import commerce_db
    from services.rewards_api import REWARDS_COMMERCE_PATHS, router

    def deps(dependant):
        for dep in dependant.dependencies:
            yield dep.call
            yield from deps(dep)

    routes = {f"{m} {r.path}": r for r in router.routes for m in r.methods}
    users = {k for k, r in routes.items() if commerce_db in set(deps(r.dependant))}
    assert users == set(REWARDS_COMMERCE_PATHS)
    # Medals read clinical presence: they must never run as sk_commerce.
    assert "GET /api/medals/me" not in users


# --- referrals ----------------------------------------------------------------


def test_code_is_stable_non_guessable_and_link_uses_the_configured_domain(harness, monkeypatch):
    from services.integration_config import INTEGRATIONS_DB

    monkeypatch.setitem(INTEGRATIONS_DB["platform"], "app_domain", "studentkare.co")
    client, _, codes = harness
    _, headers = signup(client, codes, "a@example.test", "A-1")
    first = client.get("/api/referrals/me", headers=headers).json()
    again = client.get("/api/referrals/me", headers=headers).json()
    assert first["code"] == again["code"]
    assert rewards.normalize_code(first["code"]) == first["code"] and len(first["code"]) == 8
    assert first["shareUrl"] == f"https://studentkare.co/signup?ref={first['code']}"
    assert first["counts"] == {"invited": 0, "joined": 0, "rewarded": 0}
    assert "no cash value" in first["pointsNote"]
    assert set(first) == {"code", "shareUrl", "counts", "pointsPerReferral", "monthlyCap", "rewardedThisMonth", "pointsNote"}
    codes_seen = {rewards._new_code() for _ in range(200)}
    assert len(codes_seen) == 200   # random, not sequential


def test_inviter_earns_50_only_when_the_friend_becomes_a_verified_student(harness):
    client, factory, codes = harness
    inviter_id, code = inviter_with_code(client, codes)
    friend, _ = signup(client, codes, "friend@example.test", "FR-1", ref=code.lower())
    assert friend["referralApplied"] is True
    assert ledger(factory, inviter_id) == []        # signing up earns nothing

    headers = login(client, codes, "inviter@example.test")
    counts = client.get("/api/referrals/me", headers=headers).json()["counts"]
    assert counts == {"invited": 1, "joined": 0, "rewarded": 0}
    assert client.get("/api/points/me", headers=headers).json()["balance"] == 0

    verify(client, codes, factory, "friend@example.test", friend["user"]["id"], "FR-1")
    entries = ledger(factory, inviter_id)
    assert [(e.amount, e.reason) for e in entries] == [(50, "REFERRAL_VERIFIED")]

    headers = login(client, codes, "inviter@example.test")
    points = client.get("/api/points/me", headers=headers).json()
    assert points["balance"] == 50 and points["redeemable"] is False and "no cash value" in points["pointsNote"]
    me = client.get("/api/referrals/me", headers=headers).json()
    assert me["counts"] == {"invited": 1, "joined": 1, "rewarded": 1} and me["rewardedThisMonth"] == 1
    # Counts only: nothing names or describes the friend.
    assert "friend@example.test" not in str(me) and friend["user"]["id"] not in str(me)


def test_rejection_pays_nothing(harness):
    client, factory, codes = harness
    inviter_id, code = inviter_with_code(client, codes)
    friend, _ = signup(client, codes, "friend@example.test", "FR-1", ref=code)
    verify(client, codes, factory, "friend@example.test", friend["user"]["id"], "FR-1", status="REJECTED")
    assert ledger(factory, inviter_id) == []
    with factory() as db:
        assert db.scalar(select(M.Referral)).status == "PENDING"


def test_unknown_code_does_not_block_signup(harness):
    client, factory, codes = harness
    created, _ = signup(client, codes, "x@example.test", "X-1", ref="ZZZZZZZZ")
    assert created["referralApplied"] is False
    created, _ = signup(client, codes, "y@example.test", "Y-1", ref="not a code!")
    assert created["referralApplied"] is False
    with factory() as db:
        assert db.scalar(select(M.Referral)) is None
        assert "referralCode" not in db.get(M.Account, created["user"]["id"]).profile


def test_no_self_referral(harness):
    client, factory, codes = harness
    inviter_id, code = inviter_with_code(client, codes)
    headers = login(client, codes, "inviter@example.test")
    assert client.post("/api/referrals/claim", json={"code": code}, headers=headers).status_code == 422
    # A second account with the inviter's own campus roll number is the same person.
    twin, _ = signup(client, codes, "inviter2@example.test", "INV-1", ref=code)
    assert twin["referralApplied"] is True
    with factory() as db:
        inviter = db.get(M.Account, inviter_id)
        inviter.profile = {**inviter.profile, "university": "Test University", "rollNumber": "INV-1"}
        db.commit()
    verify(client, codes, factory, "inviter2@example.test", twin["user"]["id"], "INV-1")
    assert ledger(factory, inviter_id) == []
    with factory() as db:
        assert db.scalar(select(M.Referral)).status == "INELIGIBLE"


def test_one_reward_per_friend_ever(harness):
    client, factory, codes = harness
    inviter_id, code = inviter_with_code(client, codes)
    friend, _ = signup(client, codes, "friend@example.test", "FR-1", ref=code)
    verify(client, codes, factory, "friend@example.test", friend["user"]["id"], "FR-1")
    # Editing identity resets verification; verifying again must not pay again.
    headers = login(client, codes, "friend@example.test")
    assert client.patch("/api/profile", json={"rollNumber": "FR-2"}, headers=headers).status_code == 200
    verify(client, codes, factory, "friend@example.test", friend["user"]["id"], "FR-2", headers=headers)
    with factory() as db:
        account = db.get(M.Account, friend["user"]["id"])
        assert rewards.on_student_verified(db, account) is None   # no PENDING referral left
        db.commit()
    assert len(ledger(factory, inviter_id)) == 1
    # And the friend cannot swap to another code afterwards.
    with factory() as db:
        db.execute(delete(M.RateBucket))   # the OTP send limit, not under test here
        db.commit()
    headers = login(client, codes, "friend@example.test")
    assert client.post("/api/referrals/claim", json={"code": code}, headers=headers).status_code == 409


def test_monthly_cap(harness):
    client, factory, codes = harness
    inviter_id, code = inviter_with_code(client, codes)
    with factory() as db:
        for i in range(rewards.REFERRAL_MONTHLY_CAP):
            rewards.award(db, account_id=inviter_id, amount=rewards.REFERRAL_POINTS,
                          reason="REFERRAL_VERIFIED", key=f"referral:seed-{i}")
        db.commit()
    friend, _ = signup(client, codes, "friend@example.test", "FR-1", ref=code)
    verify(client, codes, factory, "friend@example.test", friend["user"]["id"], "FR-1")
    assert len(ledger(factory, inviter_id)) == rewards.REFERRAL_MONTHLY_CAP
    with factory() as db:
        assert db.scalar(select(M.Referral)).status == "CAPPED"
        # Last month's awards don't count against this month.
        assert rewards.rewarded_this_month(db, inviter_id, now=time.time() + 40 * 86400) == 0
    headers = login(client, codes, "inviter@example.test")
    assert client.get("/api/referrals/me", headers=headers).json()["counts"] == {"invited": 1, "joined": 1, "rewarded": 0}


def test_minor_or_unreadable_birth_date_fails_closed(harness):
    client, factory, codes = harness
    inviter_id, code = inviter_with_code(client, codes)
    friend, _ = signup(client, codes, "friend@example.test", "FR-1", ref=code)
    with factory() as db:
        account = db.get(M.Account, friend["user"]["id"])
        account.profile = {**account.profile, "dob": "not-a-date"}
        db.commit()
    verify(client, codes, factory, "friend@example.test", friend["user"]["id"], "FR-1")
    assert ledger(factory, inviter_id) == []
    with factory() as db:
        assert db.scalar(select(M.Referral)).status == "INELIGIBLE"


def test_inactive_inviter_is_not_paid(harness):
    client, factory, codes = harness
    inviter_id, code = inviter_with_code(client, codes)
    friend, _ = signup(client, codes, "friend@example.test", "FR-1", ref=code)
    with factory() as db:
        db.get(M.Account, inviter_id).active = False
        db.commit()
    verify(client, codes, factory, "friend@example.test", friend["user"]["id"], "FR-1")
    assert ledger(factory, inviter_id) == []


def test_claim_only_on_the_first_day(harness):
    client, factory, codes = harness
    _, code = inviter_with_code(client, codes)
    late, _ = signup(client, codes, "late@example.test", "L-1")
    with factory() as db:
        db.get(M.Account, late["user"]["id"]).created_at = time.time() - 2 * 86400
        db.commit()
    headers = login(client, codes, "late@example.test")
    assert client.post("/api/referrals/claim", json={"code": code}, headers=headers).status_code == 409
    fresh, headers = signup(client, codes, "fresh@example.test", "F-1")
    assert client.post("/api/referrals/claim", json={"code": "WRONG234"}, headers=headers).status_code == 422
    assert client.post("/api/referrals/claim", json={"code": code}, headers=headers).json() == {"applied": True}
    assert client.post("/api/referrals/claim", json={"code": code}, headers=headers).status_code == 409


# --- the ledger -----------------------------------------------------------------


def test_award_is_idempotent(harness):
    _, factory, _ = harness
    with factory() as db:
        db.add(M.Account(id="s1", identifier="s1@example.test", channel="EMAIL", full_name="S", role="STUDENT",
                         active=True, profile={}, created_at=time.time()))
        db.commit()
        first, created = rewards.award(db, account_id="s1", amount=50, reason="REFERRAL_VERIFIED", key="referral:f1")
        again, created_again = rewards.award(db, account_id="s1", amount=50, reason="REFERRAL_VERIFIED", key="referral:f1")
        db.commit()
        assert created and not created_again and first.id == again.id
        assert rewards.balance(db, "s1") == 50


def test_reversal_appends_and_never_deletes(harness, super_admin_client):
    client, headers = super_admin_client
    from app.main import app
    from services.workflow_auth import workflow_db

    db = next(app.dependency_overrides[workflow_db]())
    db.add(M.Account(id="s1", identifier="s1@example.test", channel="EMAIL", full_name="S", role="STUDENT",
                     active=True, profile={}, created_at=time.time()))
    db.commit()
    entry, _ = rewards.award(db, account_id="s1", amount=50, reason="REFERRAL_VERIFIED", key="referral:f1")
    db.commit()
    reversed_ = client.post(f"/api/ops/points/entries/{entry.id}/reverse", headers=headers)
    assert reversed_.status_code == 200, reversed_.text
    body = reversed_.json()
    assert body["amount"] == -50 and body["reason"] == "REVERSAL" and body["reversesEntryId"] == entry.id
    assert client.post(f"/api/ops/points/entries/{entry.id}/reverse", headers=headers).json()["created"] is False
    assert client.post(f"/api/ops/points/entries/{body['id']}/reverse", headers=headers).status_code == 409
    assert client.post("/api/ops/points/entries/nope/reverse", headers=headers).status_code == 404
    db.expire_all()
    rows = db.scalars(select(M.PointsEntry).where(M.PointsEntry.account_id == "s1")).all()
    assert len(rows) == 2 and rewards.balance(db, "s1") == 0
    assert db.scalar(select(M.WorkflowAudit).where(M.WorkflowAudit.action == "POINTS_REVERSED"))


def test_only_a_super_admin_can_reverse(harness):
    client, factory, codes = harness
    _, headers = signup(client, codes, "s@example.test", "S-1")
    assert client.post("/api/ops/points/entries/anything/reverse", headers=headers).status_code == 403


# --- who can read what ---------------------------------------------------------------


def test_another_student_cannot_see_your_points_or_referrals(harness):
    client, factory, codes = harness
    inviter_id, code = inviter_with_code(client, codes)
    with factory() as db:
        rewards.award(db, account_id=inviter_id, amount=50, reason="REFERRAL_VERIFIED", key="referral:x")
        db.commit()
    _, other = signup(client, codes, "other@example.test", "O-1")
    mine = client.get("/api/points/me", headers=other).json()
    assert mine["balance"] == 0 and mine["entries"] == []
    assert client.get("/api/referrals/me", headers=other).json()["code"] != code
    # No endpoint takes someone else's id.
    assert client.get(f"/api/points/{inviter_id}", headers=other).status_code == 404


def test_signed_out_and_non_students_are_refused(harness):
    client, factory, codes = harness
    for path in ("/api/referrals/me", "/api/points/me", "/api/medals/me"):
        assert client.get(path).status_code == 401
    add_campus_admin(factory)
    staff = login(client, codes, "campus@example.test")
    assert client.get("/api/referrals/me", headers=staff).status_code == 403
    assert client.get("/api/medals/me", headers=staff).status_code == 403
    with factory() as db:
        assert db.scalar(select(M.ReferralCode)) is None   # no code minted for staff


# --- medals ---------------------------------------------------------------------------


def medal_map(client, headers):
    items = client.get("/api/medals/me", headers=headers).json()["items"]
    for item in items:
        assert set(item) == {"id", "earned"}   # presence only: no values, dates or counts
    return {item["id"]: item["earned"] for item in items}


def test_medals_come_from_presence_never_values(harness):
    client, factory, codes = harness
    created, headers = signup(client, codes, "m@example.test", "M-1")
    account_id = created["user"]["id"]
    assert not any(medal_map(client, headers).values())

    # Body metrics never earn anything, whatever their value.
    with factory() as db:
        for i, (metric, value) in enumerate((("steps", 25000), ("weight", 60), ("heart_rate", 60), ("water", 3))):
            db.add(M.Reading(id=f"r{i}", account_id=account_id, metric=metric, value=value,
                             recorded_at="2026-10-20T08:00:00", source="MANUAL"))
        db.commit()
    assert not any(medal_map(client, headers).values())

    with factory() as db:
        # A health record earns no medal (Rule L, 38c8ecf): filing one changes nothing below.
        db.add(M.Document(id="d1", account_id=account_id, title="Hep B", category="VACCINE", filename="v.pdf",
                          mime_type="application/pdf", content=b"%PDF", created_at=time.time()))
        db.add(M.HealthCamp(id="c1", name="Camp", date="2026-10-20"))
        db.add(M.CampAttendance(id="a1", camp_id="c1", account_id=account_id, checked_in=True, created_at=time.time()))
        account = db.get(M.Account, account_id)
        account.profile = {**account.profile, "bloodGroup": "O+", "emergencyContactName": "Parent",
                           "emergencyContactPhone": "+919876543210"}
        db.commit()
    medals = medal_map(client, headers)
    assert medals["FIRST_HEALTH_CAMP"] and medals["EMERGENCY_CARD_COMPLETE"]
    assert "VACCINATION_RECORD_ADDED" not in medals and len(medals) == 4
    assert not medals["PROFILE_VERIFIED"] and not medals["FRIEND_JOINED"]
    # Medals pay nothing.
    assert ledger(factory, account_id) == []


def test_profile_and_friend_medals(harness):
    client, factory, codes = harness
    inviter_id, code = inviter_with_code(client, codes)
    friend, _ = signup(client, codes, "friend@example.test", "FR-1", ref=code)
    verify(client, codes, factory, "friend@example.test", friend["user"]["id"], "FR-1")
    headers = login(client, codes, "friend@example.test")
    assert medal_map(client, headers)["PROFILE_VERIFIED"] is True
    headers = login(client, codes, "inviter@example.test")
    medals = medal_map(client, headers)
    assert medals["FRIEND_JOINED"] is True and medals["PROFILE_VERIFIED"] is False
    assert list(medals) == list(MEDALS)


def test_incomplete_emergency_card_is_not_a_medal(harness):
    from services.medals import _emergency_card_complete

    assert not _emergency_card_complete({"bloodGroup": "O+", "emergencyContactName": "P"})
    assert not _emergency_card_complete({"emergencyContactName": "P", "emergencyContactPhone": "9876543210"})
    assert not _emergency_card_complete({"bloodGroup": "O+", "emergencyContactName": "P", "emergencyContactPhone": "12345"})
    assert _emergency_card_complete({"bloodGroup": "AB-", "emergencyContactName": "P", "emergencyContactPhone": "9876543210"})
