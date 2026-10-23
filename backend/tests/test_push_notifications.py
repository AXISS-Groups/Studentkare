"""Push notifications: devices, dispatch, privacy on the lock screen, Rule L, announcements."""
from __future__ import annotations

import base64
import json
import time

import httpx
import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from sqlalchemy import select
from test_workflow_api import harness, login, register  # noqa: F401  (fixture)

from core import push_copy as P
from core import rule_l
from core import workflow_models as M
from services import push_dispatch, push_providers
from services.workflow_scheduler import _process_outbox, enqueue

EXPO_TOKEN = "ExponentPushToken[abcdefghijklmnop]"
FCM = "https://fcm.googleapis.com/fcm/send/abc123"


def b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


@pytest.fixture
def expo(monkeypatch):
    """A fake Expo service: records every message, answers ok (or as told)."""
    monkeypatch.setenv("EXPO_ACCESS_TOKEN", "test-expo-access-token")
    sent: list[dict] = []
    state = {"error": "", "receipt": "ok"}

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "Bearer test-expo-access-token"
        body = json.loads(request.content)
        if request.url.path.endswith("/getReceipts"):
            receipt = {"status": "ok"} if state["receipt"] == "ok" else {
                "status": "error", "details": {"error": state["receipt"]}}
            return httpx.Response(200, json={"data": dict.fromkeys(body["ids"], receipt)})
        sent.extend(body)
        if state["error"]:
            return httpx.Response(200, json={"data": [{"status": "error", "details": {"error": state["error"]}}
                                                      for _ in body]})
        return httpx.Response(200, json={"data": [{"status": "ok", "id": f"ticket-{i}-{time.time()}"}
                                                  for i, _ in enumerate(body)]})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    yield client, sent, state
    client.close()


def student_with_device(client, codes, identifier: str, token: str = EXPO_TOKEN, locale: str = "en"):
    user, headers = register(client, codes, identifier)
    response = client.post("/api/notifications/devices", headers=headers,
                           json={"kind": "EXPO", "token": token, "platform": "android", "locale": locale})
    assert response.status_code == 201, response.text
    return user, headers, response.json()["id"]


def set_prefs(client, headers, **changes):
    current = client.get("/api/notifications/preferences", headers=headers).json()
    body = {key: current[key] for key in ("emailEnabled", "pushEnabled", "remindersEnabled", "pickupLocationEnabled",
                                          "ayushHistoryEnabled", "timezone", "quietStart", "quietEnd")}
    body.update(changes)
    response = client.put("/api/notifications/preferences", headers=headers, json=body)
    assert response.status_code == 200, response.text


def no_quiet(client, headers):
    set_prefs(client, headers, quietStart="00:00", quietEnd="00:00")


# --- devices -------------------------------------------------------------------------

def test_device_registration_validates_and_moves_a_token_between_accounts(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "dev1@example.test")
    bad = client.post("/api/notifications/devices", headers=headers,
                      json={"kind": "EXPO", "token": "not-a-token-at-all", "platform": "ios"})
    assert bad.status_code == 422
    # Web Push endpoints must be a known push service: the server never POSTs to anywhere else.
    ssrf = client.post("/api/notifications/devices", headers=headers, json={
        "kind": "WEB", "token": "https://169.254.169.254/latest/meta-data", "platform": "web",
        "keys": {"p256dh": "B" * 87, "auth": "A" * 22}})
    assert ssrf.status_code == 422
    ok = client.post("/api/notifications/devices", headers=headers,
                     json={"kind": "EXPO", "token": EXPO_TOKEN, "platform": "ios", "locale": "te-IN"})
    assert ok.status_code == 201
    client.post("/api/auth/logout", headers=headers)
    other, other_headers = register(client, codes, "dev2@example.test")
    again = client.post("/api/notifications/devices", headers=other_headers,
                        json={"kind": "EXPO", "token": EXPO_TOKEN, "platform": "ios"})
    assert again.status_code == 201
    with factory() as db:
        rows = db.scalars(select(M.PushDevice)).all()
        assert [(r.account_id, r.revoked_at) for r in rows] == [(other["id"], 0.0)]


