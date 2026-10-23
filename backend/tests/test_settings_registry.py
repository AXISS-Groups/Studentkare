"""The settings registry (AGENTS.md rule 11): declarations, overrides, endpoints and ratchets.

What must hold:
* every declaration is well formed and its default satisfies its own rules;
* validation enforces type, bounds and allowed values (a JSON true is not a number);
* a valid override wins over the default; an invalid stored one is never used:
  the read falls back to the default and one ops event is raised for the key;
* only a SUPER_ADMIN edits, with a reason, validated, audited, with history;
* the public endpoint exposes public settings only, and is cacheable;
* src/generated/settings.ts is exactly what the registry generates;
* the PLR2004 ratchet's two lists agree, and new code cannot add a magic number.
"""
import importlib.util
import json
import shutil
import subprocess
import time
from pathlib import Path

import pytest
from sqlalchemy import select, text
from test_rule_l import pg_db  # noqa: F401 — pytest fixture
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import settings_registry as R
from core import workflow_models as M

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent

# The values the open PRs hard-coded, which this registry now owns (fixtures).
SEEDED = {
    "rewards.referral_points": (50, True),
    "rewards.referral_monthly_cap": (20, False),
    "rewards.referral_claim_window_hours": (24, True),
    "meds.dose_undo_minutes": (30, True),
    "meds.times_per_day_max": (6, True),
    "wellness.water_goal_ml_default": (2000, True),
    "wellness.water_goal_ml_min": (500, True),
    "wellness.water_goal_ml_max": (6000, True),
    "consult.media_join_before_minutes": (15, True),
    "consult.media_join_after_minutes": (30, True),
    "consult.media_token_ttl_minutes": (10, False),
    "appearance.boot_wait_ms": (1500, True),
    "pharmacy.quote_expiry_hours": (0, True),
    # Plan prices set by the founder on 2026-10-20.
    "billing.student_plus.monthly_inr": (149, True),
    "billing.student_plus.quarter_package_inr": (2199, True),
    "billing.premium.from_monthly_inr": (499, True),
    "billing.campus.per_student_yearly_inr": (240, False),
    "billing.student_plus.benefit_requests_per_month": (2, False),
    "billing.student_plus.min_entitling_receipt_inr": (99, False),
}


@pytest.fixture(autouse=True)
def _fresh_cache():
    R.reset_cache()
    yield
    R.reset_cache()


def make_account(factory, account_id, role, identifier):
    with factory() as db:
        db.add(M.Account(id=account_id, identifier=identifier, channel="EMAIL", full_name="Staff", role=role,
                         active=True, profile={}, created_at=time.time()))
        db.commit()


def admin_headers(client, factory, codes):
    make_account(factory, "admin-1", "SUPER_ADMIN", "admin.one@example.test")
    return login(client, codes, "admin.one@example.test")


def store_override(factory, key, value):
    with factory() as db:
        db.merge(M.SettingOverride(key=key, value=value, updated_by="seed", updated_at=time.time()))
        db.commit()


# --- declarations ------------------------------------------------------------

def test_seeded_values_and_visibility():
    for key, (default, public) in SEEDED.items():
        decl = R.get_declaration(key)
        assert decl.default == default, key
        assert decl.public is public, key


def test_every_declaration_is_well_formed():
    for key, decl in R.REGISTRY.items():
        assert R.KEY_PATTERN.match(key)
        assert decl.type in R.TYPES
        assert decl.description.strip() and decl.area.strip()
        assert R.validate(decl, decl.default) == decl.default
        if decl.type in (R.INT, R.FLOAT):
            assert decl.minimum is not None and decl.maximum is not None, f"{key} needs bounds"
    defaults = {key: decl.default for key, decl in R.REGISTRY.items()}
    assert R.check_ordered_pairs(defaults) == []


def test_unknown_key_is_an_error_not_a_default():
    with pytest.raises(R.UnknownSetting):
        R.setting("rewards.not_declared")


def test_declare_refuses_duplicates_bad_keys_and_bad_defaults():
    before = dict(R.REGISTRY)
    with pytest.raises(ValueError, match="twice"):
        R.declare("rewards.referral_points", R.INT, 1, description="x", area="rewards", minimum=0, maximum=9)
    with pytest.raises(ValueError, match="lower_snake_case"):
        R.declare("Rewards.Points", R.INT, 1, description="x", area="rewards", minimum=0, maximum=9)
    with pytest.raises(ValueError, match="needs allowed"):
        R.declare("test.mode", R.ENUM, "a", description="x", area="test")
    with pytest.raises(ValueError, match="min above max"):
        R.declare("test.upside_down", R.INT, 1, description="x", area="test", minimum=9, maximum=0)
    with pytest.raises(R.InvalidSettingValue):
        R.declare("test.out_of_bounds", R.INT, 10, description="x", area="test", minimum=0, maximum=9)
    with pytest.raises(ValueError, match="description"):
        R.declare("test.undocumented", R.INT, 1, description=" ", area="test", minimum=0, maximum=9)
    assert R.REGISTRY == before


