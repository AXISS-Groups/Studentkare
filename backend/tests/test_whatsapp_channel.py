"""WhatsApp is offered for sign-in codes only while it can deliver.

OpenWA can be configured and still unable to send (the WhatsApp session logged
out, or the gateway is down). A student offered it then meets a form that can
only fail. These check that the channel drops out when the session check or a
send fails, that the screens learn it from /auth/options, that a failed send
answers a 503 the screen can act on, and that no phone number reaches the logs.

The last block is the OTP-fallback account-takeover regression (issue register):
when WhatsApp fails, the same code may be re-sent by email ONLY to the
account's own verified email contact — never to an address the client supplied.
"""
import secrets
import time

import httpx
import pytest
from test_workflow_api import harness  # noqa: F401 — pytest fixture

from core import workflow_models as M
from services import otp_delivery, workflow_auth
from services.contact_store import save_contact

PHONE = "9121495077"
OPENWA = {"enabled": True, "base_url": "https://wa.example.test", "api_key": "k", "session_id": "sk", "cc": "91"}


def seed_whatsapp_account(factory, phone, *, email=None):
    """A WhatsApp-primary active student; optionally carrying a verified email contact."""
    with factory() as db:
        account = M.Account(
            id=f"acc_{secrets.token_hex(8)}",
            identifier=phone,
            channel="WHATSAPP",
            full_name="Test Student",
            role="STUDENT",
            active=True,
            profile={},
            created_at=time.time(),
        )
        db.add(account)
        db.flush()
        if email:
            save_contact(db, account.id, "EMAIL", email, verified=True)
        db.commit()


@pytest.fixture
def whatsapp_fail(harness, monkeypatch):
    """Force the primary WhatsApp send to fail so /otp/send reaches its fallback."""
    client, factory, _codes = harness
    monkeypatch.setattr(workflow_auth, "deliver_code", lambda identifier, code, channel: False)
    return client, factory, []


class FakeResponse:
    def __init__(self, status_code: int, body=None):
        self.status_code = status_code
        self._body = body
        self.text = "" if body is None else str(body)

    @property
    def is_success(self) -> bool:
        return 200 <= self.status_code < 300

    def json(self):
        if self._body is None:
            raise ValueError("no body")
        return self._body


@pytest.fixture
def whatsapp(monkeypatch):
    """OpenWA configured, email configured; the session answer and sends are scripted."""
    otp_delivery.reset_whatsapp_status()
    monkeypatch.setattr(otp_delivery, "_openwa", lambda: dict(OPENWA))
    monkeypatch.setattr(otp_delivery, "_email_configured", lambda: True)
    state = {"session": FakeResponse(200, {"id": "sk", "status": "CONNECTED", "phoneNumber": "919999999999"}),
             "send": FakeResponse(201, {"chatId": f"91{PHONE}@c.us"}), "probes": 0, "sends": 0}

    def fake_get(url, **_):
        state["probes"] += 1
        if isinstance(state["session"], Exception):
            raise state["session"]
        return state["session"]

    def fake_post(url, **_):
        state["sends"] += 1
        if isinstance(state["send"], Exception):
            raise state["send"]
        return state["send"]

    monkeypatch.setattr(otp_delivery.httpx, "get", fake_get)
    monkeypatch.setattr(otp_delivery.httpx, "post", fake_post)
    yield state
    otp_delivery.reset_whatsapp_status()


def test_connected_session_offers_whatsapp(whatsapp):
    assert otp_delivery.available_channels() == ["EMAIL", "WHATSAPP"]
    assert otp_delivery.whatsapp_status()["state"] == "connected"


@pytest.mark.parametrize("answer", [
    FakeResponse(200, {"status": "DISCONNECTED"}),
    FakeResponse(200, {"status": "INITIALIZING"}),
    FakeResponse(200, {"status": "qr_ready"}),
    FakeResponse(200, {"data": {"status": "SCAN_QR_CODE"}}),
    FakeResponse(200, {}),
    FakeResponse(404, {"message": "Session not found"}),
    FakeResponse(200, None),
    httpx.ConnectError("refused"),
])
def test_channel_drops_out_when_the_session_check_fails(whatsapp, answer):
    whatsapp["session"] = answer
    assert otp_delivery.available_channels() == ["EMAIL"]
    status = otp_delivery.whatsapp_status()
    assert status["state"] == "not_connected" and status["configured"] is True


