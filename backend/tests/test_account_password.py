"""Passwords for team accounts (plan tier1-auth-password-2026-10-22).

Covers the strength rules, the hash (never the password), sign-in with the role,
one answer for every failure, the lockout and unlock, the rate limits, the master
switch, students refused, the authenticator still asked for, the audit trail, the
Super admin screen's Set password (and needing your own current PIN or password),
signing other sessions out, and the set-password command.
"""
import pytest
from sqlalchemy import select
from test_team_accounts import audits, seed, super_admin, team, tid  # noqa: F401 — pytest fixture
from test_workflow_api import harness  # noqa: F401 — pytest fixture

from core import workflow_models as M
from core.settings_registry import setting as real_setting
from services import account_password as P
from services import team_accounts as T
from services import twofa_store

GOOD = "Tamarind-river 42"
OTHER = "Monsoon kettle 7!"


def overrides(monkeypatch, **values):
    """Override settings the password module reads, by their key with dots as __."""
    wanted = {key.replace("__", "."): value for key, value in values.items()}
    monkeypatch.setattr(P, "setting", lambda key, db=None: wanted[key] if key in wanted else real_setting(key, db))


def give(factory, local: str, password: str = GOOD) -> None:
    with factory() as db:
        P.set_password(db, T.team_account(db, local), password, "test")


def password_in(client, identifier, password):
    return client.post("/api/auth/staff-password/sign-in", json={"identifier": identifier, "password": password})


# --- the password itself ----------------------------------------------------------

@pytest.mark.parametrize(("password", "code"), [
    ("short1!", "LENGTH"),
    ("x" * (P.MAX_PASSWORD_LENGTH + 1), "LENGTH"),
    (" leading space", "CHARACTERS"),
    ("trailing space ", "CHARACTERS"),
    ("tab\tinside1", "CHARACTERS"),
    ("MyPassword2026", "WEAK"),
    ("qwertyuiop", "WEAK"),
    ("abcdefghijk", "WEAK"),
    ("abababababab", "WEAK"),
    ("aaaaaaaaaab", "WEAK"),
    ("sunshine2026!", "WEAK"),
])
def test_weak_or_malformed_passwords_are_refused(password, code):
    with pytest.raises(P.PasswordRefused) as refused:
        P.check_password(password, real_setting("auth.password_min_length"))
    assert refused.value.code == code


def test_a_password_naming_the_account_is_refused(harness):  # noqa: F811
    _client, factory, _codes = harness
    with factory() as db:
        T.create_missing(db)
        account = T.team_account(db, "campus")
        with pytest.raises(P.PasswordRefused) as refused:
            P.check_password("Campus-river 42", real_setting("auth.password_min_length"), account)
    assert refused.value.reason == "PERSONAL"


def test_good_passwords_pass():
    for password in (GOOD, OTHER, "correct horse battery staple"):
        P.check_password(password, real_setting("auth.password_min_length"))


def test_only_a_salted_hash_is_stored(team):
    _client, factory, _codes, _pins = team
    give(factory, "lab")
    with factory() as db:
        stored = db.get(M.AccountPassword, "team-lab").password_hash
    assert GOOD not in stored and stored.startswith("scrypt$")
    assert T.verify_pin(GOOD, stored) and not T.verify_pin(OTHER, stored)


# --- sign-in ----------------------------------------------------------------------

def test_password_signs_in_with_the_role_and_audits_it(team):
    client, factory, _codes, _pins = team
    give(factory, "pharmacy")
    signed = password_in(client, tid("pharmacy").upper(), GOOD)
    assert signed.status_code == 200, signed.text
    user = signed.json()["user"]
    assert user["role"] == "VENDOR" and user["partnerKind"] == "PHARMACY" and user["isTeamAccount"] is True
    assert client.get("/api/auth/session").json()["user"]["id"] == "team-pharmacy"
    assert len(audits(factory, "PASSWORD_SIGN_IN")) == 1
    with factory() as db:
        assert db.get(M.AccountPassword, "team-pharmacy").last_sign_in_at > 0


def test_the_pin_still_works_beside_the_password(team):
    client, factory, _codes, pins = team
    give(factory, "clinic")
    assert client.post("/api/auth/staff-pin/sign-in",
                       json={"identifier": tid("clinic"), "pin": pins[tid("clinic")]}).status_code == 200


