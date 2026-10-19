"""Rule L commerce firewall at the database (AGENTS.md guardrail 4; P9, P23).

The first half runs everywhere: every table is classified, the matrix keeps
commerce and clinical apart, and the commerce endpoints actually use the
commerce session. The second half needs a live Postgres (the CI job sets
REQUIRE_POSTGRES=1) and proves the denial at the database: a fresh database is
migrated to head, then sk_commerce is refused every clinical table while the
marketplace still works end to end under that role.
"""
import glob
import os
import re
import subprocess
import sys
import time
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from postgres_support import postgres_required, psycopg_url
from sqlalchemy import create_engine, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from core import (  # noqa: F401
    billing_models,
    models_sql,
    preventive_models,
    rule_l,
    workflow_models,
)
from core import workflow_models as M
from services.db_sql import Base

BACKEND = Path(__file__).resolve().parents[1]


# --- classification: runs on SQLite and everywhere -------------------------


def migration_tables() -> set[str]:
    text_ = "\n".join(Path(p).read_text() for p in glob.glob(str(BACKEND / "alembic" / "versions" / "*.py")))
    made = set(re.findall(r"op\.create_table\(\s*[\"']([^\"']+)", text_))
    made |= set(re.findall(r"CREATE TABLE(?: IF NOT EXISTS)?\s+([a-z_]+)", text_, re.I))
    return made


def test_every_model_table_is_classified():
    missing = sorted(set(Base.metadata.tables) - set(rule_l.TABLE_PLANES))
    assert missing == [], f"classify these tables in core/rule_l.py TABLE_PLANES: {missing}"


def test_every_migration_table_is_classified():
    missing = sorted(migration_tables() - set(rule_l.TABLE_PLANES))
    assert missing == [], f"classify these tables in core/rule_l.py TABLE_PLANES: {missing}"


def test_no_stale_classification():
    known = set(Base.metadata.tables) | migration_tables() | {"alembic_version"}
    assert sorted(set(rule_l.TABLE_PLANES) - known) == []


def test_every_plane_is_valid():
    assert set(rule_l.TABLE_PLANES.values()) <= rule_l.PLANES


@pytest.mark.parametrize("table", ["care_readings", "care_documents", "care_lab_orders", "care_prescriptions",
                                   "care_prescription_items", "care_dispenses", "care_encounter_notes",
                                   "care_consent_records", "care_crisis_events", "care_medication_plans",
                                   "care_appointments", "care_record_shares"])
def test_core_clinical_tables_are_clinical(table):
    assert rule_l.TABLE_PLANES[table] == rule_l.CLINICAL


@pytest.mark.parametrize("table", ["care_catalog", "care_orders", "care_order_lines", "care_payments",
                                   "care_billing_subscriptions", "care_billing_receipts"])
def test_core_commerce_tables_are_commerce(table):
    assert rule_l.TABLE_PLANES[table] == rule_l.COMMERCE


def test_commerce_role_has_nothing_clinical():
    granted = set(rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE])
    assert granted & set(rule_l.tables_in(rule_l.CLINICAL)) == set()


def test_commerce_reads_only_three_account_columns():
    grant = rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]["care_accounts"]
    assert grant.privileges == ("SELECT",)
    assert set(grant.columns) == {"id", "role", "active"}


def test_commerce_extras_outside_commerce_are_an_explicit_allowlist():
    extras = {t for t in rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE] if rule_l.TABLE_PLANES[t] != rule_l.COMMERCE}
    assert extras == {"care_accounts", "care_workflow_audit", "care_ops_events"}
    for table in ("care_workflow_audit", "care_ops_events"):
        assert rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE][table].privileges == ("INSERT",)


def test_clinical_role_has_nothing_commercial():
    granted = set(rule_l.GRANT_MATRIX[rule_l.CLINICAL_ROLE])
    assert granted & set(rule_l.tables_in(rule_l.COMMERCE)) == set()


