"""LiveKit join tokens for video consults (POST /consultation/{id}/media-token).

Who may get one (the booking student, the NMC doctor it is booked with), when
(CONFIRMED and inside the join window), what it grants (camera + microphone in
one room, nothing else), and that it fails closed without configuration.
"""
import time
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from sqlalchemy import select
from test_workflow_api import harness, login, register  # noqa: F401 - pytest fixture

from core import settings_registry as R
from core import workflow_models as M
from services import livekit_media

KEY = "APItestkey"
SECRET = "test-secret-that-is-long-enough-for-hs256-signing"
URL = "wss://livekit.example.test"


def minutes(key: str) -> timedelta:
    """A registry default as the test reads it: never a repeated literal."""
    return timedelta(minutes=R.get_declaration(key).default)


BEFORE = minutes(livekit_media.JOIN_BEFORE_KEY)
AFTER = minutes(livekit_media.JOIN_AFTER_KEY)
TTL = minutes(livekit_media.GRANT_TTL_KEY)
SLOT = timedelta(minutes=30)          # a fixture slot length, not a setting
SLACK = timedelta(minutes=1)


@pytest.fixture(autouse=True)
def _fresh_settings_cache():
    R.reset_cache()
    yield
    R.reset_cache()


def override(factory, key, value):
    """Store a super-admin override directly (the API path is tested in test_settings_registry)."""
    with factory() as db:
        db.merge(M.SettingOverride(key=key, value=value, updated_by="test", updated_at=time.time()))
        db.commit()
    R.reset_cache()


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setenv("LIVEKIT_URL", URL)
    monkeypatch.setenv("LIVEKIT_API_KEY", KEY)
    monkeypatch.setenv("LIVEKIT_API_SECRET", SECRET)


@pytest.fixture
def unconfigured(monkeypatch):
    for name in ("LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"):
        monkeypatch.delenv(name, raising=False)


def iso(moment: datetime) -> str:
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def _account(db, account_id, identifier, role):
    db.add(M.Account(id=account_id, identifier=identifier, channel="EMAIL", full_name=f"Name {account_id}",
                     role=role, active=True, profile={}, created_at=time.time()))


def _setup(factory, student_id, *, status="CONFIRMED", start=None, end=None, kind="consultation", appt_id="apt_media1"):
    now = datetime.now(timezone.utc)
    start = start if start is not None else iso(now + timedelta(minutes=5))
    end = end if end is not None else iso(now + timedelta(minutes=35))
    with factory() as db:
        if not db.get(M.Account, "doc"):
            _account(db, "doc", "doc@example.test", "NMC_DOCTOR")
        item_id = f"item_{appt_id}"
        db.add(M.CatalogEntry(id=item_id, provider_id="doc", kind=kind, name="Consult", brand="B", category="general-care",
                              description="d", pack="30m", price_paise=29900, mrp_paise=49900, stock=0, active=True,
                              requires_prescription=False, preparation=""))
        db.add(M.AvailabilitySlot(id=f"slot_{appt_id}", provider_id="doc", catalog_item_id=item_id, slot_start=start,
                                  slot_end=end, capacity=1, booked=1, active=True))
        db.add(M.Appointment(id=appt_id, account_id=student_id, provider_id="doc", catalog_item_id=item_id,
                             slot_id=f"slot_{appt_id}", status=status, created_at=time.time(), updated_at=time.time()))
        db.commit()
    return appt_id


def _token(client, appt_id, headers):
    return client.post(f"/api/consultation/{appt_id}/media-token", headers=headers)