def test_session_check_is_cached(whatsapp):
    otp_delivery.available_channels()
    otp_delivery.available_channels()
    otp_delivery.whatsapp_status()
    assert whatsapp["probes"] == 1


def test_waha_working_counts_as_connected(whatsapp):
    whatsapp["session"] = FakeResponse(200, {"name": "sk", "status": "WORKING"})
    assert "WHATSAPP" in otp_delivery.available_channels()


def test_openwa_ready_counts_as_connected(whatsapp):
    # The deployed OpenWA build answers lowercase "ready" once the phone is linked.
    whatsapp["session"] = FakeResponse(200, {"name": "sk", "status": "ready", "engineLoaded": True})
    assert "WHATSAPP" in otp_delivery.available_channels()
    assert otp_delivery.whatsapp_status()["state"] == "connected"


def test_failed_send_drops_the_channel_until_a_later_success(whatsapp):
    assert "WHATSAPP" in otp_delivery.available_channels()
    whatsapp["send"] = FakeResponse(500, {"error": "session closed"})
    assert otp_delivery.dispatch_otp(PHONE, "123456", "WHATSAPP")["delivered"] is False
    # The session check still says CONNECTED, but the failed send wins until the cache expires.
    assert otp_delivery.available_channels() == ["EMAIL"]
    assert otp_delivery.whatsapp_status()["lastFailureAt"] is not None
    assert whatsapp["probes"] == 1
    otp_delivery.record_whatsapp_delivery(True)
    assert "WHATSAPP" in otp_delivery.available_channels()


def test_unreachable_gateway_drops_the_channel(whatsapp):
    otp_delivery.available_channels()
    whatsapp["send"] = httpx.ConnectTimeout("timed out")
    otp_delivery.dispatch_otp(PHONE, "123456", "WHATSAPP")
    assert otp_delivery.available_channels() == ["EMAIL"]


def test_one_wrong_number_does_not_switch_whatsapp_off(whatsapp):
    otp_delivery.available_channels()
    whatsapp["send"] = FakeResponse(400, {"error": "invalid chatId"})
    assert otp_delivery.dispatch_otp(PHONE, "123456", "WHATSAPP")["delivered"] is False
    assert "WHATSAPP" in otp_delivery.available_channels()


def test_cache_expiry_checks_the_session_again(whatsapp, monkeypatch):
    otp_delivery.available_channels()
    whatsapp["send"] = FakeResponse(503)
    otp_delivery.dispatch_otp(PHONE, "123456", "WHATSAPP")
    assert otp_delivery.available_channels() == ["EMAIL"]
    clock = otp_delivery.time.monotonic()
    monkeypatch.setattr(otp_delivery.time, "monotonic", lambda: clock + 3600)
    assert "WHATSAPP" in otp_delivery.available_channels()
    assert whatsapp["probes"] == 2


def test_unconfigured_whatsapp_is_not_configured(monkeypatch):
    otp_delivery.reset_whatsapp_status()
    monkeypatch.setattr(otp_delivery, "_openwa", lambda: {"enabled": False, "base_url": "", "api_key": "", "session_id": "", "cc": "91"})
    assert otp_delivery.whatsapp_status()["state"] == "not_configured"


def test_dev_fallback_never_papers_over_a_disconnected_session(whatsapp, monkeypatch):
    monkeypatch.setattr(otp_delivery, "_email_configured", lambda: False)
    whatsapp["session"] = FakeResponse(200, {"status": "DISCONNECTED"})
    assert otp_delivery.available_channels() == []


def test_options_endpoint_lists_only_channels_that_deliver(harness, whatsapp):
    client, _, _ = harness
    assert client.get("/api/auth/options").json() == {"channels": ["EMAIL", "WHATSAPP"]}
    otp_delivery.reset_whatsapp_status()
    whatsapp["session"] = FakeResponse(200, {"status": "DISCONNECTED"})
    assert client.get("/api/auth/options").json() == {"channels": ["EMAIL"]}