def test_grant_statements_reset_before_granting():
    sql = rule_l.grant_statements({"care_catalog", "care_readings", "care_accounts"})
    first_grant = next(i for i, s in enumerate(sql) if s.startswith("GRANT SELECT") or s.startswith("GRANT INSERT"))
    assert all(not s.startswith("REVOKE") for s in sql[first_grant:])
    assert 'REVOKE ALL ON TABLE public."care_readings" FROM PUBLIC' in sql
    assert not any("care_readings" in s and "sk_commerce" in s and s.startswith("GRANT") for s in sql)
    assert 'GRANT SELECT ("id", "role", "active") ON TABLE public."care_accounts" TO "sk_commerce"' in sql
    # Tables that do not exist yet are skipped, so an early migration cannot fail on them.
    assert not any("care_orders" in s for s in sql)


def test_commerce_endpoints_use_the_commerce_session():
    from services.commerce_session import commerce_db
    from services.workflow_api import RULE_L_COMMERCE_PATHS, router

    def deps(dependant):
        for dep in dependant.dependencies:
            yield dep.call
            yield from deps(dep)

    routes = {}
    for route in router.routes:
        for method in getattr(route, "methods", ()) or ():
            routes[f"{method} {route.path}"] = route
    for key in RULE_L_COMMERCE_PATHS:
        assert key in routes, f"no route {key}"
        assert commerce_db in set(deps(routes[key].dependant)), f"{key} does not use commerce_db"
    # And nothing on the router uses it without being listed.
    users = {k for k, r in routes.items() if commerce_db in set(deps(r.dependant))}
    assert users == set(RULE_L_COMMERCE_PATHS)


def test_sqlite_status_is_honest():
    engine = create_engine("sqlite://")
    with engine.connect() as conn:
        status = rule_l.rule_l_status(conn)
        assert rule_l.apply_grants(conn).applied is False
    assert status["enforced"] is False
    assert status["reasons"]


def test_admin_status_endpoint_reports_not_enforced_on_sqlite(super_admin_client):
    client, headers = super_admin_client
    body = client.get("/api/ops/rule-l", headers=headers).json()
    assert body["enforced"] is False
    assert body["database"] == "sqlite"
    assert body["commercePaths"]["runAs"].startswith("app role")


def test_status_endpoint_is_super_admin_only():
    from app.main import app
    assert TestClient(app).get("/api/ops/rule-l").status_code in (401, 403)


def test_fail_closed_mode_refuses_commerce_without_grants(monkeypatch):
    from fastapi import HTTPException

    from services import commerce_session

    monkeypatch.setenv("RULE_L_REQUIRE_GRANTS", "1")
    engine = create_engine("sqlite://")
    with sessionmaker(bind=engine)() as db:
        gen = commerce_session.commerce_db(db)
        with pytest.raises(HTTPException) as denied:
            next(gen)
    assert denied.value.status_code == 503


def test_billing_and_returns_use_the_commerce_session():
    from services import billing, student_requests
    from services.commerce_session import commerce_db

    def uses(route):
        return commerce_db in {d.call for d in route.dependant.dependencies}

    billing_routes = {f"{m} {r.path}": r for r in billing.router.routes for m in r.methods}
    for key, route in billing_routes.items():
        if key == "GET /api/billing/plans":
            continue   # static plan list, no database
        assert uses(route), f"{key} does not use commerce_db"
    request_routes = {f"{m} {r.path}": r for r in student_requests.router.routes for m in r.methods}
    commerce = {k for k, r in request_routes.items() if uses(r)}
    assert {k for k in request_routes if "/returns" in k} | {"GET /api/refills/pharmacies"} == commerce
    # Refills and hostel visits are clinical: they stay on the normal session.
    assert not any("/refills" in k and k != "GET /api/refills/pharmacies" for k in commerce)
    assert not any("hostel-visits" in k or "my-requests" in k for k in commerce)


def _sqlite_session():
    from sqlalchemy.pool import StaticPool
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)()


