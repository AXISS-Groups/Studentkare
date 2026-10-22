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
from sqlalchemy import delete, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from test_rule_l import pg_db  # noqa: F401 — pytest fixture
from test_workflow_api import (  # noqa: F401 — harness is a fixture
    SIGNUP_CONSENT,
    SIGNUP_PASSWORD,
    harness,
    login,
    verify_second_contact,
)

from core import rule_l
from core import settings_registry as R
from core import workflow_models as M
from services import rewards
from services.medals import MEDALS

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
DAY_SECONDS = 86400
HEALTH_WORDS = ("STEP", "WEIGHT", "BMI", "HEART", "WATER", "HYDRAT", "READING", "RESULT", "VITAL", "RECORD",
                "DOCUMENT", "LAB", "CAMP", "VACCIN", "SLEEP", "MOOD", "BLOOD", "MEDIC", "STREAK", "EXERCISE")


def signup(client, codes, email, roll, ref=None, dob="2000-03-14"):
    assert client.post("/api/auth/otp/send", json={"identifier": email, "channel": "EMAIL", "intent": "SIGNUP"}).status_code == 200
    checked = client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).json()
    verify_second_contact(client, codes, {"X-CSRF-Token": checked["csrfToken"]})
    body = {"fullName": "Test Student", "dob": dob, "university": "Test University", "rollNumber": roll,
            "consent": SIGNUP_CONSENT, "password": SIGNUP_PASSWORD}
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


@pytest.fixture(autouse=True)
def _fresh_settings():
    R.reset_cache()
    yield
    R.reset_cache()


def override(factory, key, value):
    """Set a registry override the way PATCH /api/ops/settings/{key} stores it."""
    with factory() as db:
        db.merge(M.SettingOverride(key=key, value=value, updated_by="test", updated_at=time.time()))
        db.commit()
    R.reset_cache()


def points_default():
    return R.get_declaration("rewards.referral_points").default


def cap_default():
    return R.get_declaration("rewards.referral_monthly_cap").default


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
    assert rewards.normalize_code(first["code"]) == first["code"] and len(first["code"]) == rewards.CODE_LENGTH
    assert first["shareUrl"] == f"https://studentkare.co/signup?ref={first['code']}"
    assert first["counts"] == {"invited": 0, "joined": 0, "rewarded": 0}
    assert first["pointsNoteCode"] == "POINTS_NO_CASH_VALUE" and "no cash value" in first["pointsNote"]
    assert first["pointsPerReferral"] == points_default() and first["monthlyCap"] == cap_default()
    assert set(first) == {"code", "shareUrl", "counts", "pointsPerReferral", "monthlyCap", "rewardedThisMonth",
                          "pointsNoteCode", "pointsNote"}
    codes_seen = {rewards._new_code() for _ in range(200)}
    assert len(codes_seen) == 200   # random, not sequential


def test_share_link_follows_the_configured_domain(harness, monkeypatch):
    from services.integration_config import INTEGRATIONS_DB

    monkeypatch.setitem(INTEGRATIONS_DB["platform"], "app_domain", "staging.example.test")
    client, _, codes = harness
    _, headers = signup(client, codes, "a@example.test", "A-1")
    me = client.get("/api/referrals/me", headers=headers).json()
    assert me["shareUrl"] == f"https://staging.example.test/signup?ref={me['code']}"


def test_invite_code_format_matches_the_app():
    """The code alphabet, length and link parameter are one protocol shared with
    src/features/rewards/inviteCode.ts; this keeps the two copies equal."""
    source = (ROOT / "src" / "features" / "rewards" / "inviteCode.ts").read_text()
    assert f"INVITE_CODE_ALPHABET = '{rewards.CODE_ALPHABET}'" in source
    assert f"INVITE_CODE_LENGTH = {rewards.CODE_LENGTH}" in source
    assert f"INVITE_CODE_PARAM = '{rewards.INVITE_CODE_PARAM}'" in source