def test_signing_out_revokes_the_devices_that_sign_in_registered(harness):
    client, factory, codes = harness
    _, headers, device_id = student_with_device(client, codes, "out@example.test")
    assert client.post("/api/auth/logout", headers=headers).status_code == 200
    with factory() as db:
        device = db.get(M.PushDevice, device_id)
        assert device.revoked_at > 0 and device.revoke_reason == "signed_out"


def test_web_push_key_is_null_until_configured(harness, monkeypatch):
    client, _, codes = harness
    _, headers = register(client, codes, "key@example.test")
    monkeypatch.delenv("VAPID_PRIVATE_KEY", raising=False)
    assert client.get("/api/notifications/web-push-key", headers=headers).json() == {"publicKey": None}
    private = ec.generate_private_key(ec.SECP256R1())
    scalar = private.private_numbers().private_value.to_bytes(32, "big")
    monkeypatch.setenv("VAPID_PRIVATE_KEY", b64(scalar))
    monkeypatch.setenv("VAPID_SUBJECT", "mailto:ops@studentkare.co")
    key = client.get("/api/notifications/web-push-key", headers=headers).json()["publicKey"]
    point = private.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    assert key == b64(point)
    # A public key that doesn't match the private one turns Web Push off (fail closed).
    monkeypatch.setenv("VAPID_PUBLIC_KEY", b64(b"\x04" + b"\x01" * 64))
    assert client.get("/api/notifications/web-push-key", headers=headers).json() == {"publicKey": None}


# --- Web Push crypto (RFC 8291 / RFC 8292) -------------------------------------------

def test_web_push_payload_decrypts_with_the_browsers_keys():
    ua_private = ec.generate_private_key(ec.SECP256R1())
    ua_public = ua_private.public_key().public_bytes(serialization.Encoding.X962,
                                                     serialization.PublicFormat.UncompressedPoint)
    auth = b"0123456789abcdef"
    body = push_providers.encrypt_payload(b'{"title":"Student Kare"}', b64(ua_public), b64(auth))
    salt, record_size, id_len = body[:16], int.from_bytes(body[16:20], "big"), body[20]
    as_public = body[21:21 + id_len]
    assert record_size == push_providers.WEB_PUSH_RECORD_SIZE and id_len == 65
    shared = ua_private.exchange(ec.ECDH(), ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), as_public))
    ikm = HKDF(hashes.SHA256(), 32, salt=auth, info=b"WebPush: info\x00" + ua_public + as_public).derive(shared)
    cek = HKDF(hashes.SHA256(), 16, salt=salt, info=b"Content-Encoding: aes128gcm\x00").derive(ikm)
    nonce = HKDF(hashes.SHA256(), 12, salt=salt, info=b"Content-Encoding: nonce\x00").derive(ikm)
    plain = AESGCM(cek).decrypt(nonce, body[21 + id_len:], None)
    assert plain == b'{"title":"Student Kare"}\x02'


def test_vapid_token_verifies_with_the_public_key(monkeypatch):
    private = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setenv("VAPID_PRIVATE_KEY", b64(private.private_numbers().private_value.to_bytes(32, "big")))
    monkeypatch.setenv("VAPID_SUBJECT", "mailto:ops@studentkare.co")
    monkeypatch.delenv("VAPID_PUBLIC_KEY", raising=False)
    header = push_providers.vapid_authorization(FCM, push_providers.vapid_keys())
    token = header.split("t=")[1].split(",")[0]
    signing_input, signature = token.rsplit(".", 1)
    raw = unb64(signature)
    der = encode_dss_signature(int.from_bytes(raw[:32], "big"), int.from_bytes(raw[32:], "big"))
    private.public_key().verify(der, signing_input.encode(), ec.ECDSA(hashes.SHA256()))
    claims = json.loads(unb64(signing_input.split(".")[1]))
    assert claims["aud"] == "https://fcm.googleapis.com" and claims["sub"] == "mailto:ops@studentkare.co"