def test_alert_is_raised_once_in_production_when_not_enforced(monkeypatch):
    from services.commerce_session import RULE_L_ALERT_KIND, rule_l_alert

    monkeypatch.setenv("APP_ENV", "production")
    db = _sqlite_session()
    first = rule_l_alert(db)
    assert first["enforced"] is False and first["alerted"] is True
    events = db.scalars(select(M.OpsEvent).where(M.OpsEvent.kind == RULE_L_ALERT_KIND)).all()
    assert len(events) == 1 and events[0].severity == "CRITICAL"
    assert "NOT enforced" in events[0].summary and "sqlite" in events[0].summary
    assert rule_l_alert(db)["alerted"] is False          # still open: not repeated
    events[0].acknowledged_at = time.time()
    db.commit()
    assert rule_l_alert(db)["alerted"] is True           # acknowledged: re-armed


def test_no_alert_outside_production(monkeypatch):
    from services.commerce_session import RULE_L_ALERT_KIND, rule_l_alert

    monkeypatch.setenv("APP_ENV", "testing")
    db = _sqlite_session()
    assert rule_l_alert(db)["alerted"] is False
    assert db.scalar(select(M.OpsEvent).where(M.OpsEvent.kind == RULE_L_ALERT_KIND)) is None


def test_integration_health_reports_the_firewall(monkeypatch):
    from services.workflow_scheduler import integration_health_check

    monkeypatch.setenv("APP_ENV", "production")
    db = _sqlite_session()
    checks = {c["name"]: c for c in integration_health_check(db)["summary"]["checks"]}
    assert checks["rule_l_firewall"]["status"] == "degraded"
    assert checks["rule_l_firewall"]["detail"].startswith("NOT enforced")
    assert db.scalar(select(M.OpsEvent).where(M.OpsEvent.kind == "RULE_L_NOT_ENFORCED", M.OpsEvent.severity == "CRITICAL"))


PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32


def test_catalog_images_live_in_the_commerce_table(super_admin_client, monkeypatch):
    from app.main import app
    from services import workflow_api
    from services.workflow_auth import workflow_db

    monkeypatch.setattr(workflow_api, "scan_file_for_viruses", lambda content: None)
    client, headers = super_admin_client
    db = next(app.dependency_overrides[workflow_db]())
    db.add(M.Account(id="vendor", identifier="v@example.test", channel="EMAIL", full_name="V", role="VENDOR",
                     active=True, profile={}, created_at=time.time()))
    db.add(M.CatalogEntry(id="item", provider_id="vendor", kind="product", name="Mask", brand="B", category="devices",
                          description="d", pack="1", price_paise=100, stock=1, active=True))
    db.commit()
    up = client.post("/api/ops/catalog/item/image", headers=headers, files={"file": ("p.png", PNG, "image/png")})
    assert up.status_code == 200, up.text
    assert db.scalar(select(M.Document)) is None                       # nothing in the clinical table
    first = db.scalar(select(M.CatalogImage))
    assert first.item_id == "item" and first.content == PNG
    got = client.get("/api/catalog/item/image")
    assert got.status_code == 200 and got.content == PNG
    again = client.post("/api/ops/catalog/item/image", headers=headers, files={"file": ("q.png", PNG + b"1", "image/png")})
    assert again.status_code == 200
    db.expire_all()
    assert len(db.scalars(select(M.CatalogImage)).all()) == 1         # replaced, not accumulated
    assert client.delete("/api/ops/catalog/item/image", headers=headers).status_code == 200
    db.expire_all()
    assert db.scalar(select(M.CatalogImage)) is None
    assert client.get("/api/catalog/item/image").status_code == 404


# --- Postgres: the denial happens at the database ---------------------------


def _admin_url() -> str | None:
    for name in ("DATABASE_URL", "TEST_DATABASE_URL"):
        url = os.environ.get(name, "")
        if url.startswith("postgresql"):
            return url
    return None


def _reachable(url: str | None) -> bool:
    if not url:
        return False
    try:
        engine = create_engine(psycopg_url(url), connect_args={"connect_timeout": 5}, poolclass=NullPool)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine.dispose()
        return True
    except Exception:
        return False