def test_inviter_earns_the_referral_points_only_when_the_friend_becomes_a_verified_student(harness):
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
    assert [(e.amount, e.reason) for e in entries] == [(points_default(), "REFERRAL_VERIFIED")]

    headers = login(client, codes, "inviter@example.test")
    points = client.get("/api/points/me", headers=headers).json()
    assert points["balance"] == points_default() and points["redeemable"] is False
    assert points["pointsNoteCode"] == "POINTS_NO_CASH_VALUE" and "no cash value" in points["pointsNote"]
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
        for i in range(cap_default()):
            rewards.award(db, account_id=inviter_id, amount=points_default(),
                          reason="REFERRAL_VERIFIED", key=f"referral:seed-{i}")
        db.commit()
    friend, _ = signup(client, codes, "friend@example.test", "FR-1", ref=code)
    verify(client, codes, factory, "friend@example.test", friend["user"]["id"], "FR-1")
    assert len(ledger(factory, inviter_id)) == cap_default()
    with factory() as db:
        assert db.scalar(select(M.Referral)).status == "CAPPED"
        # Last month's awards don't count against this month.
        assert rewards.rewarded_this_month(db, inviter_id, now=time.time() + 40 * DAY_SECONDS) == 0
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
        db.get(M.Account, late["user"]["id"]).created_at = time.time() - rewards.claim_window_seconds() - DAY_SECONDS
        db.commit()
    headers = login(client, codes, "late@example.test")
    late_claim = client.post("/api/referrals/claim", json={"code": code}, headers=headers)
    assert late_claim.status_code == 409 and late_claim.json()["detail"]["code"] == "REFERRAL_CLAIM_WINDOW_CLOSED"
    fresh, headers = signup(client, codes, "fresh@example.test", "F-1")
    wrong = client.post("/api/referrals/claim", json={"code": "WRONG234"}, headers=headers)
    assert wrong.status_code == 422 and wrong.json()["detail"] == {
        "code": "REFERRAL_CODE_NOT_USABLE", "message": "That invite code can't be used. Check it with the friend who sent it."}
    assert client.post("/api/referrals/claim", json={"code": code}, headers=headers).json() == {"applied": True}
    again = client.post("/api/referrals/claim", json={"code": code}, headers=headers)
    assert again.status_code == 409 and again.json()["detail"]["code"] == "REFERRAL_ALREADY_SET"


# --- the registry decides the numbers (AGENTS.md rule 11) ----------------------------


def test_referral_points_override_changes_the_award(harness):
    client, factory, codes = harness
    overridden = points_default() + 25
    override(factory, "rewards.referral_points", overridden)
    inviter_id, code = inviter_with_code(client, codes)
    friend, _ = signup(client, codes, "friend@example.test", "FR-1", ref=code)
    verify(client, codes, factory, "friend@example.test", friend["user"]["id"], "FR-1")
    assert [e.amount for e in ledger(factory, inviter_id)] == [overridden]
    headers = login(client, codes, "inviter@example.test")
    assert client.get("/api/referrals/me", headers=headers).json()["pointsPerReferral"] == overridden
    assert client.get("/api/points/me", headers=headers).json()["balance"] == overridden


def test_monthly_cap_override_changes_the_cap(harness):
    client, factory, codes = harness
    override(factory, "rewards.referral_monthly_cap", 1)
    inviter_id, code = inviter_with_code(client, codes)
    first, _ = signup(client, codes, "f1@example.test", "FR-1", ref=code)
    second, _ = signup(client, codes, "f2@example.test", "FR-2", ref=code)
    verify(client, codes, factory, "f1@example.test", first["user"]["id"], "FR-1")
    verify(client, codes, factory, "f2@example.test", second["user"]["id"], "FR-2")
    assert len(ledger(factory, inviter_id)) == 1      # the default cap would have paid both
    with factory() as db:
        statuses = {r.referred_account_id: r.status for r in db.scalars(select(M.Referral))}
    assert statuses == {first["user"]["id"]: "REWARDED", second["user"]["id"]: "CAPPED"}
    headers = login(client, codes, "inviter@example.test")
    assert client.get("/api/referrals/me", headers=headers).json()["monthlyCap"] == 1


def test_claim_window_override_changes_the_window(harness):
    client, factory, codes = harness
    _, code = inviter_with_code(client, codes)
    joined, headers = signup(client, codes, "j@example.test", "J-1")
    two_hours = 2
    with factory() as db:   # inside the default window, outside a one-hour window
        db.get(M.Account, joined["user"]["id"]).created_at = time.time() - two_hours * rewards.SECONDS_PER_HOUR
        db.commit()
    override(factory, "rewards.referral_claim_window_hours", 1)
    refused = client.post("/api/referrals/claim", json={"code": code}, headers=headers)
    assert refused.status_code == 409 and refused.json()["detail"]["code"] == "REFERRAL_CLAIM_WINDOW_CLOSED"
    override(factory, "rewards.referral_claim_window_hours", two_hours + 1)
    assert client.post("/api/referrals/claim", json={"code": code}, headers=headers).json() == {"applied": True}


def test_claim_attempts_override_changes_the_rate_limit(harness):
    client, factory, codes = harness
    _, headers = signup(client, codes, "r@example.test", "R-1")
    override(factory, "rewards.referral_claim_attempts", 1)
    assert client.post("/api/referrals/claim", json={"code": "WRONG234"}, headers=headers).status_code == 422
    assert client.post("/api/referrals/claim", json={"code": "WRONG234"}, headers=headers).status_code == 429