# --- privacy: nothing about health on a lock screen ------------------------------------

def test_lock_screen_lines_name_no_health_detail_in_any_language():
    for locale in P.LOCALES:
        for key in P.CATEGORIES:
            if key == P.ANNOUNCEMENTS:
                continue
            title, body = P.lock_screen_text(key, locale)
            assert title == "Student Kare"
            assert not P.contains_health_term(body), (locale, key, body)


def test_a_result_or_a_medicine_never_reaches_the_push(harness, expo):
    client, factory, codes = harness
    expo_client, sent, _ = expo
    user, headers, _ = student_with_device(client, codes, "private@example.test")
    no_quiet(client, headers)
    set_prefs(client, headers, channels={"REMINDERS": ["PUSH"]})
    from services import ops_feed
    with factory() as db:
        ops_feed.notify(db, user["id"], "LAB_REPORT_RELEASED", dedupe_key="lab:1",
                        summary="Your HbA1c result is 7.2% (diabetes range)", resource_type="lab_order", resource_id="l1")
        enqueue(db, "medication_refill", "refill:1", {"trackerId": "t1", "label": "Metformin 500 mg"},
                account_id=user["id"])
        db.commit()
        _process_outbox(db)
        push_dispatch.dispatch(db, expo_client=expo_client)
    assert len(sent) == 2
    blob = json.dumps(sent)
    for secret in ("HbA1c", "7.2", "diabetes", "Metformin", "500"):
        assert secret not in blob
    by_category = {message["data"]["category"]: message for message in sent}
    assert by_category["CARE"]["body"] == P.lock_screen_text(P.CARE, "en")[1]
    assert by_category["REMINDERS"]["body"] == "You have a reminder in Student Kare."
    assert by_category["REMINDERS"]["data"]["path"] == "/medications"


def test_push_follows_the_device_language(harness, expo):
    client, factory, codes = harness
    expo_client, sent, _ = expo
    user, headers, _ = student_with_device(client, codes, "telugu@example.test", locale="te")
    no_quiet(client, headers)
    from services import ops_feed
    with factory() as db:
        ops_feed.notify(db, user["id"], "ORDER_DISPATCHED", dedupe_key="o:1", summary="x")
        db.commit()
        _process_outbox(db)
        push_dispatch.dispatch(db, expo_client=expo_client)
    assert sent[0]["body"] == P.LOCK_SCREEN["te"][P.ORDERS]
    assert sent[0]["channelId"] == "orders"


# --- Rule L ----------------------------------------------------------------------------

def test_a_health_event_can_never_be_a_marketing_push(harness, monkeypatch):
    assert not rule_l.push_category_allowed(rule_l.CLINICAL, P.OFFERS)
    assert rule_l.push_category_allowed(rule_l.PLATFORM, P.OFFERS)
    with pytest.raises(rule_l.CommerceFirewallViolation):
        rule_l.assert_push_allowed(rule_l.CLINICAL, P.OFFERS)
    client, factory, codes = harness
    user, _ = register(client, codes, "firewall@example.test")
    # Even if a future mapping sent an outbox event to OFFERS, the fan-out refuses it.
    monkeypatch.setattr(push_dispatch.P, "category_of", lambda event_type: P.OFFERS)
    with factory() as db:
        event = M.OutboxEvent(id="evt-x", event_type="LAB_REPORT_RELEASED", account_id=user["id"],
                              dedupe_key="x", payload={"summary": "s"}, created_at=time.time())
        with pytest.raises(rule_l.CommerceFirewallViolation):
            push_dispatch.fan_out_event(db, event)