@pytest.fixture(scope="module")
def pg_db():
    """A fresh database migrated to head through the real runner."""
    url = _admin_url()
    if not _reachable(url):
        if postgres_required():
            pytest.fail("REQUIRE_POSTGRES=1 but no reachable Postgres in DATABASE_URL/TEST_DATABASE_URL")
        pytest.skip("needs a live Postgres")
    admin = create_engine(psycopg_url(url), isolation_level="AUTOCOMMIT", poolclass=NullPool)
    name = f"rule_l_{uuid.uuid4().hex[:10]}"
    with admin.connect() as conn:
        conn.execute(text(f'CREATE DATABASE "{name}"'))
    db_url = psycopg_url(url).set(database=name)
    raw = db_url.render_as_string(hide_password=False).replace("postgresql+psycopg://", "postgresql://", 1)
    env = {**os.environ, "PYTHONPATH": str(BACKEND), "DATABASE_URL": raw}
    result = subprocess.run(  # noqa: S603 — literal script, no external input
        [sys.executable, "-c", "from services.migrations import run_migrations; print(run_migrations())"],
        cwd=BACKEND, env=env, capture_output=True, text=True, timeout=300, check=False)
    assert result.returncode == 0, result.stderr
    engine = create_engine(db_url, poolclass=NullPool)
    try:
        yield engine, admin, db_url, raw
    finally:
        engine.dispose()
        with admin.connect() as conn:
            conn.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))
        admin.dispose()


def _denied(conn, sql: str) -> bool:
    nested = conn.begin_nested()
    try:
        conn.execute(text(sql))
    except DBAPIError as exc:
        nested.rollback()
        return "permission denied" in str(exc.orig).lower()
    nested.rollback()
    return False


def test_pg_status_is_enforced_after_migration(pg_db):
    engine, *_ = pg_db
    with engine.connect() as conn:
        status = rule_l.rule_l_status(conn)
    assert status["enforced"] is True, status["reasons"]
    assert status["checks"]["commerceLeaks"] == []


def test_pg_commerce_role_cannot_read_any_clinical_table(pg_db):
    engine, *_ = pg_db
    with engine.begin() as conn:
        conn.exec_driver_sql("SET LOCAL ROLE sk_commerce")
        refused = [t for t in rule_l.tables_in(rule_l.CLINICAL) if _denied(conn, f'SELECT 1 FROM "{t}" LIMIT 1')]  # noqa: S608 — names come from TABLE_PLANES, not input
        assert refused == rule_l.tables_in(rule_l.CLINICAL)
        assert _denied(conn, "SELECT profile FROM care_accounts LIMIT 1")
        assert _denied(conn, "SELECT identifier FROM care_accounts LIMIT 1")
        assert _denied(conn, "SELECT * FROM care_sessions LIMIT 1")
        assert _denied(conn, "SELECT * FROM care_system_settings LIMIT 1")
        assert _denied(conn, "SELECT * FROM care_workflow_audit LIMIT 1")


def test_pg_commerce_role_can_read_the_catalogue(pg_db):
    engine, *_ = pg_db
    with engine.begin() as conn:
        conn.exec_driver_sql("SET LOCAL ROLE sk_commerce")
        for table in rule_l.tables_in(rule_l.COMMERCE):
            conn.execute(text(f'SELECT count(*) FROM "{table}"'))  # noqa: S608 — names come from TABLE_PLANES, not input
        conn.execute(text("SELECT id, role, active FROM care_accounts LIMIT 1"))


def test_pg_clinical_role_cannot_read_commerce(pg_db):
    engine, *_ = pg_db
    with engine.begin() as conn:
        conn.exec_driver_sql("SET LOCAL ROLE sk_clinical")
        assert _denied(conn, "SELECT 1 FROM care_orders LIMIT 1")
        assert _denied(conn, "SELECT 1 FROM care_payments LIMIT 1")
        conn.execute(text("SELECT 1 FROM care_readings LIMIT 1"))


def _grant_snapshot(conn):
    return sorted(conn.execute(text(
        "SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants "
        "WHERE grantee IN ('sk_commerce', 'sk_clinical') UNION ALL "
        "SELECT grantee, table_name || '.' || column_name, privilege_type FROM information_schema.column_privileges "
        "WHERE grantee IN ('sk_commerce', 'sk_clinical')")).all())


def test_pg_apply_grants_is_idempotent(pg_db):
    engine, *_ = pg_db
    with engine.begin() as conn:
        before = _grant_snapshot(conn)
        assert rule_l.apply_grants(conn).applied
        assert rule_l.apply_grants(conn).applied
        assert _grant_snapshot(conn) == before


