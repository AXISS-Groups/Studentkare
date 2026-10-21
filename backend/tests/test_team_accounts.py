"""Team accounts (founder decision 2026-10-22): one shared account per role, signed in with a PIN.

Covers the PIN hash, the lockout and unlock, the rate limits, one answer for every
failure, the audit trail (never the PIN), the master switch, students refused, the
command creating idempotently, the Super admin screen's endpoints, the WELLNESS
partner kind, and the scoping that keeps team accounts away from real students.
"""
import secrets
import time

import pytest
from sqlalchemy import select
from test_workflow_api import harness, login  # noqa: F401 — pytest fixture

from core import workflow_models as M
from core.settings_registry import setting as real_setting
from core.team_scope import TEAM_CAMPUS, team_sandboxed
from services import team_accounts as T
from services import twofa_store
from services.integration_config import app_domain


def tid(local: str) -> str:
    return f"{local}@{app_domain()}".lower()


@pytest.fixture
def team(harness):  # noqa: F811
    """The harness plus every team account, with the PINs the command printed."""
    client, factory, codes = harness
    with factory() as db:
        results = T.create_missing(db)
    pins = {r.identifier: r.pin for r in results}
    return client, factory, codes, pins


def overrides(monkeypatch, **values):
    """Override settings the team-accounts module reads, by their key with dots as __."""
    wanted = {key.replace("__", "."): value for key, value in values.items()}
    monkeypatch.setattr(T, "setting", lambda key, db=None: wanted[key] if key in wanted else real_setting(key, db))


def pin_in(client, identifier, pin):
    return client.post("/api/auth/staff-pin/sign-in", json={"identifier": identifier, "pin": pin})


def wrong(pin: str) -> str:
    return "000001" if pin != "000001" else "000002"


def audits(factory, action=None):
    with factory() as db:
        rows = db.scalars(select(M.WorkflowAudit)).all()
    return [r for r in rows if action is None or r.action == action]


def seed(factory, *, role="STUDENT", identifier=None, profile=None, kind="", team=False):
    identifier = identifier or f"{role.lower()}.{secrets.token_hex(4)}@example.test"
    account_id = f"acc_{secrets.token_hex(6)}"
    with factory() as db:
        db.add(M.Account(id=account_id, identifier=identifier, channel="EMAIL", full_name=f"{role} person", role=role,
                         active=True, profile=profile or {}, created_at=time.time(), partner_kind=kind,
                         is_team_account=team))
        db.commit()
    return account_id, identifier


# --- hashing and PINs ---------------------------------------------------------

def test_hash_is_salted_slow_and_never_the_pin():
    pin = T.generate_pin()
    first, second = T.hash_pin(pin), T.hash_pin(pin)
    assert first != second                       # a fresh salt each time
    assert pin not in first
    assert first.startswith("scrypt$") and first.split("$")[1] == str(T.SCRYPT_N)
    assert T.verify_pin(pin, first) and T.verify_pin(pin, second)
    assert not T.verify_pin(wrong(pin), first)
    assert not T.verify_pin(pin, "not-a-hash")
    assert not T.verify_pin(pin, "md5$1$1$1$AA==$AA==")


@pytest.mark.parametrize("pin", ["000000", "111111", "123456", "654321", "890123", "121212", "123123", "112211", "989898"])
def test_weak_pins_are_recognised(pin):
    assert T.is_weak_pin(pin)


def test_generated_pins_are_six_digits_and_never_weak():
    pins = [T.generate_pin() for _ in range(300)]
    assert all(len(p) == T.PIN_LENGTH and p.isdigit() and not T.is_weak_pin(p) for p in pins)
    assert len(set(pins)) > 250                  # random, not a fixed list


# --- the command --------------------------------------------------------------