def test_owner_gets_a_camera_and_microphone_only_token(harness, configured):  # noqa: F811
    client, factory, codes = harness
    student, headers = register(client, codes, "media-owner@example.test")
    appt_id = _setup(factory, student["id"])

    res = _token(client, appt_id, headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["available"] is True and body["url"] == URL and body["role"] == "student"
    assert body["room"] == f"sk-consult-{appt_id}" and body["identity"] == student["id"]

    claims = jwt.decode(body["token"], SECRET, algorithms=["HS256"], issuer=KEY)
    assert claims["sub"] == student["id"]
    video = claims["video"]
    assert video["roomJoin"] is True and video["room"] == f"sk-consult-{appt_id}"
    assert video["canPublish"] is True and video["canSubscribe"] is True
    assert video["canPublishData"] is False
    assert sorted(video["canPublishSources"]) == ["camera", "microphone"]
    assert video.get("canUpdateOwnMetadata") is False
    for forbidden in ("roomAdmin", "roomCreate", "roomList", "roomRecord", "recorder", "hidden", "ingressAdmin", "agent"):
        assert not video.get(forbidden), forbidden
    for forbidden in ("sip", "agent", "inference", "observability", "roomConfig"):
        assert forbidden not in claims
    # No name, metadata or attributes: nothing about the person reaches LiveKit.
    assert "name" not in claims and "metadata" not in claims and "attributes" not in claims
    assert "Name " not in body["token"]
    # Short-lived.
    assert claims["exp"] - claims["nbf"] <= int(TTL.total_seconds())
    assert claims["exp"] - time.time() <= TTL.total_seconds() + 5

    with factory() as db:
        rows = db.scalars(select(M.WorkflowAudit).where(M.WorkflowAudit.action == "CONSULT_MEDIA_TOKEN_ISSUED")).all()
        assert [(r.actor_id, r.resource_id) for r in rows] == [(student["id"], appt_id)]


def test_assigned_doctor_gets_a_token_for_the_same_room(harness, configured):  # noqa: F811
    client, factory, codes = harness
    student, _ = register(client, codes, "media-patient@example.test")
    appt_id = _setup(factory, student["id"])
    doc_headers = login(client, codes, "doc@example.test")

    res = _token(client, appt_id, doc_headers)
    assert res.status_code == 200, res.text
    assert res.json()["role"] == "doctor"
    claims = jwt.decode(res.json()["token"], SECRET, algorithms=["HS256"], issuer=KEY)
    assert claims["sub"] == "doc" and claims["video"]["room"] == f"sk-consult-{appt_id}"


def test_another_student_gets_nothing(harness, configured):  # noqa: F811
    client, factory, codes = harness
    owner, _ = register(client, codes, "media-a@example.test")
    appt_id = _setup(factory, owner["id"])
    with factory() as db:
        _account(db, "otherstudent", "media-b@example.test", "STUDENT")
        db.commit()
    assert _token(client, appt_id, login(client, codes, "media-b@example.test")).status_code == 404


def test_another_doctor_gets_nothing(harness, configured):  # noqa: F811
    client, factory, codes = harness
    owner, _ = register(client, codes, "media-c@example.test")
    appt_id = _setup(factory, owner["id"])
    with factory() as db:
        _account(db, "otherdoc", "otherdoc@example.test", "NMC_DOCTOR")
        db.commit()
    assert _token(client, appt_id, login(client, codes, "otherdoc@example.test")).status_code == 404


def test_provider_account_that_is_not_a_doctor_gets_nothing(harness, configured):  # noqa: F811
    client, factory, codes = harness
    owner, _ = register(client, codes, "media-d@example.test")
    appt_id = _setup(factory, owner["id"])
    with factory() as db:
        db.get(M.Account, "doc").role = "VENDOR"
        db.commit()
    assert _token(client, appt_id, login(client, codes, "doc@example.test")).status_code == 404


def test_unknown_appointment_is_not_found(harness, configured):  # noqa: F811
    client, _factory, codes = harness
    _, headers = register(client, codes, "media-e@example.test")
    assert _token(client, "apt_missing", headers).status_code == 404


@pytest.mark.parametrize("status", ["REQUESTED", "COMPLETED", "CANCELLED", "NO_SHOW"])
def test_only_a_confirmed_consultation_can_be_joined(harness, configured, status):  # noqa: F811
    client, factory, codes = harness
    student, headers = register(client, codes, f"media-{status.lower()}@example.test")
    appt_id = _setup(factory, student["id"], status=status)
    res = _token(client, appt_id, headers)
    assert res.status_code == 409 and res.json()["detail"]["code"] == "NOT_CONFIRMED"


def test_lab_appointments_are_not_video_consults(harness, configured):  # noqa: F811
    client, factory, codes = harness
    student, headers = register(client, codes, "media-lab@example.test")
    appt_id = _setup(factory, student["id"], kind="lab")
    res = _token(client, appt_id, headers)
    assert res.status_code == 409 and res.json()["detail"]["code"] == "NOT_A_CONSULTATION"


@pytest.mark.parametrize("offsets", [
    (BEFORE + SLACK, BEFORE + SLACK + SLOT),            # opens BEFORE the start: too early
    (-(AFTER + SLACK + SLOT), -(AFTER + SLACK)),        # closes AFTER the end: too late
])
def test_outside_the_join_window_gets_nothing(harness, configured, offsets):  # noqa: F811
    client, factory, codes = harness
    student, headers = register(client, codes, "media-window@example.test")
    now = datetime.now(timezone.utc)
    appt_id = _setup(factory, student["id"], start=iso(now + offsets[0]), end=iso(now + offsets[1]))
    res = _token(client, appt_id, headers)
    assert res.status_code == 409 and res.json()["detail"]["code"] == "OUTSIDE_WINDOW"
    with factory() as db:
        assert not db.scalars(select(M.WorkflowAudit).where(M.WorkflowAudit.action == "CONSULT_MEDIA_TOKEN_ISSUED")).all()


def test_edges_of_the_window_are_inside(harness, configured):  # noqa: F811
    client, factory, codes = harness
    student, headers = register(client, codes, "media-edge@example.test")
    now = datetime.now(timezone.utc)
    early = _setup(factory, student["id"], start=iso(now + BEFORE - SLACK), end=iso(now + BEFORE - SLACK + SLOT), appt_id="apt_early")
    late = _setup(factory, student["id"], start=iso(now - AFTER + SLACK - SLOT), end=iso(now - AFTER + SLACK), appt_id="apt_late")
    assert _token(client, early, headers).status_code == 200
    res = _token(client, late, headers)
    assert res.status_code == 200
    # A token never outlives the window: about one minute is left here.
    claims = jwt.decode(res.json()["token"], SECRET, algorithms=["HS256"], issuer=KEY)
    assert claims["exp"] - time.time() <= 61 + 5


def test_unreadable_slot_time_fails_closed(harness, configured):  # noqa: F811
    client, factory, codes = harness
    student, headers = register(client, codes, "media-bad-slot@example.test")
    appt_id = _setup(factory, student["id"], start="10:00 AM", end="10:30 AM")
    res = _token(client, appt_id, headers)
    assert res.status_code == 409 and res.json()["detail"]["code"] == "OUTSIDE_WINDOW"


def test_unconfigured_is_unavailable_and_state_reports_no_live_media(harness, unconfigured):  # noqa: F811
    client, factory, codes = harness
    student, headers = register(client, codes, "media-off@example.test")
    appt_id = _setup(factory, student["id"])
    res = _token(client, appt_id, headers)
    assert res.status_code == 503 and res.json()["detail"]["code"] == "MEDIA_UNAVAILABLE"
    assert client.get(f"/api/consultation/{appt_id}/state", headers=headers).json()["liveMedia"] is False
    joined = client.post(f"/api/consultation/{appt_id}/join", headers=headers).json()
    assert joined["liveMedia"] is False
    with factory() as db:
        assert not db.scalars(select(M.WorkflowAudit).where(M.WorkflowAudit.action == "CONSULT_MEDIA_TOKEN_ISSUED")).all()


def test_configured_state_reports_live_media(harness, configured):  # noqa: F811
    client, factory, codes = harness
    student, headers = register(client, codes, "media-on@example.test")
    appt_id = _setup(factory, student["id"])
    assert client.get(f"/api/consultation/{appt_id}/state", headers=headers).json()["liveMedia"] is True


@pytest.mark.parametrize("env", [
    {"LIVEKIT_URL": "", "LIVEKIT_API_KEY": KEY, "LIVEKIT_API_SECRET": SECRET},
    {"LIVEKIT_URL": URL, "LIVEKIT_API_KEY": "", "LIVEKIT_API_SECRET": SECRET},
    {"LIVEKIT_URL": URL, "LIVEKIT_API_KEY": KEY, "LIVEKIT_API_SECRET": "  "},
    {"LIVEKIT_URL": "not a url", "LIVEKIT_API_KEY": KEY, "LIVEKIT_API_SECRET": SECRET},
    {"LIVEKIT_URL": "ftp://livekit.example.test", "LIVEKIT_API_KEY": KEY, "LIVEKIT_API_SECRET": SECRET},
])
def test_partial_or_malformed_configuration_is_unconfigured(monkeypatch, env):
    for name, value in env.items():
        monkeypatch.setenv(name, value)
    assert livekit_media.is_configured() is False
    with pytest.raises(livekit_media.MediaUnavailable):
        livekit_media.load_config()


def test_plain_ws_url_is_refused_in_production(monkeypatch):
    monkeypatch.setenv("LIVEKIT_URL", "ws://livekit.internal:7880")
    monkeypatch.setenv("LIVEKIT_API_KEY", KEY)
    monkeypatch.setenv("LIVEKIT_API_SECRET", SECRET)
    monkeypatch.setenv("APP_ENV", "production")
    assert livekit_media.is_configured() is False
    monkeypatch.setenv("APP_ENV", "development")
    assert livekit_media.is_configured() is True


def test_signing_failure_fails_closed(harness, configured, monkeypatch):  # noqa: F811
    client, factory, codes = harness
    student, headers = register(client, codes, "media-sign-fail@example.test")
    appt_id = _setup(factory, student["id"])

    import livekit.api as lk

    def broken(self):
        raise RuntimeError(SECRET)
    monkeypatch.setattr(lk.AccessToken, "to_jwt", broken)
    res = _token(client, appt_id, headers)
    assert res.status_code == 503 and res.json()["detail"]["code"] == "MEDIA_UNAVAILABLE"
    assert SECRET not in res.text


def test_naive_slot_times_are_read_in_india_time():
    opens, closes = livekit_media.join_window("2026-10-20T10:00", "2026-10-20T10:30")
    # 10:00 / 10:30 IST are 04:30 / 05:00 UTC.
    assert opens == datetime(2026, 10, 20, 4, 30, tzinfo=timezone.utc) - BEFORE
    assert closes == datetime(2026, 10, 20, 5, 0, tzinfo=timezone.utc) + AFTER
    assert livekit_media.join_window("2026-10-20T10:30", "2026-10-20T10:00") is None
    assert livekit_media.join_window("", "2026-10-20T10:00") is None


def test_old_single_offer_signalling_endpoints_are_gone(harness):  # noqa: F811
    client, factory, codes = harness
    student, headers = register(client, codes, "media-signal@example.test")
    appt_id = _setup(factory, student["id"])
    assert client.post(f"/api/consultation/{appt_id}/signal", json={"type": "offer", "sdp": "x"}, headers=headers).status_code in (404, 405)
    assert client.get(f"/api/consultation/{appt_id}/signal", headers=headers).status_code in (404, 405)


# --- the registry owns the window and the token lifetime (AGENTS.md rule 11) ---

def test_join_before_override_opens_the_call_earlier(harness, configured):  # noqa: F811
    client, factory, codes = harness
    student, headers = register(client, codes, "media-ov-before@example.test")
    now = datetime.now(timezone.utc)
    start = now + BEFORE + SLACK * 5          # too early under the default
    appt_id = _setup(factory, student["id"], start=iso(start), end=iso(start + SLOT))
    res = _token(client, appt_id, headers)
    assert res.status_code == 409 and res.json()["detail"]["opensBeforeMinutes"] == BEFORE.total_seconds() // 60

    wider = int((BEFORE + SLACK * 10).total_seconds() // 60)
    override(factory, livekit_media.JOIN_BEFORE_KEY, wider)
    assert _token(client, appt_id, headers).status_code == 200


def test_join_before_override_changes_the_refusal_copy(harness, configured):  # noqa: F811
    client, factory, codes = harness
    student, headers = register(client, codes, "media-ov-copy@example.test")
    narrower = int((BEFORE - SLACK * 5).total_seconds() // 60)
    override(factory, livekit_media.JOIN_BEFORE_KEY, narrower)
    start = datetime.now(timezone.utc) + BEFORE  # inside the default window, outside the narrower one
    appt_id = _setup(factory, student["id"], start=iso(start), end=iso(start + SLOT))
    res = _token(client, appt_id, headers)
    assert res.status_code == 409
    detail = res.json()["detail"]
    assert detail["code"] == "OUTSIDE_WINDOW" and detail["opensBeforeMinutes"] == narrower
    assert f"opens {narrower} minutes before" in detail["message"]


def test_join_after_override_closes_the_call_sooner(harness, configured):  # noqa: F811
    client, factory, codes = harness
    student, headers = register(client, codes, "media-ov-after@example.test")
    end = datetime.now(timezone.utc) - (AFTER - SLACK * 5)    # still open under the default
    appt_id = _setup(factory, student["id"], start=iso(end - SLOT), end=iso(end))
    assert _token(client, appt_id, headers).status_code == 200

    override(factory, livekit_media.JOIN_AFTER_KEY, int((AFTER - SLACK * 10).total_seconds() // 60))
    res = _token(client, appt_id, headers)
    assert res.status_code == 409 and res.json()["detail"]["code"] == "OUTSIDE_WINDOW"


def test_token_ttl_override_shortens_the_token(harness, configured):  # noqa: F811
    client, factory, codes = harness
    student, headers = register(client, codes, "media-ov-ttl@example.test")
    appt_id = _setup(factory, student["id"])
    shorter = int((TTL - SLACK * 5).total_seconds() // 60)
    override(factory, livekit_media.GRANT_TTL_KEY, shorter)
    res = _token(client, appt_id, headers)
    assert res.status_code == 200, res.text
    claims = jwt.decode(res.json()["token"], SECRET, algorithms=["HS256"], issuer=KEY)
    assert claims["exp"] - claims["nbf"] <= shorter * 60
    assert claims["exp"] - time.time() <= shorter * 60 + 5


def test_invalid_override_falls_back_to_the_default_window(harness, configured):  # noqa: F811
    client, factory, codes = harness
    student, headers = register(client, codes, "media-ov-bad@example.test")
    start = datetime.now(timezone.utc) + BEFORE - SLACK      # inside the default window
    appt_id = _setup(factory, student["id"], start=iso(start), end=iso(start + SLOT))
    override(factory, livekit_media.JOIN_BEFORE_KEY, -1)     # below its minimum: never used
    assert _token(client, appt_id, headers).status_code == 200