def _alembic(raw: str, verb: str, target: str) -> None:
    env = {**os.environ, "PYTHONPATH": str(BACKEND), "DATABASE_URL": raw}
    result = subprocess.run(  # noqa: S603 — literal command, no external input
        [sys.executable, "-m", "alembic", "-c", "config/alembic.ini", verb, target],
        cwd=BACKEND, env=env, capture_output=True, text=True, timeout=300, check=False)
    assert result.returncode == 0, result.stderr


def test_pg_migrations_downgrade_move_images_and_upgrade_again(pg_db):
    """Down to before the grants, seed catalogue photos the old way (rows in
    care_documents), then upgrade: photos move to the commerce table, a clinical
    document an image_id happens to point at is never copied, and the grants
    come back."""
    engine, _admin, _url, raw = pg_db
    _alembic(raw, "downgrade", "b6965aa39f06")
    with engine.connect() as conn:
        assert rule_l.rule_l_status(conn)["enforced"] is False
    now = time.time()
    with sessionmaker(bind=engine)() as db:
        db.add(M.Account(id="mig-admin", identifier="mig-admin@example.test", channel="EMAIL", full_name="A",
                         role="SUPER_ADMIN", active=True, profile={}, created_at=now))
        db.flush()
        db.execute(text(
            "INSERT INTO care_documents (id, account_id, title, category, filename, mime_type, content, created_at) VALUES "
            "('mig-photo', 'mig-admin', 'Catalog Image - Mask', 'OTHER', 'p.png', 'image/png', :png, :now), "
            "('mig-lab', 'mig-admin', 'Lipid panel', 'LAB_REPORT', 'lab.pdf', 'application/pdf', :pdf, :now)"),
            {"png": PNG, "pdf": b"%PDF", "now": now})
        db.execute(text(
            "INSERT INTO care_catalog (id, provider_id, kind, name, brand, category, description, pack, price_paise, "
            "mrp_paise, stock, active, requires_prescription, preparation, image_id, image_mime) VALUES "
            "('mig-item', 'mig-admin', 'product', 'Mask', 'B', 'devices', 'd', '1', 100, 0, 1, true, false, '', 'mig-photo', 'image/png'), "
            "('mig-bad', 'mig-admin', 'product', 'Odd', 'B', 'devices', 'd', '1', 100, 0, 1, true, false, '', 'mig-lab', 'image/png')"))
        db.commit()
    _alembic(raw, "upgrade", "head")
    with sessionmaker(bind=engine)() as db:
        photo = db.get(M.CatalogImage, "mig-photo")
        assert photo is not None and photo.item_id == "mig-item" and photo.content == PNG
        assert db.get(M.Document, "mig-photo") is None                  # gone from the clinical table
        assert db.get(M.CatalogImage, "mig-lab") is None                # a clinical record is never copied
        assert db.get(M.Document, "mig-lab") is not None                # ...nor deleted
        assert db.get(M.CatalogEntry, "mig-bad").image_id is None       # and the bad pointer is cleared
        assert db.get(M.CatalogEntry, "mig-item").image_id == "mig-photo"
    with engine.connect() as conn:
        assert rule_l.rule_l_status(conn)["enforced"] is True
    with engine.begin() as conn:
        conn.exec_driver_sql("SET LOCAL ROLE sk_commerce")
        assert conn.execute(text("SELECT count(*) FROM care_catalog_images")).scalar() >= 1


def test_pg_commerce_session_runs_as_sk_commerce_and_is_refused_clinical(pg_db):
    from services.commerce_session import open_commerce_session

    engine, *_ = pg_db
    with open_commerce_session(engine) as db:
        assert db.scalar(text("SELECT current_user")) == "sk_commerce"
        db.scalars(select(M.CatalogEntry)).all()
        with pytest.raises(DBAPIError, match="permission denied"):
            db.scalars(select(M.Reading)).all()
        db.rollback()
        # The role is SET LOCAL: a new transaction starts as sk_commerce again.
        assert db.scalar(text("SELECT current_user")) == "sk_commerce"
    with engine.connect() as conn:
        assert conn.scalar(text("SELECT current_user")) != "sk_commerce"


