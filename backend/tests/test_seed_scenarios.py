"""Staging seed (scripts/seed_scenarios.py): refuses unsafe places, fills every scenario, removes only its own rows."""
import time

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core import workflow_models as M
from scripts import seed_scenarios as S
from services.db_sql import Base
from services.team_accounts import verify_pin


@pytest.fixture
def db(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    monkeypatch.setenv("APP_ENV", "testing")
    monkeypatch.setenv("SEED_SCENARIOS", "true")
    with sessionmaker(bind=engine, expire_on_commit=False)() as session:
        yield session


def real_student(db, n=0):
    db.add(M.Account(id=f"real-{n}", identifier=f"real{n}@example.test", channel="EMAIL", full_name="Real", role="STUDENT",
                     active=True, profile={}, created_at=time.time()))


def test_refuses_production_staging_and_no_opt_in(db, monkeypatch):
    for env in ("production", "staging", ""):
        monkeypatch.setenv("APP_ENV", env)
        with pytest.raises(S.Refused):
            S.check_allowed(db, False)
    monkeypatch.setenv("APP_ENV", "testing")
    monkeypatch.setenv("SEED_SCENARIOS", "false")
    with pytest.raises(S.Refused):
        S.check_allowed(db, False)


def test_refuses_a_database_with_real_students(db):
    for n in range(S.REAL_STUDENT_LIMIT + 1):
        real_student(db, n)
    db.commit()
    with pytest.raises(S.Refused):
        S.check_allowed(db, False)
    S.check_allowed(db, True)     # only when told, deliberately


def test_refuses_while_whatsapp_can_deliver(db, monkeypatch):
    from services import otp_delivery
    monkeypatch.setattr(otp_delivery, "_openwa_configured", lambda ow=None: True)
    with pytest.raises(S.Refused):
        S.check_allowed(db, False)


def test_the_command_needs_yes(monkeypatch):
    with pytest.raises(SystemExit) as stopped:
        S.main(["seed"])
    assert stopped.value.code == 2


def test_seeds_every_scenario_and_purges_only_its_own(db):
    real_student(db)
    db.commit()
    world = S.seed(db, scale=0.01, random_seed=7)
    assert sum(world.counts.values()) > 1500
    scenarios = {row.profile.get("seedScenario") for row in db.scalars(select(M.Account).where(M.Account.role == "STUDENT")) if row.profile}
    assert {"B2C", "B2B_CLAIMED", "B2B_PENDING", "B2B_EXPIRED"} <= scenarios
    roles = set(db.scalars(select(M.Account.role).where(M.Account.id.startswith(S.PREFIX))))
    assert roles == {"STUDENT", "CAMPUS_ADMIN", "COUNSELLOR", "NMC_DOCTOR", "VENDOR"}
    for model in (M.Reading, M.Order, M.OrderLine, M.Payment, M.LabOrder, M.LabResult, M.Appointment, M.MedicationDose,
                  M.CrisisEvent, M.SosAlert, M.StudentInvite, M.ConsentRecord, M.AccountPassword):
        assert db.scalar(select(func.count()).select_from(model)) > 0, model.__tablename__
    # Every email is on the reserved test domain, and the one test password works.
    assert all(row.identifier.endswith((f"@{S.EMAIL_DOMAIN}", f"@{S.NAMED_DOMAIN}")) for row in db.scalars(select(M.Account).where(M.Account.id.startswith(S.PREFIX))))
    stored = db.scalar(select(M.AccountPassword.password_hash).limit(1))
    assert verify_pin(S.SEED_PASSWORD, stored)
    # A pending invite has no verified contact and no password: nothing can sign in to it.
    pending = db.scalars(select(M.Account).where(M.Account.id.startswith(S.PREFIX))).all()
    for account in (a for a in pending if (a.profile or {}).get("invitePending")):
        assert db.get(M.AccountPassword, account.id) is None
        assert all(not c.verified_at for c in db.scalars(select(M.AccountContact).where(M.AccountContact.account_id == account.id)))

    before = S.count(db)
    removed = S.purge(db)
    db.commit()
    assert removed["care_accounts"] == before["care_accounts"]
    assert S.count(db) == {}                                                            # nothing seeded is left
    assert db.get(M.Account, "real-0") is not None                                     # the real one stays


def test_ten_named_accounts_per_role(db, monkeypatch):
    S.seed(db, scale=0.01, random_seed=7)
    for label, role, kind in S.NAMED_ROLES:
        for i in (1, S.NAMED_PER_ROLE):
            account = db.scalar(select(M.Account).where(M.Account.identifier == f"{label}{i:02d}@{S.NAMED_DOMAIN}"))
            assert account is not None and account.role == role and (account.partner_kind or "") == kind
            assert account.id.startswith(S.PREFIX)
    student = db.scalar(select(M.Account).where(M.Account.identifier == f"student01@{S.NAMED_DOMAIN}"))
    assert verify_pin(S.SEED_PASSWORD, db.get(M.AccountPassword, student.id).password_hash)
    assert verify_pin(S.SEED_PIN, db.get(M.StudentPasscode, student.id).passcode_hash)
    # On staging with the demo switches on, the named accounts take the fixed code.
    from services import demo_seed
    monkeypatch.setenv("SEED_DEMO_DATA", "true")
    assert demo_seed.is_demo_identifier(f"doctor03@{S.NAMED_DOMAIN}")
    monkeypatch.setenv("APP_ENV", "production")
    assert not demo_seed.is_demo_identifier(f"doctor03@{S.NAMED_DOMAIN}")
    S.purge(db)
    db.commit()
    assert db.scalar(select(M.Account).where(M.Account.identifier == f"student01@{S.NAMED_DOMAIN}")) is None