INT_SETTING = R.Setting(key="t.int", type=R.INT, default=5, description="d", area="t", minimum=1, maximum=10)
FLOAT_SETTING = R.Setting(key="t.float", type=R.FLOAT, default=0.5, description="d", area="t", minimum=0, maximum=1)
BOOL_SETTING = R.Setting(key="t.bool", type=R.BOOL, default=False, description="d", area="t")
ENUM_SETTING = R.Setting(key="t.enum", type=R.ENUM, default="a", description="d", area="t", allowed=("a", "b"))
STR_SETTING = R.Setting(key="t.str", type=R.STR, default="x", description="d", area="t")


@pytest.mark.parametrize("decl,value,expected", [
    (INT_SETTING, 1, 1), (INT_SETTING, 10, 10),
    (FLOAT_SETTING, 0, 0.0), (FLOAT_SETTING, 0.25, 0.25),
    (BOOL_SETTING, True, True), (ENUM_SETTING, "b", "b"), (STR_SETTING, "anything", "anything"),
])
def test_valid_values_are_accepted(decl, value, expected):
    assert R.validate(decl, value) == expected


@pytest.mark.parametrize("decl,value", [
    (INT_SETTING, 0), (INT_SETTING, 11), (INT_SETTING, 5.0), (INT_SETTING, "5"), (INT_SETTING, True),
    (INT_SETTING, None), (FLOAT_SETTING, 1.5), (FLOAT_SETTING, float("nan")), (FLOAT_SETTING, False),
    (BOOL_SETTING, 1), (BOOL_SETTING, "true"), (ENUM_SETTING, "c"), (ENUM_SETTING, 1), (STR_SETTING, 3),
])
def test_invalid_values_are_refused(decl, value):
    with pytest.raises(R.InvalidSettingValue):
        R.validate(decl, value)


# --- reading -----------------------------------------------------------------

def test_default_without_override_and_override_wins(harness):
    _, factory, _ = harness
    key = "rewards.referral_points"
    with factory() as db:
        assert R.setting(key, db) == R.get_declaration(key).default
    store_override(factory, key, 75)
    with factory() as db:
        # Cached until the TTL passes or the cache is reset.
        assert R.setting(key, db) == R.get_declaration(key).default
        R.reset_cache()
        assert R.setting(key, db) == 75
        assert R.effective_values(db)[key] == 75


def test_invalid_override_falls_back_and_raises_one_ops_event(harness):
    _, factory, _ = harness
    key = "meds.times_per_day_max"
    store_override(factory, key, 999)          # above its max
    store_override(factory, "wellness.water_goal_ml_min", "lots")   # wrong type
    store_override(factory, "rewards.retired_key", 1)               # no longer declared: ignored
    with factory() as db:
        assert R.setting(key, db) == R.get_declaration(key).default
        assert R.setting("wellness.water_goal_ml_min", db) == R.get_declaration("wellness.water_goal_ml_min").default
    R.reset_cache()
    with factory() as db:
        R.setting(key, db)   # a second load must not raise a second event for the same key
        events = db.scalars(select(M.OpsEvent).where(M.OpsEvent.kind == R.INVALID_OVERRIDE_KIND)).all()
    assert sorted(e.resource_id for e in events) == [key, "wellness.water_goal_ml_min"]
    assert all(e.severity == "ATTENTION" for e in events)
    assert all("999" not in e.summary and "lots" not in e.summary for e in events)


def test_unreadable_overrides_mean_defaults(harness):
    _, factory, _ = harness
    with factory() as db:
        db.execute(text("DROP TABLE care_setting_overrides"))
        db.commit()
        assert R.setting("appearance.boot_wait_ms", db) == R.get_declaration("appearance.boot_wait_ms").default


def test_history_rows_cannot_be_rewritten_through_the_orm(harness):
    _, factory, _ = harness
    with factory() as db:
        db.add(M.SettingOverrideHistory(id="h1", key="rewards.referral_points", old_value=None, new_value=60,
                                        reason="seed", changed_by="admin", changed_at=time.time()))
        db.commit()
        row = db.get(M.SettingOverrideHistory, "h1")
        row.reason = "rewritten"
        with pytest.raises(ValueError, match="append-only"):
            db.commit()
        db.rollback()
        db.delete(db.get(M.SettingOverrideHistory, "h1"))
        with pytest.raises(ValueError, match="append-only"):
            db.commit()


# --- editing -----------------------------------------------------------------