def test_create_makes_every_account_once_and_never_reprints_a_pin(harness):  # noqa: F811
    _client, factory, _codes = harness
    with factory() as db:
        first = T.create_missing(db)
        again = T.create_missing(db)
    assert len(first) == len(T.TEAM_ACCOUNTS)
    assert all(r.pin and r.note == "created" for r in first)
    assert all(r.pin is None and r.note == "exists" for r in again)
    with factory() as db:
        rows = {a.identifier: a for a in db.scalars(select(M.Account).where(M.Account.is_team_account.is_(True)))}
        for result in first:
            credential = db.get(M.StaffPinCredential, rows[result.identifier].id)
            assert T.verify_pin(result.pin, credential.pin_hash)
            assert result.pin not in credential.pin_hash
    roles = {(r.role, r.partner_kind) for r in first}
    assert roles == {("SUPER_ADMIN", ""), ("CAMPUS_ADMIN", ""), ("COUNSELLOR", ""), ("NMC_DOCTOR", ""),
                     ("VENDOR", "CLINIC"), ("VENDOR", "PHARMACY"), ("VENDOR", "LAB"), ("VENDOR", "WELLNESS")}
    assert rows[tid("campus")].profile["university"] == TEAM_CAMPUS
    assert rows[tid("counsellor")].profile["university"] == TEAM_CAMPUS
    assert rows[tid("pharmacy")].profile["organisation"] == T.TEAM_PARTNER_ORG
    assert len(audits(factory, "TEAM_ACCOUNT_CREATED")) == len(T.TEAM_ACCOUNTS)


def test_create_never_takes_over_a_real_account(harness):  # noqa: F811
    _client, factory, _codes = harness
    seed(factory, role="CAMPUS_ADMIN", identifier=tid("campus"))
    with factory() as db:
        results = {r.identifier: r for r in T.create_missing(db)}
        real = db.scalar(select(M.Account).where(M.Account.identifier == tid("campus")))
        assert real.is_team_account is False
        assert db.get(M.StaffPinCredential, real.id) is None
    assert results[tid("campus")].pin is None
    assert results[tid("campus")].note.startswith("skipped")


def test_command_line_create_and_rotate(team, capsys, monkeypatch):
    _client, factory, _codes, pins = team
    from scripts import team_accounts as cli
    monkeypatch.setattr(cli, "SessionLocal", factory)
    monkeypatch.setattr(cli, "create_all_tables", lambda: None)
    assert cli.main(["create"]) == 0
    out = capsys.readouterr().out
    assert "No new PINs" in out and not any(pin in out for pin in pins.values())
    assert cli.main(["rotate", "lab"]) == 0
    out = capsys.readouterr().out
    new_pin = out.split("new PIN ")[1].split()[0]
    with factory() as db:
        account = T.team_account(db, "lab")
        assert T.verify_pin(new_pin, db.get(M.StaffPinCredential, account.id).pin_hash)
    assert cli.main(["rotate", "nobody"]) == 1
    assert cli.main(["list"]) == 0
    assert new_pin not in capsys.readouterr().out


# --- sign-in --------------------------------------------------------------------

def test_pin_signs_in_with_the_role_and_audits_it(team):
    client, factory, _codes, pins = team
    signed = pin_in(client, tid("pharmacy"), pins[tid("pharmacy")])
    assert signed.status_code == 200, signed.text
    user = signed.json()["user"]
    assert user["role"] == "VENDOR" and user["partnerKind"] == "PHARMACY" and user["isTeamAccount"] is True
    assert client.get("/api/auth/session").json()["user"]["id"] == "team-pharmacy"
    assert len(audits(factory, "STAFF_PIN_SIGN_IN")) == 1
    with factory() as db:
        assert db.get(M.StaffPinCredential, "team-pharmacy").last_sign_in_at > 0


def test_every_failure_gets_the_same_answer(team):
    client, factory, _codes, pins = team
    _sid, student = seed(factory, role="STUDENT")
    with factory() as db:
        T.disable(db, T.team_account(db, "lab"), "test")
    answers = [
        pin_in(client, f"nobody.{secrets.token_hex(3)}@{app_domain()}", "482915"),
        pin_in(client, student, "482915"),
        pin_in(client, tid("clinic"), wrong(pins[tid("clinic")])),
        pin_in(client, tid("lab"), pins[tid("lab")]),          # disabled
    ]
    assert {a.status_code for a in answers} == {401}
    assert len({str(a.json()) for a in answers}) == 1
    assert client.get("/api/auth/session").json()["user"] is None


def test_students_never_sign_in_with_a_pin(team):
    client, factory, _codes, _pins = team
    pin = T.generate_pin()
    for flagged in (False, True):
        account_id, student = seed(factory, role="STUDENT", team=flagged)
        with factory() as db:
            db.add(M.StaffPinCredential(account_id=account_id, pin_hash=T.hash_pin(pin), created_at=time.time()))
            db.commit()
        assert pin_in(client, student, pin).status_code == 401
    assert client.get("/api/auth/session").json()["user"] is None