def _login_role(admin, name, password):
    with admin.connect() as conn:
        conn.execute(text(f"DROP ROLE IF EXISTS \"{name}\""))
        conn.execute(text(f"CREATE ROLE \"{name}\" LOGIN NOCREATEROLE NOSUPERUSER PASSWORD '{password}'"))


def test_pg_no_createrole_and_not_owner_is_reported_not_fatal(pg_db, monkeypatch):
    """A migrating user that cannot create roles or grant on the tables gets a
    warning and an honest status, and its transaction stays usable."""
    engine, admin, db_url, _raw = pg_db
    name, password = f"rule_l_nocr_{uuid.uuid4().hex[:6]}", uuid.uuid4().hex
    _login_role(admin, name, password)
    weak = create_engine(db_url.set(username=name, password=password), poolclass=NullPool)
    try:
        with weak.begin() as conn:
            result = rule_l.apply_grants(conn)            # roles exist, but it owns no table
            assert result.applied is False
            assert any("NOT in force" in w for w in result.warnings)
            assert conn.scalar(text("SELECT 1")) == 1      # the transaction survived

            real_exists = rule_l._role_exists
            monkeypatch.setattr(rule_l, "_role_exists", lambda c, r: False)
            result = rule_l.apply_grants(conn)            # as if the roles were never created
            assert result.roles_missing == list(rule_l.GROUP_ROLES)
            assert any("CREATEROLE" in w and "NOT in force" in w for w in result.warnings)
            assert rule_l.rule_l_status(conn)["enforced"] is False
            monkeypatch.setattr(rule_l, "_role_exists", real_exists)
            assert conn.scalar(text("SELECT 1")) == 1
            # It is not a member of sk_commerce, so commerce paths keep the app role.
            assert rule_l.commerce_role_usable(conn) is False
    finally:
        weak.dispose()
        with admin.connect() as conn:
            conn.execute(text(f'DROP ROLE IF EXISTS "{name}"'))