def test_options_endpoint_with_no_channel(harness, monkeypatch):
    client, _, _ = harness
    monkeypatch.setattr(workflow_auth, "available_channels", lambda db=None: [])
    assert client.get("/api/auth/options").json() == {"channels": []}


def test_health_says_configured_but_not_connected(harness, whatsapp):
    client, _, _ = harness
    whatsapp["session"] = FakeResponse(200, {"status": "DISCONNECTED"})
    body = client.get("/api/health").json()
    assert body["integrations"]["whatsapp"] == "not_connected"
    assert body["integrations"]["otpChannels"] == ["EMAIL"]


def test_failed_whatsapp_send_answers_a_503_the_screen_can_act_on(harness, whatsapp, monkeypatch):
    client, _, _ = harness
    monkeypatch.setattr(workflow_auth, "deliver_code", real_deliver_code)
    whatsapp["send"] = FakeResponse(502, {"error": "gateway"})
    response = client.post("/api/auth/otp/send", json={"identifier": PHONE, "channel": "WHATSAPP", "intent": "SIGNUP"})
    assert response.status_code == 503
    detail = response.json()["detail"]
    assert detail["code"] == "CHANNEL_UNAVAILABLE"
    assert detail["channel"] == "WHATSAPP"
    assert detail["channels"] == ["EMAIL"]
    assert "administrator" not in detail["message"]
    assert PHONE not in response.text
    # The next student is not offered WhatsApp at all.
    assert client.get("/api/auth/options").json() == {"channels": ["EMAIL"]}


def test_disconnected_whatsapp_is_refused_before_any_send(harness, whatsapp, monkeypatch):
    client, _, _ = harness
    monkeypatch.setattr(workflow_auth, "deliver_code", real_deliver_code)
    whatsapp["session"] = FakeResponse(200, {"status": "DISCONNECTED"})
    response = client.post("/api/auth/otp/send", json={"identifier": PHONE, "channel": "WHATSAPP", "intent": "SIGNUP"})
    assert response.status_code == 503
    assert response.json()["detail"]["channels"] == ["EMAIL"]
    assert whatsapp["sends"] == 0


def test_nothing_logs_the_phone_number(harness, whatsapp, monkeypatch, capsys):
    client, _, _ = harness
    monkeypatch.setattr(workflow_auth, "deliver_code", real_deliver_code)
    monkeypatch.setenv("DEV_OTP_CONSOLE", "true")
    whatsapp["send"] = FakeResponse(500, {"chatId": f"91{PHONE}@c.us", "error": f"could not send to {PHONE}"})
    client.post("/api/auth/otp/send", json={"identifier": PHONE, "channel": "WHATSAPP", "intent": "SIGNUP"})
    otp_delivery.reset_whatsapp_status()
    whatsapp["send"] = FakeResponse(201, {"chatId": f"91{PHONE}@c.us"})
    client.post("/api/auth/otp/send", json={"identifier": f"0{PHONE}", "channel": "WHATSAPP", "intent": "SIGNUP"})
    whatsapp["session"] = FakeResponse(200, {"status": "CONNECTED", "phoneNumber": "919999999999"})
    otp_delivery.whatsapp_status(refresh=True)
    out = capsys.readouterr()
    logged = out.out + out.err
    assert "[OTP]" in logged
    assert PHONE not in logged
    assert "9999999999" not in logged


# The harness replaces deliver_code; these tests need the real path to OpenWA.
real_deliver_code = workflow_auth.deliver_code


def test_integrations_test_button_says_configured_but_not_connected(whatsapp, monkeypatch):
    from services import integrations
    monkeypatch.setitem(integrations.INTEGRATIONS_DB, "openwa", {**OPENWA})
    whatsapp["session"] = FakeResponse(200, {"status": "DISCONNECTED"})
    result = integrations.test_integration("openwa", user={"role": "SUPER_ADMIN"})
    assert result["success"] is False and result["state"] == "not_connected"
    assert "not connected" in result["message"]
    assert integrations.list_integrations(user={}, db=None)["status"]["openwa"]["state"] == "not_connected"