def test_lockout_after_max_attempts_then_unlock(team, monkeypatch):
    client, factory, _codes, pins = team
    ident, pin = tid("doctor"), pins[tid("doctor")]
    maximum = real_setting("auth.staff_pin_max_attempts")
    for _ in range(maximum):
        assert pin_in(client, ident, wrong(pin)).status_code == 401
    assert len(audits(factory, "STAFF_PIN_LOCKED")) == 1
    locked = pin_in(client, ident, pin)               # the right PIN, but locked
    assert locked.status_code == 401
    assert client.get("/api/auth/session").json()["user"] is None
    assert len(audits(factory, "STAFF_PIN_SIGN_IN_WHILE_LOCKED")) == 1
    with factory() as db:
        T.unlock(db, T.team_account(db, "doctor"), "test")
    assert pin_in(client, ident, pin).status_code == 200


def test_lock_runs_out_after_the_lockout_minutes(team, monkeypatch):
    client, _factory, _codes, pins = team
    ident, pin = tid("clinic"), pins[tid("clinic")]
    for _ in range(real_setting("auth.staff_pin_max_attempts")):
        pin_in(client, ident, wrong(pin))
    later = time.time() + real_setting("auth.staff_pin_lockout_minutes") * 60 + 1
    monkeypatch.setattr(T.time, "time", lambda: later)
    assert pin_in(client, ident, pin).status_code == 200


def test_rate_limit_per_id_and_per_address(team, monkeypatch):
    client, _factory, _codes, pins = team
    overrides(monkeypatch, auth__staff_pin_id_max_attempts=3, auth__staff_pin_ip_max_attempts=5,
              auth__staff_pin_max_attempts=10)
    ident = tid("wellness")
    statuses = [pin_in(client, ident, wrong(pins[ident])).status_code for _ in range(4)]
    assert statuses == [401, 401, 401, 429]
    others = [pin_in(client, f"x{n}@example.test", "482915").status_code for n in range(3)]
    assert others[-1] == 429                           # the address has used its 5


def test_switch_off_refuses_and_says_so(team, monkeypatch):
    client, _factory, _codes, pins = team
    overrides(monkeypatch, auth__staff_pin_login_enabled=False)
    refused = pin_in(client, tid("campus"), pins[tid("campus")])
    assert refused.status_code == 403
    assert refused.json()["detail"]["code"] == T.STAFF_PIN_DISABLED
    assert client.get("/api/auth/session").json()["user"] is None


def test_the_switch_is_public_so_the_page_can_hide_the_option(harness):  # noqa: F811
    from core.settings_registry import get_declaration
    assert get_declaration("auth.staff_pin_login_enabled").public is True
    assert get_declaration("auth.staff_pin_login_enabled").default is True


def test_audit_rows_never_hold_a_pin_or_an_unknown_address(team):
    client, factory, _codes, pins = team
    typed = f"someone.{secrets.token_hex(3)}@example.test"
    pin_in(client, typed, "482915")
    pin_in(client, tid("campus"), wrong(pins[tid("campus")]))
    pin_in(client, tid("campus"), pins[tid("campus")])
    text = " ".join(f"{r.actor_id} {r.action} {r.resource_id}" for r in audits(factory))
    assert not any(pin in text for pin in pins.values())
    assert "482915" not in text and typed not in text
    assert {"STAFF_PIN_SIGN_IN_FAILED", "STAFF_PIN_SIGN_IN"} <= {r.action for r in audits(factory)}


def test_an_authenticator_is_still_asked_for(team):
    client, factory, _codes, pins = team
    with factory() as db:
        twofa_store.start_setup(db, "team-superadmin")
        twofa_store.get(db, "team-superadmin").enabled = True
        db.commit()
    signed = pin_in(client, tid("superadmin"), pins[tid("superadmin")])
    assert signed.status_code == 200
    assert signed.json()["requires2FA"] is True and signed.json()["user"] is None
    assert client.get("/api/auth/session").json()["user"] is None


# --- Super admin → Team accounts ------------------------------------------------

def super_admin(client, factory, codes):
    _id, email = seed(factory, role="SUPER_ADMIN")
    return login(client, codes, email)