def test_ledger_entries_shown_override_limits_the_list(harness):
    client, factory, codes = harness
    created, headers = signup(client, codes, "l@example.test", "L-1")
    account_id = created["user"]["id"]
    shown = 2
    with factory() as db:
        for i in range(shown + 1):
            rewards.award(db, account_id=account_id, amount=points_default(), reason="REFERRAL_VERIFIED",
                          key=f"referral:l-{i}")
        db.commit()
    assert len(client.get("/api/points/me", headers=headers).json()["entries"]) == shown + 1
    override(factory, "rewards.ledger_entries_shown", shown)
    body = client.get("/api/points/me", headers=headers).json()
    assert len(body["entries"]) == shown and body["balance"] == (shown + 1) * points_default()


def test_month_boundary_is_the_platform_time_zone():
    from datetime import datetime

    from services import student_time

    zone = student_time.default_zone()
    # Just after local midnight on the 1st: still the previous day in UTC.
    moment = datetime(2026, 11, 1, 0, 30, tzinfo=zone).timestamp()
    assert rewards.month_start(moment) == datetime(2026, 11, 1, tzinfo=zone).timestamp()
    just_before = datetime(2026, 10, 31, 23, 59, tzinfo=zone).timestamp()
    assert rewards.month_start(just_before) == datetime(2026, 10, 1, tzinfo=zone).timestamp()


# --- the ledger -----------------------------------------------------------------


def test_award_is_idempotent(harness):
    _, factory, _ = harness
    with factory() as db:
        db.add(M.Account(id="s1", identifier="s1@example.test", channel="EMAIL", full_name="S", role="STUDENT",
                         active=True, profile={}, created_at=time.time()))
        db.commit()
        amount = points_default()
        first, created = rewards.award(db, account_id="s1", amount=amount, reason="REFERRAL_VERIFIED", key="referral:f1")
        again, created_again = rewards.award(db, account_id="s1", amount=amount, reason="REFERRAL_VERIFIED",
                                             key="referral:f1")
        db.commit()
        assert created and not created_again and first.id == again.id
        assert rewards.balance(db, "s1") == amount


def test_reversal_appends_and_never_deletes(harness, super_admin_client):
    client, headers = super_admin_client
    from app.main import app
    from services.workflow_auth import workflow_db

    db = next(app.dependency_overrides[workflow_db]())
    db.add(M.Account(id="s1", identifier="s1@example.test", channel="EMAIL", full_name="S", role="STUDENT",
                     active=True, profile={}, created_at=time.time()))
    db.commit()
    entry, _ = rewards.award(db, account_id="s1", amount=points_default(), reason="REFERRAL_VERIFIED", key="referral:f1")
    db.commit()
    reversed_ = client.post(f"/api/ops/points/entries/{entry.id}/reverse", headers=headers)
    assert reversed_.status_code == 200, reversed_.text
    body = reversed_.json()
    assert body["amount"] == -points_default() and body["reason"] == "REVERSAL" and body["reversesEntryId"] == entry.id
    assert client.post(f"/api/ops/points/entries/{entry.id}/reverse", headers=headers).json()["created"] is False
    twice = client.post(f"/api/ops/points/entries/{body['id']}/reverse", headers=headers)
    assert twice.status_code == 409 and twice.json()["detail"]["code"] == "LEDGER_REVERSAL_REFUSED"
    missing = client.post("/api/ops/points/entries/nope/reverse", headers=headers)
    assert missing.status_code == 404 and missing.json()["detail"]["code"] == "LEDGER_ENTRY_NOT_FOUND"
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
        rewards.award(db, account_id=inviter_id, amount=points_default(), reason="REFERRAL_VERIFIED", key="referral:x")
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
    refused = client.get("/api/referrals/me", headers=staff)
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == "REWARDS_STUDENTS_ONLY"
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
        account.profile = {**account.profile, "emergencyContactName": "Parent",
                           "emergencyContactPhone": "+919876543210"}
        # Blood group is on the clinical plane; the medal still only checks it is there.
        db.add(M.ClinicalProfile(account_id=account_id, blood_group="O+", allergies=[]))
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


def test_pg_commerce_session_reads_the_override(pg_db):
    """The points endpoints run as sk_commerce, which has no grant on the platform
    settings table. The registry reads overrides on a session of its own, so an
    override still applies there instead of silently falling back to the default."""
    from services.commerce_session import open_commerce_session

    engine, *_ = pg_db
    overridden = points_default() + 5
    with Session(engine) as db:
        db.merge(M.SettingOverride(key="rewards.referral_points", value=overridden, updated_by="test",
                                   updated_at=time.time()))
        db.commit()
    R.reset_cache()
    try:
        with open_commerce_session(engine) as db:
            assert db.scalar(text("SELECT current_user")) == "sk_commerce"
            assert rewards.referral_points(db) == overridden
    finally:
        with Session(engine) as db:
            db.execute(delete(M.SettingOverride))
            db.commit()