def test_only_a_super_admin_reads_or_edits(harness):
    client, factory, codes = harness
    body = {"value": 60, "reason": "campaign"}
    assert client.get("/api/ops/settings").status_code == 401
    assert client.patch("/api/ops/settings/rewards.referral_points", json=body).status_code in (401, 403)
    _, student = register(client, codes)
    assert client.get("/api/ops/settings").status_code == 403
    assert client.patch("/api/ops/settings/rewards.referral_points", json=body, headers=student).status_code == 403
    for role, ident in (("CAMPUS_ADMIN", "campus@example.test"), ("VENDOR", "vendor@example.test"),
                        ("NMC_DOCTOR", "doctor@example.test")):
        make_account(factory, f"acct-{role}", role, ident)
        headers = login(client, codes, ident)
        assert client.patch("/api/ops/settings/rewards.referral_points", json=body, headers=headers).status_code == 403
    with factory() as db:
        assert db.scalars(select(M.SettingOverride)).all() == []
        assert db.scalars(select(M.SettingOverrideHistory)).all() == []


@pytest.mark.parametrize("key,body,status", [
    ("rewards.referral_points", {"value": 60}, 422),                          # no reason
    ("rewards.referral_points", {"value": 60, "reason": "   "}, 422),         # blank reason
    ("rewards.referral_points", {"value": 60, "reason": "x" * 501}, 422),     # reason too long
    ("rewards.referral_points", {"value": 60, "reason": "r", "extra": 1}, 422),
    ("rewards.not_declared", {"value": 60, "reason": "r"}, 404),
    ("rewards.referral_points", {"value": "60", "reason": "r"}, 422),          # wrong type
    ("rewards.referral_points", {"value": True, "reason": "r"}, 422),          # a bool is not a number
    ("rewards.referral_points", {"value": 10001, "reason": "r"}, 422),         # above max
    ("meds.times_per_day_max", {"value": 0, "reason": "r"}, 422),              # below min
    ("wellness.water_goal_ml_min", {"value": 2500, "reason": "r"}, 422),       # above the default it bounds
    ("wellness.water_goal_ml_max", {"value": 1000, "reason": "r"}, 422),       # below the default it bounds
])
def test_refused_edits_change_nothing(harness, key, body, status):
    client, factory, codes = harness
    headers = admin_headers(client, factory, codes)
    response = client.patch(f"/api/ops/settings/{key}", json=body, headers=headers)
    assert response.status_code == status, response.text
    with factory() as db:
        assert db.scalars(select(M.SettingOverride)).all() == []
        assert db.scalars(select(M.SettingOverrideHistory)).all() == []


def test_edit_is_validated_audited_and_kept_in_history(harness):
    client, factory, codes = harness
    headers = admin_headers(client, factory, codes)
    key = "rewards.referral_points"
    default = R.get_declaration(key).default

    first = client.patch(f"/api/ops/settings/{key}", json={"value": 60, "reason": "Diwali campaign"}, headers=headers)
    assert first.status_code == 200, first.text
    assert first.json()["effective"] == 60 and first.json()["override"]["updatedBy"] == "admin-1"
    with factory() as db:
        assert R.setting(key, db) == 60
    assert client.get("/api/config/public").json()["settings"][key] == 60

    second = client.patch(f"/api/ops/settings/{key}", json={"value": 70, "reason": "extend"}, headers=headers)
    assert second.json()["effective"] == 70
    cleared = client.patch(f"/api/ops/settings/{key}", json={"value": None, "reason": "campaign over"}, headers=headers)
    assert cleared.status_code == 200
    assert cleared.json()["override"] is None and cleared.json()["effective"] == default
    with factory() as db:
        assert R.setting(key, db) == default
        assert db.get(M.SettingOverride, key) is None
        audits = db.scalars(select(M.WorkflowAudit.action).where(M.WorkflowAudit.resource_id == key)
                            .order_by(M.WorkflowAudit.created_at)).all()
        events = db.scalars(select(M.OpsEvent).where(M.OpsEvent.kind == "SETTING_CHANGED")).all()
    assert audits == ["SETTING_OVERRIDDEN", "SETTING_OVERRIDDEN", "SETTING_OVERRIDE_CLEARED"]
    assert len(events) == 3 and all(e.actor_id == "admin-1" for e in events)

    history = client.get(f"/api/ops/settings/{key}/history", headers=headers).json()["items"]
    assert [(h["oldValue"], h["newValue"], h["reason"]) for h in history] == [
        (70, None, "campaign over"), (60, 70, "extend"), (None, 60, "Diwali campaign")]
    assert all(h["changedBy"] == "admin-1" for h in history)
    assert client.get("/api/ops/settings/rewards.nope/history", headers=headers).status_code == 404