def test_offers_are_off_by_default_opt_in_is_audited_and_offers_reach_only_opted_in(harness, expo):
    client, factory, codes = harness
    expo_client, sent, _ = expo
    a, a_headers, _ = student_with_device(client, codes, "optin@example.test", token="ExponentPushToken[aaaaaaaaaaaa]")
    assert client.get("/api/notifications/preferences", headers=a_headers).json()["marketingOptIn"] is False
    no_quiet(client, a_headers)
    set_prefs(client, a_headers, marketingOptIn=True)
    client.post("/api/auth/logout", headers=a_headers)
    b, b_headers, _ = student_with_device(client, codes, "optout@example.test", token="ExponentPushToken[bbbbbbbbbbbb]")
    no_quiet(client, b_headers)
    with factory() as db:
        audits = [row.action for row in db.scalars(select(M.WorkflowAudit).where(M.WorkflowAudit.actor_id == a["id"]))]
        assert "MARKETING_PUSH_OPT_IN" in audits
        # The devices were registered by a's first sign-in, which logged out: re-activate for the send.
        for device in db.scalars(select(M.PushDevice)).all():
            device.revoked_at = 0.0
        db.add(M.Announcement(id="ann-offer", kind="OFFER", title="Partner week", body="10% off stationery",
                              campus="", status="SCHEDULED", scheduled_at=time.time() - 1, created_by="admin",
                              created_at=time.time()))
        db.commit()
        push_dispatch.fan_out_due_announcements(db)
        push_dispatch.dispatch(db, expo_client=expo_client)
        assert [m["to"] for m in sent] == ["ExponentPushToken[aaaaaaaaaaaa]"]
        assert any(row.action.startswith("OFFER_PUSH_SENT:1") for row in db.scalars(select(M.WorkflowAudit)))
    assert b["id"]


# --- timing, caps, dedupe, dead tokens --------------------------------------------------

def test_quiet_hours_hold_a_push_but_not_a_safety_answer(harness, expo):
    client, factory, codes = harness
    expo_client, sent, _ = expo
    user, headers, _ = student_with_device(client, codes, "quiet@example.test")
    set_prefs(client, headers, quietStart="00:00", quietEnd="23:59")
    from services import ops_feed
    with factory() as db:
        ops_feed.notify(db, user["id"], "ORDER_DISPATCHED", dedupe_key="o:q", summary="x")
        ops_feed.notify(db, user["id"], "SOS_ACKNOWLEDGED", dedupe_key="sos:q", summary="x")
        db.commit()
        _process_outbox(db)
        push_dispatch.dispatch(db, expo_client=expo_client)
        held = db.scalar(select(M.PushDelivery).where(M.PushDelivery.category == "ORDERS"))
        assert held.status == "PENDING" and held.next_attempt_at > time.time()
    assert [m["data"]["category"] for m in sent] == ["SAFETY"]
    assert sent[0]["priority"] == "high"


def test_rate_cap_and_coalescing(harness, expo, monkeypatch):
    client, factory, codes = harness
    expo_client, sent, _ = expo
    user, headers, _ = student_with_device(client, codes, "cap@example.test")
    no_quiet(client, headers)
    from services import ops_feed
    with factory() as db:
        for i in range(3):
            ops_feed.notify(db, user["id"], "ORDER_DISPATCHED", dedupe_key=f"o:c{i}", summary="x")
        db.commit()
        _process_outbox(db)
        push_dispatch.dispatch(db, expo_client=expo_client)
        # Three order updates at once read the same on a lock screen: one push.
        assert len(sent) == 1
        statuses = sorted(r.last_error for r in db.scalars(select(M.PushDelivery)).all())
        assert statuses.count("coalesced") == 2