# --- OTP fallback: the re-sent code must never reach an address we don't own ----
#
# When WhatsApp fails, /otp/send re-sends the same code by email, but ONLY to
# the account's own verified email contact. These regressions close the account
# takeover the issue register flags: a client-supplied address, or an account
# with no verified email, must never receive the sign-in code.

def test_no_verified_email_falls_back_nowhere(whatsapp_fail, monkeypatch):
    """A WhatsApp-only account whose email contact is missing/unverified: WhatsApp
    failing must NOT invent an email target. The send fails closed with a 503 and
    no email is ever sent — to nobody."""
    client, factory, _ = whatsapp_fail
    seed_whatsapp_account(factory, PHONE, email=None)
    sent: list = []
    monkeypatch.setattr(otp_delivery, "send_email_code", lambda to, code: sent.append(to) or {"status": "sent"})

    response = client.post("/api/auth/otp/send", json={"identifier": PHONE, "channel": "WHATSAPP", "intent": "LOGIN"})
    assert response.status_code == 503
    assert sent == []  # no email address, verified or otherwise, received the code


def test_unverified_email_contact_is_not_a_fallback_target(whatsapp_fail, monkeypatch):
    """An email that exists on the account but has never been proven to be theirs
    (verified_at empty) is not a verified contact, so the fallback must skip it."""
    client, factory, _ = whatsapp_fail
    seed_whatsapp_account(factory, PHONE, email="pending@example.test")
    # The seeded contact is verified; make it unverified to model the unsafe value.
    with factory() as db:
        from sqlalchemy import select
        row = db.scalar(select(M.AccountContact).where(M.AccountContact.kind == "EMAIL"))
        row.verified_at = 0.0
        db.commit()
    sent: list = []
    monkeypatch.setattr(otp_delivery, "send_email_code", lambda to, code: sent.append(to) or {"status": "sent"})

    response = client.post("/api/auth/otp/send", json={"identifier": PHONE, "channel": "WHATSAPP", "intent": "LOGIN"})
    assert response.status_code == 503
    assert sent == []


def test_client_supplied_fallback_email_is_rejected(whatsapp_fail, monkeypatch):
    """The request body no longer carries a fallback email. An attacker trying to
    smuggle one in must get a 422 before any code is minted or delivered — the
    code can never be steered to an address we cannot prove is the account's."""
    client, factory, _ = whatsapp_fail
    seed_whatsapp_account(factory, PHONE, email="student.verified@example.test")
    sent: list = []
    monkeypatch.setattr(otp_delivery, "send_email_code", lambda to, code: sent.append(to) or {"status": "sent"})

    response = client.post("/api/auth/otp/send", json={
        "identifier": PHONE, "channel": "WHATSAPP", "intent": "LOGIN", "fallbackEmail": "attacker@evil.com"})
    assert response.status_code == 422
    assert sent == []
    # The 422 is a pure validation refusal: it leaks nothing about the account.
    # FastAPI's 422 detail echoes the attacker's *own* submitted value back
    # (standard behaviour — not a leak; they sent it). What the response must
    # never disclose is that the account carries a verified email, or what it is.
    assert "student.verified@example.test" not in response.text


def test_whatsapp_failure_re_sends_only_to_the_verified_email(whatsapp_fail, monkeypatch):
    """The legitimate path: WhatsApp down, and the account carries a verified email
    contact. The same code is re-sent there — and only there."""
    client, factory, _ = whatsapp_fail
    email = "student.verified@example.test"
    seed_whatsapp_account(factory, PHONE, email=email)
    sent: list = []
    monkeypatch.setattr(otp_delivery, "send_email_code", lambda to, code: sent.append(to) or {"status": "sent"})

    response = client.post("/api/auth/otp/send", json={"identifier": PHONE, "channel": "WHATSAPP", "intent": "LOGIN"})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["fallbackSent"] is True
    assert body["fallbackChannel"] == "EMAIL"
    assert body["fallbackTargetMasked"] == otp_delivery.mask_email(email)
    assert sent == [email]  # exactly the account's verified email, and nothing else