def test_screen_lists_rotates_unlocks_and_disables(team):
    client, factory, codes, pins = team
    headers = super_admin(client, factory, codes)
    listed = client.get("/api/ops/team-accounts")
    assert listed.status_code == 200
    body = listed.json()
    assert body["pinSignInEnabled"] is True
    assert len(body["items"]) == len(T.TEAM_ACCOUNTS)
    assert all("pin" not in item and "pinHash" not in item for item in body["items"])

    rotated = client.post("/api/ops/team-accounts/team-lab/rotate", json={}, headers=headers)
    assert rotated.status_code == 200 and rotated.headers["cache-control"] == "no-store"
    new_pin = rotated.json()["pin"]
    assert new_pin != pins[tid("lab")] and not T.is_weak_pin(new_pin)
    assert new_pin not in client.get("/api/ops/team-accounts").text   # shown once, never listed

    for _ in range(real_setting("auth.staff_pin_max_attempts")):
        pin_in(client, tid("lab"), pins[tid("lab")])      # the old PIN no longer works
    row = next(i for i in client.get("/api/ops/team-accounts").json()["items"] if i["id"] == "team-lab")
    assert row["locked"] is True
    headers = super_admin(client, factory, codes)
    assert client.post("/api/ops/team-accounts/team-lab/unlock", headers=headers).json()["locked"] is False

    disabled = client.post("/api/ops/team-accounts/team-clinic/disable", headers=headers)
    assert disabled.status_code == 200 and disabled.json()["active"] is False
    assert {"TEAM_ACCOUNT_PIN_ROTATED", "TEAM_ACCOUNT_UNLOCKED", "TEAM_ACCOUNT_DISABLED"} <= {r.action for r in audits(factory)}
    assert client.post("/api/ops/team-accounts/acc_not_team/rotate", json={}, headers=headers).status_code == 404


def test_rotating_ends_the_accounts_other_sessions(team):
    client, factory, codes, pins = team
    assert pin_in(client, tid("pharmacy"), pins[tid("pharmacy")]).status_code == 200
    with factory() as db:
        assert db.scalars(select(M.Session).where(M.Session.account_id == "team-pharmacy")).all()
    headers = super_admin(client, factory, codes)
    assert client.post("/api/ops/team-accounts/team-pharmacy/rotate", json={}, headers=headers).status_code == 200
    with factory() as db:
        assert not db.scalars(select(M.Session).where(M.Session.account_id == "team-pharmacy")).all()


def test_only_a_super_admin_reaches_the_screen(team):
    client, _factory, _codes, pins = team
    signed = pin_in(client, tid("campus"), pins[tid("campus")])
    headers = {"X-CSRF-Token": signed.json()["csrfToken"]}
    assert client.get("/api/ops/team-accounts").status_code == 403
    assert client.post("/api/ops/team-accounts/team-lab/rotate", json={}, headers=headers).status_code == 403


def test_super_admin_needs_its_current_pin_to_rotate_its_own(team):
    client, factory, _codes, pins = team
    signed = pin_in(client, tid("superadmin"), pins[tid("superadmin")])
    headers = {"X-CSRF-Token": signed.json()["csrfToken"]}
    refused = client.post("/api/ops/team-accounts/team-superadmin/rotate", json={}, headers=headers)
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == T.ROTATE_SELF_REFUSED
    bad = client.post("/api/ops/team-accounts/team-superadmin/rotate", json={"currentPin": wrong(pins[tid("superadmin")])},
                      headers=headers)
    assert bad.status_code == 403
    ok = client.post("/api/ops/team-accounts/team-superadmin/rotate", json={"currentPin": pins[tid("superadmin")]},
                     headers=headers)
    assert ok.status_code == 200
    assert client.get("/api/auth/session").json()["user"]["id"] == "team-superadmin"   # this session is kept
    assert client.post("/api/ops/team-accounts/team-superadmin/disable", headers=headers).status_code == 409
    assert len(audits(factory, "TEAM_ACCOUNT_ROTATE_SELF_REFUSED")) == 2


# --- scoping --------------------------------------------------------------------

def test_sandbox_rule():
    assert team_sandboxed({"isTeamAccount": True, "role": "CAMPUS_ADMIN"})
    assert team_sandboxed({"isTeamAccount": True, "role": "VENDOR"})
    assert not team_sandboxed({"isTeamAccount": True, "role": "SUPER_ADMIN"})   # real by nature
    assert not team_sandboxed({"isTeamAccount": False, "role": "CAMPUS_ADMIN"})