def test_dead_tokens_are_pruned_from_tickets_and_receipts(harness, expo):
    client, factory, codes = harness
    expo_client, sent, state = expo
    user, headers, device_id = student_with_device(client, codes, "dead@example.test")
    no_quiet(client, headers)
    from services import ops_feed
    state["error"] = "DeviceNotRegistered"
    with factory() as db:
        ops_feed.notify(db, user["id"], "ORDER_DISPATCHED", dedupe_key="o:d", summary="x")
        db.commit()
        _process_outbox(db)
        summary = push_dispatch.dispatch(db, expo_client=expo_client)
        assert summary["gone"] == 1
        assert db.get(M.PushDevice, device_id).revoke_reason == "provider_gone"


def test_receipts_mark_delivered_and_retries_back_off(harness, expo, monkeypatch):
    client, factory, codes = harness
    expo_client, sent, state = expo
    user, headers, device_id = student_with_device(client, codes, "receipt@example.test")
    no_quiet(client, headers)
    from services import ops_feed
    state["error"] = "MessageRateExceeded"
    with factory() as db:
        ops_feed.notify(db, user["id"], "ORDER_DISPATCHED", dedupe_key="o:r", summary="x")
        db.commit()
        _process_outbox(db)
        assert push_dispatch.dispatch(db, expo_client=expo_client)["retry"] == 1
        row = db.scalar(select(M.PushDelivery))
        assert row.status == "PENDING" and row.next_attempt_at > time.time()
        state["error"] = ""
        row.next_attempt_at = 0
        db.commit()
        assert push_dispatch.dispatch(db, expo_client=expo_client)["sent"] == 1
        row.sent_at = time.time() - 3600
        db.commit()
        assert push_dispatch.check_receipts(db, client=expo_client)["summary"]["delivered"] == 1
        assert db.get(M.PushDelivery, row.id).status == "DELIVERED"


def test_a_reminder_can_go_by_push_only(harness, expo, monkeypatch):
    client, factory, codes = harness
    expo_client, sent, _ = expo
    user, headers, _ = student_with_device(client, codes, "pushonly@example.test")
    no_quiet(client, headers)
    set_prefs(client, headers, channels={"REMINDERS": ["PUSH"]})
    from services import workflow_scheduler
    monkeypatch.setattr(workflow_scheduler, "_deliver_reminder",
                        lambda db, event: pytest.fail("no WhatsApp/email was chosen"))
    with factory() as db:
        enqueue(db, "medication_refill", "refill:p", {"trackerId": "t"}, account_id=user["id"])
        db.commit()
        _process_outbox(db)
        event = db.scalar(select(M.OutboxEvent).where(M.OutboxEvent.dedupe_key == "refill:p"))
        assert event.status == "SENT"
        push_dispatch.dispatch(db, expo_client=expo_client)
    assert len(sent) == 1


def test_safety_channels_cannot_be_turned_off(harness):
    client, _, codes = harness
    _, headers = register(client, codes, "safety@example.test")
    current = client.get("/api/notifications/preferences", headers=headers).json()
    assert current["channels"]["SAFETY"] == ["PUSH", "WHATSAPP", "EMAIL"]
    body = {key: current[key] for key in ("emailEnabled", "pushEnabled", "remindersEnabled", "pickupLocationEnabled",
                                          "ayushHistoryEnabled", "timezone", "quietStart", "quietEnd")}
    refused = client.put("/api/notifications/preferences", headers=headers, json={**body, "channels": {"SAFETY": []}})
    assert refused.status_code == 422
    refused = client.put("/api/notifications/preferences", headers=headers, json={**body, "channels": {"ORDERS": ["EMAIL"]}})
    assert refused.status_code == 422


# --- announcements -----------------------------------------------------------------------

@pytest.mark.parametrize(("title", "body", "problem"), [
    ("Dengue alert", "Use nets in Block C", P.PROBLEM_HEALTH),
    ("Camp", "Free flu screening Saturday", P.PROBLEM_HEALTH),
    ("Your account", "Reply with your OTP to keep it", P.PROBLEM_CODE),
    ("Hostel water", "Details at studentkare.co/water", P.PROBLEM_LINK),
])
def test_announcement_check_refuses_health_codes_and_links(title, body, problem):
    assert problem in P.check_announcement(title, body, title_max=60, body_max=160)


