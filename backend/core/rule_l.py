"""Rule L commerce firewall at the database (AGENTS.md guardrail 4, P9, P23).

This module is the one place that says which plane every table belongs to and
what each Postgres group role may do with it. Three things read it:

* the Alembic migration ``f1a7c3e9b2d4_rule_l_grants`` (and ``apply_grants``
  callers after it), which creates the roles and writes the grant matrix;
* ``services.commerce_session``, which runs the commerce code paths as
  ``sk_commerce`` so a commerce query that touches a clinical table fails at
  Postgres with ``permission denied``;
* ``rule_l_status``, which reads the live catalogue and reports what is in
  force. Nothing here asserts compliance: the status is computed from
  ``pg_roles`` / ``has_table_privilege`` every time (guardrail 6).

A table missing from ``TABLE_PLANES`` fails ``tests/test_rule_l.py``, so a new
table cannot reach production without someone deciding its plane. The default
for every role on every table is no access.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

CLINICAL = "clinical"
COMMERCE = "commerce"
IDENTITY = "identity"
PLATFORM = "platform"
PLANES = frozenset({CLINICAL, COMMERCE, IDENTITY, PLATFORM})

COMMERCE_ROLE = "sk_commerce"
CLINICAL_ROLE = "sk_clinical"
GROUP_ROLES = (COMMERCE_ROLE, CLINICAL_ROLE)

# Every table in the schema, by plane. Anything that holds, or could hold, a
# health fact about a person is CLINICAL — including free text a student wrote
# (support messages, outbox payloads) and insurance, which reveals care sought.
# When in doubt a table goes CLINICAL: the commerce role then cannot read it.
TABLE_PLANES: dict[str, str] = {
    # --- clinical: health records and anything derived from them ---
    "care_readings": CLINICAL,                    # vitals / body metrics, water, activity (WELLNESS_STORES)
    "care_documents": CLINICAL,                   # health records
    "care_document_intake": CLINICAL,
    "care_intake_review_items": CLINICAL,
    "care_record_shares": CLINICAL,               # consent grant to a clinician
    "care_exercise_sessions": CLINICAL,
    "care_preferences": CLINICAL,                 # saved exercises, wellness tasks, water goal
    "care_medication_plans": CLINICAL,
    "care_medication_doses": CLINICAL,
    "care_refill_requests": CLINICAL,
    "care_appointments": CLINICAL,
    "care_consultation_sessions": CLINICAL,
    "care_encounter_notes": CLINICAL,
    "care_prescriptions": CLINICAL,
    "care_prescription_items": CLINICAL,
    "care_dispenses": CLINICAL,
    "care_dispense_items": CLINICAL,
    "care_rx_upload_reviews": CLINICAL,           # a student's prescription file sent to a pharmacist
    "care_substitution_requests": CLINICAL,
    "care_lab_orders": CLINICAL,
    "care_lab_results": CLINICAL,                 # a student's lab values (typed and confirmed, or lab-released)
    "care_hostel_visit_requests": CLINICAL,       # sample pickup / nurse visit
    "care_programmes": CLINICAL,                  # chronic care enrolment
    "care_followup_tasks": CLINICAL,
    "care_crisis_events": CLINICAL,
    "care_sos_alerts": CLINICAL,
    "care_sos_deliveries": CLINICAL,
    "care_blood_donors": CLINICAL,                # blood group
    "care_blood_sos_requests": CLINICAL,
    "care_camp_attendances": CLINICAL,            # health-camp stations completed
    "care_preventive_report_reviews": CLINICAL,
    "care_preventive_preferences": CLINICAL,      # health topics of interest
    "care_wellness_goals": CLINICAL,              # setup answers: goal ("manage stress"), activity level
    "care_clinical_profiles": CLINICAL,           # typed blood group and allergies (moved out of care_accounts.profile)
    "care_consent_records": CLINICAL,
    "care_policies": CLINICAL,                    # insurance
    "care_claim_requests": CLINICAL,              # names the service received
    "care_agent_turns": CLINICAL,                 # questions asked of the care agent
    "care_support_requests": CLINICAL,            # free text, may describe symptoms
    "care_outbox_events": CLINICAL,               # notification payloads (results, reminders)
    "care_erasure_archives": CLINICAL,            # sealed copies of erased records
    "break_glass_sessions": CLINICAL,             # emergency access to a record
    # --- commerce: catalogue, cart/orders, billing, offers ---
    "care_catalog": COMMERCE,
    "care_catalog_images": COMMERCE,              # product photos (moved out of care_documents)
    "care_medicines": COMMERCE,                   # medicine master: composition, form, schedule (no person)
    "care_medicine_ingredients": COMMERCE,        # salts and strengths of a master record
    "care_orders": COMMERCE,
    "care_order_lines": COMMERCE,
    "care_payments": COMMERCE,
    "care_payment_intents": COMMERCE,             # payable kind + id + amount, no item names
    "care_dispense_quotes": COMMERCE,             # a dispense's quote totals by id; item prices stay clinical
    "care_refunds": COMMERCE,
    "care_lab_order_charges": COMMERCE,           # a self-booked test's price + paid state; lab order id only
    "care_mock_gateway_payments": COMMERCE,       # the test-only mock gateway's ledger
    "care_return_requests": COMMERCE,
    "care_billing_subscriptions": COMMERCE,
    "care_billing_receipts": COMMERCE,
    "care_benefit_requests": COMMERCE,
    "care_enterprise_inquiries": COMMERCE,
    "care_enterprise_contracts": COMMERCE,
    "care_contract_seats": COMMERCE,
    "care_preventive_vaccines": COMMERCE,         # priced offerings
    # Points and referrals: account ids, codes, counts, amounts. Commerce, not
    # platform, because P56 puts the points ledger on the commercial side of the
    # firewall: whatever later reads or spends points (offers, a redemption)
    # must reach it as sk_commerce and so can never reach a clinical table from
    # there. Rewards are never derived from clinical data (see services/rewards.py).
    "care_points_ledger": COMMERCE,
    "care_referral_codes": COMMERCE,
    "care_referrals": COMMERCE,
    # --- identity: who someone is and how they sign in ---
    "care_accounts": IDENTITY,
    "care_sessions": IDENTITY,
    "care_remembered_devices": IDENTITY,
    "care_two_factor": IDENTITY,
    "care_two_factor_pending": IDENTITY,
    "care_otp_challenges": IDENTITY,
    "care_signup_grants": IDENTITY,
    "care_campus_verifications": IDENTITY,
    "care_campus_departures": IDENTITY,
    "care_notification_preferences": IDENTITY,
    "care_deletion_requests": IDENTITY,
    "care_dpdp_erasure_requests": IDENTITY,
    "app_users": IDENTITY,
    "tenants": IDENTITY,
    # --- platform: operations, reference content, no person's health ---
    "alembic_version": PLATFORM,
    "care_rate_buckets": PLATFORM,
    "care_staff_pin_credentials": PLATFORM,       # team-account PIN hashes and lockout counters; no grant to either role
    "care_student_passcodes": PLATFORM,           # student passcode hashes and lockout counters; no grant to either role
    "care_account_passwords": PLATFORM,           # password hashes and lockout counters; no grant to either role
    "care_account_contacts": PLATFORM,            # each account's email and WhatsApp number, verified or not
    "care_student_invites": PLATFORM,             # B2B invitations: link and temporary-password hashes only
    "care_workflow_audit": PLATFORM,
    "audit_logs": PLATFORM,
    "care_system_settings": PLATFORM,             # integration secrets
    "care_scheduled_jobs": PLATFORM,
    "care_agent_runs": PLATFORM,
    "agent_runs": PLATFORM,
    "care_ops_events": PLATFORM,                  # counts and states only, by design
    "care_activity_counters": PLATFORM,
    "code_health_findings": PLATFORM,
    "department_states": PLATFORM,
    "care_knowledge_sources": PLATFORM,
    "care_knowledge_chunks": PLATFORM,
    "care_home_content": PLATFORM,
    "care_articles": PLATFORM,
    "care_reviewed_benefits": PLATFORM,
    "care_service_providers": PLATFORM,
    "care_facilities": PLATFORM,                  # the care directory: places and phone numbers, no person
    "care_availability_slots": PLATFORM,
    "care_lab_test_reference": PLATFORM,          # test names and body-system groups; no person, no range
    "care_lab_collectors": PLATFORM,              # which staff account collects for which lab
    "care_health_camps": PLATFORM,
    "care_health_camp_slots": PLATFORM,
    "care_health_camp_stations": PLATFORM,
    "care_preventive_providers": PLATFORM,
    "care_dpdp_consent_policy_versions": PLATFORM,
    "care_campus_security_contacts": PLATFORM,
    "care_appearance_preferences": PLATFORM,      # System / Dark / Light per account; a display choice only
    "care_setting_overrides": PLATFORM,           # business settings (core/settings_registry.py)
    "care_setting_override_history": PLATFORM,    # append-only: who changed a setting, when, why
}

# Where each wellness log lives (services/wellness_api.py, the meds endpoints).
# All of it is CLINICAL; none is commerce and none is platform:
# * weight, height, BMI, heart rate and medicine doses are clinical values.
# * water intake and activity (steps, distance, floors, active energy, standing
#   minutes) look harmless but are still facts about one identifiable person's
#   body and behaviour. PLATFORM is for tables that hold no person's health, so
#   they cannot go there; and a step count or water log on a commercial surface
#   (an upsell keyed to "you walked less this week", an insurer feed) is exactly
#   what Rule L forbids. They share care_readings with the vitals, so the
#   commerce role is refused them at Postgres like any other reading.
# BMI is never stored: it is computed on read from the weight and height rows.
# Nothing here feeds points, medals, streak rewards or a leaderboard.
WELLNESS_STORES: dict[str, str] = {
    "water": "care_readings",
    "water_goal": "care_preferences",
    "activity": "care_readings",
    "heart_rate": "care_readings",
    "weight": "care_readings",
    "height": "care_readings",
    "bmi": "care_readings",
    "medication_plans": "care_medication_plans",
    "medication_doses": "care_medication_doses",
}


def wellness_plane(kind: str) -> str:
    """The plane a wellness log kind is stored in. KeyError for an unknown kind."""
    return TABLE_PLANES[WELLNESS_STORES[kind]]


RW = ("SELECT", "INSERT", "UPDATE")
RWD = ("SELECT", "INSERT", "UPDATE", "DELETE")


@dataclass(frozen=True)
class Grant:
    privileges: tuple[str, ...]
    columns: tuple[str, ...] = field(default=())   # empty = whole table


def _matrix() -> dict[str, dict[str, Grant]]:
    """role -> table -> grant. A table absent for a role means no access."""
    commerce = {t: Grant(RW) for t, plane in TABLE_PLANES.items() if plane == COMMERCE}
    commerce["care_catalog_images"] = Grant(RWD)   # replacing / removing a product photo
    commerce["care_medicine_ingredients"] = Grant(RWD)   # editing a composition replaces its salts
    # The commerce paths need to know a provider exists and is active, and must
    # be able to leave an audit trail. Nothing more of identity or platform.
    commerce["care_accounts"] = Grant(("SELECT",), ("id", "role", "active"))
    commerce["care_workflow_audit"] = Grant(("INSERT",))
    commerce["care_ops_events"] = Grant(("INSERT",))

    clinical = {t: Grant(RWD) for t, plane in TABLE_PLANES.items() if plane == CLINICAL}
    clinical["care_accounts"] = Grant(("SELECT",))
    clinical["care_workflow_audit"] = Grant(("INSERT",))
    clinical["care_ops_events"] = Grant(("INSERT",))
    return {COMMERCE_ROLE: commerce, CLINICAL_ROLE: clinical}


GRANT_MATRIX: dict[str, dict[str, Grant]] = _matrix()


def tables_in(plane: str) -> list[str]:
    return sorted(t for t, p in TABLE_PLANES.items() if p == plane)


def _q(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def grant_statements(existing_tables: set[str]) -> list[str]:
    """Idempotent SQL that resets both roles to exactly the matrix.

    Every classified table that exists is first stripped of all privileges for
    both roles (REVOKE also drops column grants), so re-running converges and a
    table moved between planes loses its old grant. Clinical tables also lose
    anything granted to PUBLIC.
    """
    sql = [f"GRANT USAGE ON SCHEMA public TO {_q(role)}" for role in GROUP_ROLES]
    for table in sorted(existing_tables & set(TABLE_PLANES)):
        sql.append(f"REVOKE ALL ON TABLE public.{_q(table)} FROM {', '.join(_q(r) for r in GROUP_ROLES)}")
        if TABLE_PLANES[table] == CLINICAL:
            sql.append(f"REVOKE ALL ON TABLE public.{_q(table)} FROM PUBLIC")
    for role, tables in GRANT_MATRIX.items():
        for table, grant in sorted(tables.items()):
            if table not in existing_tables:
                continue
            if grant.columns:
                cols = ", ".join(_q(c) for c in grant.columns)
                privs = ", ".join(f"{p} ({cols})" for p in grant.privileges)
            else:
                privs = ", ".join(grant.privileges)
            sql.append(f"GRANT {privs} ON TABLE public.{_q(table)} TO {_q(role)}")
    return sql


# --- applying -------------------------------------------------------------


@dataclass
class ApplyResult:
    applied: bool = False
    roles_created: list[str] = field(default_factory=list)
    roles_missing: list[str] = field(default_factory=list)
    membership: bool = False
    warnings: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {"applied": self.applied, "rolesCreated": self.roles_created, "rolesMissing": self.roles_missing,
                "membership": self.membership, "warnings": self.warnings}


def _scalar(conn, sql: str, params: dict | None = None):
    from sqlalchemy import text
    return conn.execute(text(sql), params or {}).scalar()


def _role_exists(conn, role: str) -> bool:
    return bool(_scalar(conn, "SELECT 1 FROM pg_roles WHERE rolname = :r", {"r": role}))


PG16_VERSION_NUM = 160000   # server_version_num of PostgreSQL 16.0


def _membership_mode(conn) -> str:
    # PG16 split membership into INHERIT / SET; SET is what SET ROLE needs.
    return "SET" if int(_scalar(conn, "SHOW server_version_num")) >= PG16_VERSION_NUM else "MEMBER"


def can_assume(conn, role: str) -> bool:
    if not _role_exists(conn, role):
        return False
    return bool(_scalar(conn, f"SELECT pg_has_role(current_user, :r, '{_membership_mode(conn)}')", {"r": role}))


def commerce_role_usable(conn) -> bool:
    """Cheap runtime check: can this login SET ROLE sk_commerce, and has the
    matrix been written (sk_commerce reads the catalogue)? Errors propagate —
    a check that cannot complete fails the request rather than passing it."""
    if conn.dialect.name != "postgresql" or not can_assume(conn, COMMERCE_ROLE):
        return False
    return bool(_scalar(conn, "SELECT CASE WHEN to_regclass('public.care_catalog') IS NULL THEN false "
                              "ELSE has_table_privilege(:r, 'public.care_catalog', 'SELECT') END", {"r": COMMERCE_ROLE}))


def _try(conn, statements: list[str]) -> str | None:
    """Run statements in a savepoint; on failure roll back only them.

    A failed GRANT/CREATE ROLE must not abort the migration's transaction —
    the schema change still lands, and the status reports grants as absent.
    """
    from sqlalchemy import text
    nested = conn.begin_nested()
    try:
        for statement in statements:
            conn.execute(text(statement))
    except Exception as exc:  # noqa: BLE001 — reported, and the status then says "not in force"
        nested.rollback()
        return f"{type(exc).__name__}: {str(exc).splitlines()[0][:200]}"
    nested.commit()
    return None


def apply_grants(conn) -> ApplyResult:
    """Create the NOLOGIN group roles and write the grant matrix. Idempotent.

    Never raises for missing privileges: on a host where the migrating user
    lacks CREATEROLE (or does not own the tables) it logs a warning and the
    result — and ``rule_l_status`` — say plainly that grants are NOT in force.
    """
    result = ApplyResult()
    if conn.dialect.name != "postgresql":
        result.warnings.append(f"{conn.dialect.name}: Postgres grants do not exist on this database")
        return result

    may_create = bool(_scalar(conn, "SELECT rolcreaterole OR rolsuper FROM pg_roles WHERE rolname = current_user"))
    for role in GROUP_ROLES:
        if _role_exists(conn, role):
            continue
        if not may_create:
            result.roles_missing.append(role)
            continue
        # The DO block tolerates a concurrent migrator creating it first.
        error = _try(conn, [
            f"DO $$ BEGIN CREATE ROLE {_q(role)} NOLOGIN; "
            f"EXCEPTION WHEN duplicate_object THEN NULL; END $$"
        ])
        if error:
            result.roles_missing.append(role)
            result.warnings.append(f"could not create role {role}: {error}")
        else:
            result.roles_created.append(role)
    if result.roles_missing:
        result.warnings.append(
            "Rule L grants are NOT in force: role(s) " + ", ".join(result.roles_missing)
            + " do not exist and the migrating user cannot create them (needs CREATEROLE). "
            "Ask a DBA to run: " + "; ".join(f"CREATE ROLE {r} NOLOGIN" for r in result.roles_missing)
            + ", then re-run the migration or restart the app.")
        _log(result)
        return result

    existing = {row[0] for row in conn.exec_driver_sql(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'")}
    error = _try(conn, grant_statements(existing))
    if error:
        result.warnings.append(f"Rule L grants are NOT in force: writing the grant matrix failed ({error}). "
                               "The migrating user must own the tables.")
        _log(result)
        return result
    result.applied = True

    # The app's own login must be able to SET ROLE sk_commerce. It already can
    # if it is a superuser or was granted membership by a DBA.
    if not can_assume(conn, COMMERCE_ROLE):
        error = _try(conn, [f"GRANT {_q(COMMERCE_ROLE)} TO CURRENT_USER"])
        if error:
            result.warnings.append(
                f"the database login cannot SET ROLE {COMMERCE_ROLE} ({error}); commerce paths keep the app role "
                f"until a DBA runs: GRANT {COMMERCE_ROLE} TO <app login>")
    result.membership = can_assume(conn, COMMERCE_ROLE)
    _log(result)
    return result


def _log(result: ApplyResult) -> None:
    for warning in result.warnings:
        logger.warning("[RULE L] %s", warning)
    if result.applied:
        logger.info("[RULE L] grant matrix written for %s (membership=%s)", ", ".join(GROUP_ROLES), result.membership)


# --- reporting ------------------------------------------------------------

_ANY_PRIV = "SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER"


def rule_l_status(conn) -> dict:
    """What is actually in force, read from the live catalogue. Never cached claims.

    ``enforced`` is true only when every check passes: both roles exist, the
    database login can assume sk_commerce, every table is classified,
    sk_commerce holds nothing on any table outside its allowlist, can read every
    commerce table, and sk_clinical holds nothing on commerce tables.
    """
    dialect = conn.dialect.name
    status: dict = {"database": dialect, "enforced": False, "reasons": [], "checks": {}}
    if dialect != "postgresql":
        status["reasons"].append(f"{dialect} has no role grants; Rule L is not enforced at the database")
        return status

    checks = status["checks"]
    checks["rolesPresent"] = {role: _role_exists(conn, role) for role in GROUP_ROLES}
    missing = [r for r, ok in checks["rolesPresent"].items() if not ok]
    existing = sorted(row[0] for row in conn.exec_driver_sql(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
    checks["unclassifiedTables"] = [t for t in existing if t not in TABLE_PLANES]
    if missing:
        status["reasons"].append("role(s) missing: " + ", ".join(missing))
        if checks["unclassifiedTables"]:
            status["reasons"].append("unclassified table(s): " + ", ".join(checks["unclassifiedTables"]))
        return status

    checks["loginCanAssumeCommerce"] = can_assume(conn, COMMERCE_ROLE)

    def holds(role: str, table: str) -> bool:
        return bool(_scalar(
            conn,
            "SELECT has_table_privilege(:r, :t, :p) OR has_any_column_privilege(:r, :t, 'SELECT, INSERT, UPDATE, REFERENCES')",
            {"r": role, "t": f"public.{_q(table)}", "p": _ANY_PRIV}))

    def excess(role: str, table: str, grant: Grant) -> bool:
        """True if the role holds anything on the table beyond its grant."""
        others = [p for p in _ANY_PRIV.split(", ") if p not in grant.privileges]
        t = f"public.{_q(table)}"
        if others and _scalar(conn, "SELECT has_table_privilege(:r, :t, :p)", {"r": role, "t": t, "p": ", ".join(others)}):
            return True
        if not grant.columns:
            return False
        if _scalar(conn, "SELECT has_table_privilege(:r, :t, :p)", {"r": role, "t": t, "p": ", ".join(grant.privileges)}):
            return True   # a table-level grant covers every column
        columns = [row[0] for row in conn.exec_driver_sql(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' "
            "AND table_name = %(t)s", {"t": table})]
        return any(_scalar(conn, "SELECT has_column_privilege(:r, :t, :c, 'SELECT, INSERT, UPDATE, REFERENCES')",
                           {"r": role, "t": t, "c": c}) for c in columns if c not in grant.columns)

    allow = GRANT_MATRIX[COMMERCE_ROLE]
    checks["commerceLeaks"] = [t for t in existing if (holds(COMMERCE_ROLE, t) if t not in allow
                                                      else excess(COMMERCE_ROLE, t, allow[t]))]
    checks["commerceMissing"] = [t for t in tables_in(COMMERCE) if t in existing and not _scalar(
        conn, "SELECT has_table_privilege(:r, :t, 'SELECT')", {"r": COMMERCE_ROLE, "t": f"public.{_q(t)}"})]
    checks["clinicalOnCommerce"] = [t for t in tables_in(COMMERCE) if t in existing and holds(CLINICAL_ROLE, t)]

    if not checks["loginCanAssumeCommerce"]:
        status["reasons"].append(f"the database login cannot SET ROLE {COMMERCE_ROLE}")
    for key, label in (("unclassifiedTables", "unclassified table(s)"),
                       ("commerceLeaks", f"{COMMERCE_ROLE} holds privileges outside its allowlist on"),
                       ("commerceMissing", f"{COMMERCE_ROLE} cannot read commerce table(s)"),
                       ("clinicalOnCommerce", f"{CLINICAL_ROLE} holds privileges on commerce table(s)")):
        if checks[key]:
            status["reasons"].append(f"{label}: " + ", ".join(checks[key]))
    status["enforced"] = not status["reasons"]
    return status