def test_no_student_can_join_the_team_campus(harness):  # noqa: F811
    client, factory, codes = harness
    _sid, student = seed(factory, role="STUDENT")
    headers = login(client, codes, student)
    refused = client.post("/api/campus/verification", json={"university": "  studentkare   TEAM campus ", "rollNumber": "R1"},
                          headers=headers)
    assert refused.status_code == 422
    assert client.patch("/api/profile", json={"university": TEAM_CAMPUS}, headers=headers).status_code == 422


def test_team_campus_admin_and_counsellor_see_no_real_student(team):
    client, factory, _codes, pins = team
    sid, _student = seed(factory, role="STUDENT", profile={"university": "Real University"})
    with factory() as db:
        db.add(M.CampusVerification(account_id=sid, university="Real University", roll_number="R-1", status="PENDING"))
        db.add(M.OpsEvent(id="ev1", kind="CAMPUS_VERIFICATION_SUBMITTED", domain="CAMPUS", severity="ATTENTION",
                          summary="x", actor_id=sid, subject_id=sid, created_at=time.time()))
        db.commit()
    pin_in(client, tid("campus"), pins[tid("campus")])
    pending = client.get("/api/ops/campus/pending")
    assert pending.status_code == 200 and pending.json()["items"] == []
    assert client.get("/api/ops/feed/counts").json()["domains"] == {}
    pin_in(client, tid("counsellor"), pins[tid("counsellor")])
    crisis = client.get("/api/ops/crisis-events")
    assert crisis.status_code == 200 and str(sid) not in crisis.text
    # The team campus is never offered to students.
    names = [item["name"] for item in client.get("/api/campus/partners").json()["items"]]
    assert TEAM_CAMPUS not in names


def visit(factory, service, student_id):
    with factory() as db:
        db.add(M.HostelVisitRequest(id=f"v_{secrets.token_hex(4)}", account_id=student_id, service=service,
                                    hostel_block="B", room="12", window_start=time.time() + 3600,
                                    window_end=time.time() + 7200, status="REQUESTED", created_at=time.time()))
        db.commit()


def test_team_partners_never_see_the_open_queue_and_wellness_works_like_a_clinic(team):
    client, factory, codes, pins = team
    sid, _student = seed(factory, role="STUDENT")
    visit(factory, "NURSE_VISIT", sid)
    visit(factory, "LAB_PICKUP", sid)
    for local in ("clinic", "wellness", "lab", "doctor"):
        pin_in(client, tid(local), pins[tid(local)])
        assert client.get("/api/work/hostel-visits").json()["items"] == [], local
    _wid, wellness = seed(factory, role="VENDOR", kind="WELLNESS")
    login(client, codes, wellness)
    seen = client.get("/api/work/hostel-visits").json()["items"]
    assert [v["service"] for v in seen] == ["NURSE_VISIT"]


def test_nobody_shares_a_record_with_or_assigns_a_report_to_the_team_doctor(team):
    client, factory, codes, _pins = team
    _sid, student = seed(factory, role="STUDENT")
    headers = login(client, codes, student)
    with factory() as db:
        db.add(M.Document(id="doc1", account_id=db.scalar(select(M.Account.id).where(M.Account.identifier == student)),
                          title="Report", category="LAB", filename="r.pdf", mime_type="application/pdf", content=b"%PDF",
                          created_at=time.time()))
        db.commit()
    shared = client.post("/api/records/shares", json={"documentId": "doc1", "clinicianEmail": tid("doctor")}, headers=headers)
    assert shared.status_code == 404
    admin = super_admin(client, factory, codes)
    body = {"kind": "PHARMACY", "legalName": "Team pharmacy", "pincode": "500090"}
    provider = client.post("/api/ops/service-providers", headers=admin, json={**body, "accountId": "team-pharmacy"})
    assert provider.status_code == 422 and "team account" in provider.text
    real_id, _real = seed(factory, role="VENDOR", kind="WELLNESS")
    listed = client.post("/api/ops/service-providers", headers=admin, json={**body, "kind": "WELLNESS", "accountId": real_id})
    assert listed.status_code == 201, listed.text


def test_wellness_is_a_provider_kind():
    from services.clinical_api import PROVIDER_KINDS
    from services.workflow_auth import PARTNER_KINDS
    assert "WELLNESS" in PROVIDER_KINDS and "WELLNESS" in PARTNER_KINDS