def test_announcement_check_accepts_plain_campus_news():
    assert P.check_announcement("Water supply", "Block C water is off 2 to 4 pm today.", title_max=60, body_max=160) == []


def test_super_admin_previews_counts_schedules_and_cancels(harness):
    client, factory, codes = harness
    user, headers, _ = student_with_device(client, codes, "audience@example.test")
    client.post("/api/auth/logout", headers=headers)
    with factory() as db:
        db.add(M.Account(id="admin", identifier="admin@example.test", channel="EMAIL", full_name="Test Admin",
                         role="SUPER_ADMIN", active=True, profile={}, created_at=time.time()))
        for device in db.scalars(select(M.PushDevice)).all():
            device.revoked_at = 0.0
        db.commit()
    admin = login(client, codes, "admin@example.test")
    # A student can't reach the admin endpoints, and the admin preview names nobody.
    body = {"kind": "ANNOUNCEMENT", "title": "Water supply", "body": "Block C water is off 2 to 4 pm today."}
    preview = client.post("/api/v1/admin/announcements/preview", headers=admin, json=body)
    assert preview.status_code == 200, preview.text
    data = preview.json()
    assert set(data) == {"problems", "students", "devices", "lockScreen"} and data["problems"] == []
    refused = client.post("/api/v1/admin/announcements", headers=admin, json={**body, "title": "Dengue alert"})
    assert refused.status_code == 422 and "HEALTH_TERM" in refused.json()["detail"]["values"]["problems"]
    later = time.time() + 3600
    created = client.post("/api/v1/admin/announcements", headers=admin, json={**body, "scheduledAt": later})
    assert created.status_code == 201 and created.json()["status"] == "SCHEDULED"
    cancelled = client.post(f"/api/v1/admin/announcements/{created.json()['id']}/cancel", headers=admin)
    assert cancelled.json()["status"] == "CANCELLED"
    listing = client.get("/api/v1/admin/announcements", headers=admin).json()
    assert listing["items"][0]["counts"]["devices"] == 0
    with factory() as db:
        actions = {row.action for row in db.scalars(select(M.WorkflowAudit).where(M.WorkflowAudit.actor_id == "admin"))}
        assert {"ANNOUNCEMENT_SCHEDULED", "ANNOUNCEMENT_CANCELLED"} <= actions
    assert user["id"]


def test_students_cannot_send_announcements(harness):
    client, _, codes = harness
    _, headers = register(client, codes, "notadmin@example.test")
    response = client.post("/api/v1/admin/announcements", headers=headers,
                           json={"title": "Water supply", "body": "Block C water is off."})
    assert response.status_code == 403


def test_the_hourly_cap_holds_the_rest_for_later(harness, expo, monkeypatch):
    client, factory, codes = harness
    expo_client, sent, _ = expo
    user, headers, _ = student_with_device(client, codes, "hourly@example.test")
    no_quiet(client, headers)
    real = push_dispatch.setting
    monkeypatch.setattr(push_dispatch, "setting", lambda key, db=None: 2 if key == "push.rate_cap_per_hour" else real(key, db))
    from services import ops_feed
    with factory() as db:
        for kind in ("ORDER_DISPATCHED", "LAB_SAMPLE_COLLECTED", "CAMPUS_VERIFIED"):
            ops_feed.notify(db, user["id"], kind, dedupe_key=f"cap:{kind}", summary="x")
        db.commit()
        _process_outbox(db)
        push_dispatch.dispatch(db, expo_client=expo_client)
        held = db.scalars(select(M.PushDelivery).where(M.PushDelivery.status == "PENDING")).all()
    assert len(sent) == 2 and len(held) == 1 and held[0].next_attempt_at > time.time()