def test_every_failure_gets_the_same_answer(team):
    client, factory, _codes, _pins = team
    _sid, student = seed(factory, role="STUDENT")
    give(factory, "clinic")
    give(factory, "lab")
    with factory() as db:
        T.disable(db, T.team_account(db, "lab"), "test")
    answers = [
        password_in(client, "nobody@example.test", GOOD),
        password_in(client, student, GOOD),
        password_in(client, tid("clinic"), OTHER),            # wrong
        password_in(client, tid("doctor"), GOOD),             # no password set
        password_in(client, tid("lab"), GOOD),                # disabled
    ]
    assert {a.status_code for a in answers} == {401}
    assert len({str(a.json()) for a in answers}) == 1


def test_students_never_sign_in_with_a_password(team):
    client, factory, _codes, _pins = team
    student_id, student = seed(factory, role="STUDENT")
    with factory() as db:
        db.add(M.AccountPassword(account_id=student_id, password_hash=T.hash_pin(GOOD), created_at=0.0))
        db.commit()
    assert password_in(client, student, GOOD).status_code == 401
    assert client.get("/api/auth/session").json()["user"] is None


def test_lockout_after_max_attempts_then_unlock(team):
    client, factory, _codes, _pins = team
    give(factory, "campus")
    for _ in range(real_setting("auth.password_max_attempts")):
        assert password_in(client, tid("campus"), OTHER).status_code == 401
    assert password_in(client, tid("campus"), GOOD).status_code == 401     # locked, even with the right one
    assert len(audits(factory, "PASSWORD_LOCKED")) == 1
    with factory() as db:
        T.unlock(db, T.team_account(db, "campus"), "test")
    assert password_in(client, tid("campus"), GOOD).status_code == 200


def test_rate_limit_per_id(team, monkeypatch):
    client, factory, _codes, _pins = team
    give(factory, "doctor")
    overrides(monkeypatch, auth__password_id_max_attempts=2, auth__password_max_attempts=10)
    password_in(client, tid("doctor"), OTHER)
    password_in(client, tid("doctor"), OTHER)
    assert password_in(client, tid("doctor"), GOOD).status_code == 429


def test_switch_off_refuses_and_says_so(team, monkeypatch):
    client, factory, _codes, _pins = team
    give(factory, "doctor")
    overrides(monkeypatch, auth__password_login_enabled=False)
    refused = password_in(client, tid("doctor"), GOOD)
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == P.PASSWORD_DISABLED


def test_an_unreadable_switch_is_off(team, monkeypatch):
    _client, factory, _codes, _pins = team

    def broken(key, db=None):
        raise RuntimeError("settings store down")
    monkeypatch.setattr(P, "setting", broken)
    with factory() as db:
        assert P.password_login_enabled(db) is False


def test_the_switch_and_minimum_are_public():
    from core.settings_registry import get_declaration
    assert get_declaration("auth.password_login_enabled").public is True
    assert get_declaration("auth.password_login_enabled").default is True
    assert get_declaration("auth.password_min_length").public is True


def test_an_authenticator_is_still_asked_for(team):
    client, factory, _codes, _pins = team
    give(factory, "superadmin", OTHER)
    with factory() as db:
        twofa_store.start_setup(db, "team-superadmin")
        twofa_store.get(db, "team-superadmin").enabled = True
        db.commit()
    signed = password_in(client, tid("superadmin"), OTHER)
    assert signed.status_code == 200
    assert signed.json()["requires2FA"] is True and signed.json()["user"] is None
    assert client.get("/api/auth/session").json()["user"] is None


def test_audit_rows_never_hold_a_password_or_an_unknown_address(team):
    client, factory, _codes, _pins = team
    give(factory, "lab")
    password_in(client, "someone.real@example.test", GOOD)
    password_in(client, tid("lab"), OTHER)
    text = " ".join(f"{r.actor_id} {r.action} {r.resource_id}" for r in audits(factory))
    assert GOOD not in text and OTHER not in text and "someone.real" not in text


# --- Super admin → Team accounts → Set password -------------------------------------