def test_pg_marketplace_works_end_to_end_as_sk_commerce(pg_db, monkeypatch):
    """The commerce endpoints really run under sk_commerce and still work."""
    from test_workflow_api import login, register

    from app.main import app
    from services import commerce_session, workflow_auth
    from services.workflow_auth import workflow_db

    engine, *_ = pg_db
    commerce_session.reset_cache()
    factory = sessionmaker(bind=engine, expire_on_commit=False)

    def database():
        with factory() as session:
            yield session

    seen_roles = []
    real_open = commerce_session.open_commerce_session

    def spying_open(bind):
        session = real_open(bind)
        seen_roles.append(session.scalar(text("SELECT current_user")))
        return session

    codes = []
    monkeypatch.setattr(workflow_auth, "deliver_code", lambda identifier, code, channel: codes.append(code) or True)
    monkeypatch.setattr(commerce_session, "open_commerce_session", spying_open)
    app.dependency_overrides[workflow_db] = database
    client = TestClient(app)
    try:
        user, headers = register(client, codes, f"buyer-{uuid.uuid4().hex[:6]}@example.test")
        vendor = f"vendor-{uuid.uuid4().hex[:6]}"
        with factory() as db:
            db.add(M.Account(id=vendor, identifier=f"{vendor}@example.test", channel="EMAIL", full_name="Vendor",
                             role="VENDOR", active=True, profile={}, created_at=time.time()))
            db.flush()
            db.add(M.CatalogEntry(id=f"item-{vendor}", provider_id=vendor, kind="product", name="Thermometer", brand="B",
                                  category="devices", description="digital", pack="1", price_paise=45000, mrp_paise=50000,
                                  stock=5, active=True, requires_prescription=False, preparation=""))
            db.commit()
        listing = client.get("/api/catalog")
        assert listing.status_code == 200, listing.text
        assert any(i["id"] == f"item-{vendor}" for i in listing.json()["items"])
        cart = client.post("/api/cart/validate", headers=headers, json={"items": [{"id": f"item-{vendor}", "quantity": 1}]})
        assert cart.status_code == 200 and cart.json()["serviceable"] is True, cart.text
        order = client.post("/api/orders", headers={**headers, "Idempotency-Key": f"rule-l-{vendor}"},
                            json={"items": [{"id": f"item-{vendor}", "quantity": 1}],
                                  "delivery": {"mode": "pickup", "address": "", "city": "Hyderabad", "pincode": "500001"}})
        assert order.status_code == 201, order.text
        assert client.get("/api/orders", headers=headers).json()["total"] == 1
        assert client.post(f"/api/orders/{order.json()['id']}/cancel", headers=headers).json()["success"] is True
        with factory() as db:
            assert db.get(M.CatalogEntry, f"item-{vendor}").stock == 5
            assert db.scalar(select(M.WorkflowAudit).where(M.WorkflowAudit.resource_id == order.json()["id"]))
            db.add(M.CatalogImage(id=f"img-{vendor}", item_id=f"item-{vendor}", filename="p.png", mime_type="image/png",
                                  content=PNG, uploaded_by=user["id"], created_at=time.time()))
            db.get(M.CatalogEntry, f"item-{vendor}").image_id = f"img-{vendor}"
            db.commit()
        image = client.get(f"/api/catalog/item-{vendor}/image")
        assert image.status_code == 200 and image.content == PNG
        assert client.get("/api/billing/me").json()["effectivePlanId"] == "FREE"
        assert any(p["id"] == vendor for p in client.get("/api/refills/pharmacies").json()["items"])
        second = client.post("/api/orders", headers={**headers, "Idempotency-Key": f"rule-l-2-{vendor}"},
                             json={"items": [{"id": f"item-{vendor}", "quantity": 1}],
                                   "delivery": {"mode": "pickup", "address": "", "city": "Hyderabad", "pincode": "500001"}})
        assert second.status_code == 201, second.text
        # Paying (mock provider), verifying and refunding all run as sk_commerce.
        order_id = second.json()["id"]
        intent = client.post(f"/api/orders/{order_id}/payment", headers=headers).json()
        assert intent["provider"] == "mock" and intent["testMode"] is True, intent
        paid = client.post(f"/api/orders/{order_id}/payment/mock-checkout", headers=headers,
                           json={"providerOrderId": intent["providerOrderId"], "cardNumber": "4111111111111111"}).json()
        verified = client.post(f"/api/orders/{order_id}/payment/verify", headers=headers, json={
            "providerOrderId": paid["providerOrderId"], "providerPaymentId": paid["providerPaymentId"],
            "signature": paid["signature"]})
        assert verified.status_code == 200 and verified.json()["paymentStatus"] == "PAID", verified.text
        with factory() as db:
            db.get(M.Account, user["id"]).role = "SUPER_ADMIN"
            db.commit()
        refunded = client.post(f"/api/v1/orders/{order_id}/refund", headers={**headers, "Idempotency-Key": f"rf-{vendor}"},
                               json={"payment_id": paid["providerPaymentId"], "amount_paise": 1000})
        assert refunded.status_code == 200 and refunded.json()["status"] == "PROCESSED", refunded.text
        with factory() as db:
            db.get(M.Account, user["id"]).role = "STUDENT"
            db.commit()
        vendor_headers = login(client, codes, f"{vendor}@example.test")
        queue = client.get("/api/work/requests")
        assert queue.status_code == 200, queue.text
        mine = [i for i in queue.json()["items"] if i["orderId"] == second.json()["id"]]
        assert mine and mine[0]["contact"] == user["email"]
        accepted = client.patch(f"/api/work/requests/{mine[0]['id']}", headers=vendor_headers, json={"status": "ACCEPTED"})
        assert accepted.status_code == 200, accepted.text
        with factory() as db:   # the customer was told, through the normal session
            assert db.scalar(select(M.OutboxEvent).where(M.OutboxEvent.account_id == user["id"],
                                                         M.OutboxEvent.event_type == "REQUEST_ACCEPTED"))
        assert seen_roles and set(seen_roles) == {"sk_commerce"}
    finally:
        app.dependency_overrides.clear()
        client.close()
        commerce_session.reset_cache()