def test_ops_list_shows_every_setting_and_flags_an_invalid_override(harness):
    client, factory, codes = harness
    headers = admin_headers(client, factory, codes)
    store_override(factory, "meds.dose_undo_minutes", -5)
    items = {i["key"]: i for i in client.get("/api/ops/settings", headers=headers).json()["items"]}
    assert set(items) == set(R.REGISTRY)
    bad = items["meds.dose_undo_minutes"]
    assert bad["override"]["valid"] is False and bad["effective"] == bad["default"]
    assert items["rewards.referral_points"]["override"] is None


# --- public endpoint -----------------------------------------------------------

def test_public_config_is_public_settings_only_and_cacheable(harness):
    client, factory, _ = harness
    store_override(factory, "rewards.referral_monthly_cap", 3)   # not public: must not leak
    response = client.get("/api/config/public")
    assert response.status_code == 200
    settings = response.json()["settings"]
    assert set(settings) == {d.key for d in R.public_settings()}
    assert "rewards.referral_monthly_cap" not in settings
    assert "consult.media_token_ttl_minutes" not in settings
    assert response.headers["cache-control"] == f"public, max-age={R.CACHE_TTL_SECONDS}"
    # Same endpoint as before: the integration config is still there.
    assert "posthog" in response.json() and "otp" in response.json()
    # Only this path may be cached; everything else stays no-store.
    assert client.get("/api/info").headers["cache-control"] == "no-store"


# --- generated client defaults ---------------------------------------------------

def _exporter():
    spec = importlib.util.spec_from_file_location("export_public_settings", BACKEND / "scripts" / "export_public_settings.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_generated_typescript_matches_the_registry():
    exporter = _exporter()
    assert exporter.OUT.read_text(encoding="utf8") == exporter.render(), "run `npm run settings:build`"
    assert exporter.main(["--check"]) == 0


def test_generated_typescript_has_no_private_setting():
    rendered = _exporter().render()
    for decl in R.REGISTRY.values():
        assert (json.dumps(decl.key) in rendered) is decl.public, decl.key


# --- PLR2004 ratchet -------------------------------------------------------------

def _ruff_config() -> dict:
    tomllib = pytest.importorskip("tomllib")   # standard library from Python 3.11
    return tomllib.loads((BACKEND / "ruff.toml").read_text())


def _ruff_plr2004_files() -> set[str]:
    config = _ruff_config()
    ignores = config["lint"]["per-file-ignores"]
    return {path for path, rules in ignores.items() if "PLR2004" in rules and not path.startswith("tests/")}


def test_ruff_selects_plr2004_and_both_lists_agree():
    config = _ruff_config()
    assert "PLR2004" in config["lint"]["select"]
    legacy = json.loads((ROOT / "config" / "python-magic-number-legacy.json").read_text())
    assert legacy == sorted(legacy) and len(legacy) == len(set(legacy))
    assert {f"backend/{p}" for p in _ruff_plr2004_files()} == set(legacy)
    assert all((ROOT / p).exists() for p in legacy)


RUFF = shutil.which("ruff")
OFFENDER = "def over_limit(count):\n    return count > 37\n"


def _ruff_stdin(filename: str, source: str) -> subprocess.CompletedProcess:
    return subprocess.run(  # noqa: S603 — fixed arguments, a test fixture on stdin
        [RUFF, "check", "--config", "ruff.toml", "--no-cache", "--stdin-filename", filename, "-"],
        cwd=BACKEND, input=source, capture_output=True, text=True, timeout=60, check=False)


@pytest.mark.skipif(RUFF is None, reason="ruff is not installed in this environment (CI's main job installs it)")
def test_new_code_cannot_add_a_magic_number():
    result = _ruff_stdin("services/brand_new_feature.py", OFFENDER)
    assert result.returncode == 1 and "PLR2004" in result.stdout
    named = "LIMIT = 37\n\n\ndef over_limit(count):\n    return count > LIMIT\n"
    assert _ruff_stdin("services/brand_new_feature.py", named).returncode == 0


@pytest.mark.skipif(RUFF is None, reason="ruff is not installed in this environment (CI's main job installs it)")
def test_legacy_files_and_tests_are_exempt():
    assert _ruff_stdin("services/apilayer.py", OFFENDER).returncode == 0
    assert _ruff_stdin("tests/test_anything.py", OFFENDER).returncode == 0


# --- Postgres: the history is append-only at the database ------------------------

def test_pg_history_is_append_only(pg_db):  # noqa: F811
    engine, *_ = pg_db
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO care_setting_override_history (id, key, old_value, new_value, reason, "
                          "changed_by, changed_at) VALUES ('h1', 'rewards.referral_points', NULL, '60', 'r', 'a', 1)"))
    for sql in ("UPDATE care_setting_override_history SET reason = 'x' WHERE id = 'h1'",
                "DELETE FROM care_setting_override_history WHERE id = 'h1'"):
        with pytest.raises(Exception, match="append-only"), engine.begin() as conn:  # noqa: B017
            conn.execute(text(sql))