def test_super_admin_sets_a_password_and_it_is_never_sent_back(team):
    client, factory, codes, _pins = team
    headers = super_admin(client, factory, codes)
    weak = client.post("/api/ops/team-accounts/team-lab/password", json={"password": "password123"}, headers=headers)
    assert weak.status_code == 422 and weak.json()["detail"]["code"] == "PASSWORD_WEAK"
    done = client.post("/api/ops/team-accounts/team-lab/password", json={"password": GOOD}, headers=headers)
    assert done.status_code == 200 and done.headers["cache-control"] == "no-store"
    assert done.json()["hasPassword"] is True and GOOD not in done.text
    listed = client.get("/api/ops/team-accounts")
    assert listed.json()["passwordSignInEnabled"] is True and GOOD not in listed.text
    assert {"PASSWORD_SET"} <= {r.action for r in audits(factory)}
    assert client.post("/api/ops/team-accounts/acc_not_team/password", json={"password": GOOD},
                       headers=headers).status_code == 404


def test_setting_a_password_ends_the_accounts_other_sessions(team):
    client, factory, codes, pins = team
    assert client.post("/api/auth/staff-pin/sign-in",
                       json={"identifier": tid("pharmacy"), "pin": pins[tid("pharmacy")]}).status_code == 200
    headers = super_admin(client, factory, codes)
    assert client.post("/api/ops/team-accounts/team-pharmacy/password", json={"password": GOOD},
                       headers=headers).status_code == 200
    with factory() as db:
        assert not db.scalars(select(M.Session).where(M.Session.account_id == "team-pharmacy")).all()


def test_only_a_super_admin_sets_passwords(team):
    client, _factory, _codes, pins = team
    signed = client.post("/api/auth/staff-pin/sign-in", json={"identifier": tid("campus"), "pin": pins[tid("campus")]})
    headers = {"X-CSRF-Token": signed.json()["csrfToken"]}
    assert client.post("/api/ops/team-accounts/team-lab/password", json={"password": GOOD},
                       headers=headers).status_code == 403


def test_super_admin_needs_its_current_pin_or_password_to_set_its_own(team):
    client, factory, _codes, pins = team
    signed = client.post("/api/auth/staff-pin/sign-in",
                         json={"identifier": tid("superadmin"), "pin": pins[tid("superadmin")]})
    headers = {"X-CSRF-Token": signed.json()["csrfToken"]}
    url = "/api/ops/team-accounts/team-superadmin/password"
    refused = client.post(url, json={"password": GOOD}, headers=headers)
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == P.SET_SELF_REFUSED
    assert client.post(url, json={"password": GOOD, "currentPassword": OTHER}, headers=headers).status_code == 403
    ok = client.post(url, json={"password": GOOD, "currentPin": pins[tid("superadmin")]}, headers=headers)
    assert ok.status_code == 200
    assert client.get("/api/auth/session").json()["user"]["id"] == "team-superadmin"   # this session is kept
    assert client.post(url, json={"password": OTHER, "currentPassword": GOOD}, headers=headers).status_code == 200
    assert len(audits(factory, "PASSWORD_SET_SELF_REFUSED")) == 2


def test_unlock_from_the_screen_clears_a_password_lock(team):
    client, factory, codes, _pins = team
    give(factory, "lab")
    for _ in range(real_setting("auth.password_max_attempts")):
        password_in(client, tid("lab"), OTHER)
    headers = super_admin(client, factory, codes)
    row = next(i for i in client.get("/api/ops/team-accounts").json()["items"] if i["id"] == "team-lab")
    assert row["passwordLocked"] is True
    assert client.post("/api/ops/team-accounts/team-lab/unlock", headers=headers).json()["passwordLocked"] is False


# --- the command ------------------------------------------------------------------

def test_command_line_set_password(team, capsys, monkeypatch):
    client, factory, _codes, _pins = team
    from scripts import team_accounts as cli
    monkeypatch.setattr(cli, "SessionLocal", factory)
    monkeypatch.setattr(cli, "create_all_tables", lambda: None)
    answers = iter([GOOD, "not the same"])
    monkeypatch.setattr(cli.getpass, "getpass", lambda prompt="": next(answers))
    assert cli.main(["set-password", "superadmin"]) == 1          # the two don't match
    answers = iter(["password1234", "password1234"])
    assert cli.main(["set-password", "superadmin"]) == 1          # too weak
    answers = iter([GOOD, GOOD])
    assert cli.main(["set-password", "superadmin"]) == 0
    assert cli.main(["set-password", "nobody"]) == 1
    assert cli.main(["list"]) == 0
    out = capsys.readouterr()
    assert GOOD not in out.out + out.err
    assert password_in(client, tid("superadmin"), GOOD).status_code == 200
