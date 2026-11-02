"""The emergency card in the phone wallet (plan tier1-emergency-card-wallet-2026-10-24).

* Offered only when turned on in settings AND configured; refused otherwise.
* A pass holds only the fields the student switched on (plus 112 / Tele-MANAS).
* Google needs the WALLET_GOOGLE consent, recorded with its version; the save link
  names the object id only.
* Removing, withdrawing the consent, asking to delete the account and leaving campus
  void the pass, and the voided copy carries no detail.
* A card change queues an update that is pushed; a failed push stays queued.
* The .pkpass manifest and PKCS#7 signature check out against a certificate made here.
* No health data in logs or URLs.
"""
import base64
import datetime
import hashlib
import io
import json
import logging
import shutil
import subprocess
import zipfile

import httpx
import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.serialization import pkcs7
from cryptography.x509.oid import NameOID
from sqlalchemy import select
from test_workflow_api import harness, register  # noqa: F401 — pytest fixture

from core import workflow_models as M
from services import campus_departure, consent_ledger, wallet_apple, wallet_google, wallet_passes

ALLERGY = "Penicillin-wallet-test"
CONDITION = "Asthma-wallet-test"
PASS_TYPE = "pass.test.studentkare.emergency"


# --- test credentials, made here ----------------------------------------------------------------

def _cert(subject: str, key, issuer_name: x509.Name | None = None, issuer_key=None, ca: bool = False) -> x509.Certificate:
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, subject)])
    now = datetime.datetime.now(datetime.UTC)
    return (x509.CertificateBuilder().subject_name(name).issuer_name(issuer_name or name)
            .public_key(key.public_key()).serial_number(x509.random_serial_number())
            .not_valid_before(now - datetime.timedelta(days=1)).not_valid_after(now + datetime.timedelta(days=30))
            .add_extension(x509.BasicConstraints(ca=ca, path_length=None), critical=True)
            .sign(issuer_key or key, hashes.SHA256()))


def _pem(cert: x509.Certificate) -> str:
    return cert.public_bytes(serialization.Encoding.PEM).decode()


@pytest.fixture(scope="module")
def credentials():
    wwdr_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    wwdr = _cert("Test WWDR", wwdr_key, ca=True)
    pass_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pass_cert = _cert(f"Pass Type ID: {PASS_TYPE}", pass_key, wwdr.subject, wwdr_key)
    google_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    service_account = {"client_email": "wallet@test-project.iam.gserviceaccount.com",
                       "private_key": google_key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                                               serialization.NoEncryption()).decode()}
    return {"wwdr": wwdr, "wwdr_pem": _pem(wwdr), "pass_pem": _pem(pass_cert),
            "pass_key_pem": pass_key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                                   serialization.NoEncryption()).decode(),
            "google_key": google_key, "service_account": json.dumps(service_account)}


@pytest.fixture
def wallets(monkeypatch, credentials):
    """Both wallets configured and turned on; the network calls are recorded, never made."""
    monkeypatch.setenv("APP_BASE_URL", "https://studentkare.test")
    monkeypatch.setenv("APPLE_WALLET_PASS_TYPE_ID", PASS_TYPE)
    monkeypatch.setenv("APPLE_WALLET_TEAM_ID", "TEAM123456")
    monkeypatch.setenv("APPLE_WALLET_CERT_PEM", credentials["pass_pem"])
    monkeypatch.setenv("APPLE_WALLET_KEY_PEM", base64.b64encode(credentials["pass_key_pem"].encode()).decode())
    monkeypatch.setenv("APPLE_WALLET_WWDR_PEM", credentials["wwdr_pem"])
    monkeypatch.setenv("APPLE_WALLET_AUTH_SECRET", "a-test-secret-of-enough-length")
    monkeypatch.setenv("GOOGLE_WALLET_ISSUER_ID", "3388000000012345678")
    monkeypatch.setenv("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON", credentials["service_account"])
    real_setting = wallet_passes.setting
    monkeypatch.setattr(wallet_passes, "setting",
                        lambda key, db=None: True if key.startswith("emergency_card.wallet_") and key.endswith("_enabled")
                        else real_setting(key, db))
    sent = {"apns": [], "google": [], "fail": False}

    def fake_push(cfg, tokens, client=None):
        if sent["fail"]:
            raise wallet_apple.AppleWalletError("down")
        sent["apns"].append(list(tokens))
        return []

    def fake_upsert(cfg, serial, body, client=None):
        if sent["fail"]:
            raise wallet_google.GoogleWalletError("down")
        sent["google"].append(body)

    monkeypatch.setattr(wallet_apple, "push", fake_push)
    monkeypatch.setattr(wallet_google, "upsert_object", fake_upsert)
    monkeypatch.setattr(wallet_google, "has_users", lambda cfg, serial, client=None: True)
    return sent


def _student(client, codes, factory):
    user, headers = register(client, codes)
    saved = client.patch("/api/profile", headers=headers, json={
        "bloodGroup": "O+", "allergies": [ALLERGY], "chronicConditions": [CONDITION],
        "emergencyContactName": "Asha", "emergencyContactPhone": "9876543210", "emergencyContactRelation": "Parent"})
    assert saved.status_code == 200, saved.text
    return user, headers


def _unzip(data: bytes) -> dict[str, bytes]:
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        return {name: archive.read(name) for name in archive.namelist()}


def _add_apple(client, headers, fields=("name", "blood", "contact")):
    added = client.post("/api/wallet/emergency-card/apple", headers=headers, json={"fields": list(fields)})
    assert added.status_code == 200, added.text
    return added.json()


def _google_consent():
    return {"consentGranted": True, "consentVersion": consent_ledger.WALLET_GOOGLE_CONSENT_VERSION, "language": "en"}


def _passes(factory, account_id):
    with factory() as db:
        return list(db.scalars(select(M.WalletPass).where(M.WalletPass.account_id == account_id)).all())


# --- availability -------------------------------------------------------------------------------

def test_not_offered_without_credentials_even_when_turned_on(harness, monkeypatch):
    client, factory, codes = harness
    for name in ("APPLE_WALLET_CERT_PEM", "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr(wallet_passes, "setting", lambda key, db=None: True if key.endswith("_enabled") else 5)
    _user, headers = _student(client, codes, factory)
    status = client.get("/api/wallet/emergency-card").json()
    assert status["available"] == {"apple": False, "google": False}
    refused = client.post("/api/wallet/emergency-card/apple", headers=headers, json={"fields": ["name"]})
    assert refused.status_code == 409 and refused.json()["detail"]["code"] == wallet_passes.WALLET_UNAVAILABLE


def test_off_by_default_in_settings_even_with_credentials(harness, wallets, monkeypatch):
    client, factory, codes = harness
    monkeypatch.setattr(wallet_passes, "setting", lambda key, db=None: False if key.endswith("_enabled") else 5)
    _student(client, codes, factory)
    assert client.get("/api/wallet/emergency-card").json()["available"] == {"apple": False, "google": False}


def test_settings_declared_off_by_default():
    from core.settings_registry import REGISTRY

    assert REGISTRY["emergency_card.wallet_apple_enabled"].default is False
    assert REGISTRY["emergency_card.wallet_google_enabled"].default is False
    assert REGISTRY["emergency_card.wallet_apple_enabled"].public is True


# --- Apple ----------------------------------------------------------------------------------------

def test_apple_pass_holds_only_the_default_fields_and_the_crisis_lines(harness, wallets):
    client, factory, codes = harness
    user, headers = _student(client, codes, factory)
    added = _add_apple(client, headers)
    assert added["passes"][0]["platform"] == "APPLE" and added["passes"][0]["fields"] == ["name", "blood", "contact"]
    url = "/api" + added["downloadPath"]
    assert url.startswith("/api/wallet/apple/download/")
    assert ALLERGY not in url and "Test" not in url
    files = _unzip(client.get(url).content)
    body = json.loads(files["pass.json"])
    text = files["pass.json"].decode()
    assert body["serialNumber"] == _passes(factory, user["id"])[0].serial
    assert body["webServiceURL"] == "https://studentkare.test/api/wallet/apple"
    assert "Test Member" in text and "blood.O+" in text and "+91 9876543210" in text
    assert ALLERGY not in text and CONDITION not in text
    back = {field["key"]: field["value"] for field in body["generic"]["backFields"]}
    assert back["call112"] == "112" and back["teleManas"] == "14416"
    # Single use: the link is gone once used.
    assert client.get(url).status_code == 404


def test_apple_opt_in_fields_appear_only_when_switched_on(harness, wallets):
    client, factory, codes = harness
    _user, headers = _student(client, codes, factory)
    url = "/api" + _add_apple(client, headers, ("blood", "allergies"))["downloadPath"]
    text = _unzip(client.get(url).content)["pass.json"].decode()
    assert ALLERGY in text
    assert CONDITION not in text and "Test Member" not in text and "9876543210" not in text


def test_pkpass_manifest_and_signature_verify(harness, wallets, credentials, tmp_path):
    client, factory, codes = harness
    _user, headers = _student(client, codes, factory)
    files = _unzip(client.get("/api" + _add_apple(client, headers)["downloadPath"]).content)
    assert {"pass.json", "manifest.json", "signature", "icon.png", "icon@2x.png", "icon@3x.png",
            "en.lproj/pass.strings", "hi.lproj/pass.strings", "te.lproj/pass.strings"} <= set(files)
    manifest = json.loads(files["manifest.json"])
    assert set(manifest) == set(files) - {"manifest.json", "signature"}
    for name, digest in manifest.items():
        assert hashlib.sha1(files[name]).hexdigest() == digest  # noqa: S324 — Apple's manifest format
    # The signature carries the pass certificate and the WWDR intermediate.
    subjects = {c.subject.rfc4514_string() for c in pkcs7.load_der_pkcs7_certificates(files["signature"])}
    assert f"CN=Pass Type ID: {PASS_TYPE}" in subjects and "CN=Test WWDR" in subjects
    if shutil.which("openssl") is None:
        pytest.skip("openssl not installed: structure checked, signature not verified")
    (tmp_path / "manifest.json").write_bytes(files["manifest.json"])
    (tmp_path / "signature").write_bytes(files["signature"])
    (tmp_path / "wwdr.pem").write_text(credentials["wwdr_pem"])
    result = subprocess.run(  # noqa: S603 — fixed argv on files written above
        ["openssl", "cms", "-verify", "-binary", "-inform", "DER", "-in", str(tmp_path / "signature"),  # noqa: S607
         "-content", str(tmp_path / "manifest.json"), "-CAfile", str(tmp_path / "wwdr.pem"), "-purpose", "any",
         "-out", str(tmp_path / "out")], capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stderr


def test_apple_web_service_needs_the_pass_token(harness, wallets):
    client, factory, codes = harness
    user, headers = _student(client, codes, factory)
    _add_apple(client, headers)
    row = _passes(factory, user["id"])[0]
    path = f"/api/wallet/apple/v1/devices/device-1/registrations/{PASS_TYPE}/{row.serial}"
    assert client.post(path, json={"pushToken": "push-1"}, headers={"Authorization": "ApplePass wrong"}).status_code == 401
    auth = {"Authorization": f"ApplePass {wallet_apple.auth_token(wallet_apple.config(), row.serial)}"}
    assert client.post(path, json={"pushToken": "push-1"}, headers=auth).status_code == 201
    assert client.post(path, json={"pushToken": "push-1"}, headers=auth).status_code == 200
    serials = client.get(f"/api/wallet/apple/v1/devices/device-1/registrations/{PASS_TYPE}")
    assert serials.json()["serialNumbers"] == [row.serial]
    latest = client.get(f"/api/wallet/apple/v1/passes/{PASS_TYPE}/{row.serial}", headers=auth)
    assert latest.status_code == 200 and latest.headers["content-type"] == wallet_apple.MIME_TYPE
    assert client.get(f"/api/wallet/apple/v1/passes/{PASS_TYPE}/{row.serial}").status_code == 401
    assert client.get("/api/wallet/emergency-card").json()["passes"][0]["inWallet"] is True


def test_profile_change_pushes_an_update_to_registered_devices(harness, wallets):
    client, factory, codes = harness
    user, headers = _student(client, codes, factory)
    _add_apple(client, headers)
    row = _passes(factory, user["id"])[0]
    auth = {"Authorization": f"ApplePass {wallet_apple.auth_token(wallet_apple.config(), row.serial)}"}
    client.post(f"/api/wallet/apple/v1/devices/d1/registrations/{PASS_TYPE}/{row.serial}", json={"pushToken": "tok-1"},
                headers=auth)
    wallets["apns"].clear()
    assert client.patch("/api/profile", headers=headers, json={"bloodGroup": "A-"}).status_code == 200
    assert wallets["apns"] == [["tok-1"]]
    after = _passes(factory, user["id"])[0]
    assert after.updated_at > row.updated_at and after.push_pending is False
    text = _unzip(client.get(f"/api/wallet/apple/v1/passes/{PASS_TYPE}/{row.serial}", headers=auth).content)["pass.json"]
    assert b"blood.A-" in text
    # A save that changes nothing on the pass pushes nothing.
    wallets["apns"].clear()
    assert client.patch("/api/profile", headers=headers, json={"hostelBlock": "B"}).status_code == 200
    assert wallets["apns"] == []


def test_failed_push_stays_queued_and_the_job_retries(harness, wallets):
    client, factory, codes = harness
    user, headers = _student(client, codes, factory)
    client.post("/api/wallet/emergency-card/google", headers=headers, json={"fields": ["name"], **_google_consent()})
    wallets["fail"] = True
    client.patch("/api/profile", headers=headers, json={"fullName": "Test Member Two"})
    row = _passes(factory, user["id"])[0]
    assert row.push_pending is True and row.push_attempts == 1
    wallets["fail"] = False
    with factory() as db:
        result = wallet_passes.run_job(db)
        db.commit()
    assert result["summary"]["sent"] == 1
    assert _passes(factory, user["id"])[0].push_pending is False
    assert wallets["google"][-1]["header"]["defaultValue"]["value"] == "Test Member Two"


def test_push_gives_up_with_an_ops_alert(harness, wallets, monkeypatch):
    client, factory, codes = harness
    user, headers = _student(client, codes, factory)
    client.post("/api/wallet/emergency-card/google", headers=headers, json={"fields": ["name"], **_google_consent()})
    wallets["fail"] = True
    real_setting = wallet_passes.setting
    monkeypatch.setattr(wallet_passes, "setting",
                        lambda key, db=None: 1 if key == "emergency_card.wallet_push_max_attempts" else real_setting(key, db))
    client.patch("/api/profile", headers=headers, json={"fullName": "Test Member Three"})
    with factory() as db:
        assert db.scalar(select(M.OpsEvent).where(M.OpsEvent.kind == wallet_passes.PUSH_GIVE_UP_KIND)) is not None
    assert _passes(factory, user["id"])[0].push_pending is False


# --- Google ---------------------------------------------------------------------------------------

def test_google_needs_consent_and_records_it_with_its_version(harness, wallets):
    client, factory, codes = harness
    user, headers = _student(client, codes, factory)
    refused = client.post("/api/wallet/emergency-card/google", headers=headers,
                          json={"fields": ["name"], "consentGranted": False,
                                "consentVersion": consent_ledger.WALLET_GOOGLE_CONSENT_VERSION})
    assert refused.status_code == 409 and refused.json()["detail"]["code"] == wallet_passes.CONSENT_REQUIRED
    stale = client.post("/api/wallet/emergency-card/google", headers=headers,
                        json={"fields": ["name"], "consentGranted": True, "consentVersion": "old"})
    assert stale.status_code == 409
    assert _passes(factory, user["id"]) == [] and wallets["google"] == []
    added = client.post("/api/wallet/emergency-card/google", headers=headers,
                        json={"fields": ["name", "blood", "conditions"], **_google_consent()})
    assert added.status_code == 200, added.text
    assert added.json()["googleConsent"]["version"] == consent_ledger.WALLET_GOOGLE_CONSENT_VERSION
    with factory() as db:
        record = db.scalars(select(M.ConsentRecord).where(M.ConsentRecord.purposes == ["WALLET_GOOGLE"])).one()
        assert record.version == consent_ledger.WALLET_GOOGLE_CONSENT_VERSION and not record.withdrawn_at
    body = json.dumps(wallets["google"][-1])
    assert CONDITION in body and ALLERGY not in body and "9876543210" not in body
    privacy = client.get("/api/privacy/consents").json()
    item = next(i for i in privacy["optional"] if i["purpose"] == "WALLET_GOOGLE")
    assert item["on"] is True and item["version"] == consent_ledger.WALLET_GOOGLE_CONSENT_VERSION


def test_google_failure_adds_nothing_and_records_nothing(harness, wallets):
    client, factory, codes = harness
    user, headers = _student(client, codes, factory)
    wallets["fail"] = True
    failed = client.post("/api/wallet/emergency-card/google", headers=headers, json={"fields": ["name"], **_google_consent()})
    assert failed.status_code == 502
    assert _passes(factory, user["id"]) == []
    with factory() as db:
        assert db.scalars(select(M.ConsentRecord).where(M.ConsentRecord.purposes == ["WALLET_GOOGLE"])).first() is None


def test_save_link_jwt_names_the_object_only(harness, wallets, credentials):
    client, factory, codes = harness
    user, headers = _student(client, codes, factory)
    added = client.post("/api/wallet/emergency-card/google", headers=headers,
                        json={"fields": ["name", "allergies"], **_google_consent()}).json()
    url = added["saveUrl"]
    assert url.startswith("https://pay.google.com/gp/v/save/")
    assert ALLERGY not in url and "Test Member" not in url
    token = url.rsplit("/", 1)[1]
    head, body, sig = token.split(".")
    pad = lambda s: s + "=" * (-len(s) % 4)  # noqa: E731
    claims = json.loads(base64.urlsafe_b64decode(pad(body)))
    serial = _passes(factory, user["id"])[0].serial
    assert json.loads(base64.urlsafe_b64decode(pad(head))) == {"alg": "RS256", "typ": "JWT"}
    assert claims["iss"] == "wallet@test-project.iam.gserviceaccount.com"
    assert claims["aud"] == "google" and claims["typ"] == "savetowallet"
    assert claims["origins"] == ["https://studentkare.test"]
    assert claims["payload"] == {"genericObjects": [{"id": f"3388000000012345678.{serial}"}]}
    credentials["google_key"].public_key().verify(base64.urlsafe_b64decode(pad(sig)), f"{head}.{body}".encode(),
                                                  padding.PKCS1v15(), hashes.SHA256())


def test_withdrawing_google_consent_revokes_the_google_pass(harness, wallets):
    client, factory, codes = harness
    user, headers = _student(client, codes, factory)
    client.post("/api/wallet/emergency-card/google", headers=headers, json={"fields": ["name", "allergies"], **_google_consent()})
    _add_apple(client, headers)
    withdrawn = client.post("/api/privacy/consents/WALLET_GOOGLE", json={"granted": False}, headers=headers)
    assert withdrawn.status_code == 200, withdrawn.text
    rows = {row.platform: row for row in _passes(factory, user["id"])}
    assert rows["GOOGLE"].status == "VOIDED" and rows["GOOGLE"].void_reason == wallet_passes.CONSENT_WITHDRAWN
    assert rows["APPLE"].status == "ACTIVE"
    last = wallets["google"][-1]
    assert last["state"] == "INACTIVE"
    assert ALLERGY not in json.dumps(last) and "Test Member" not in json.dumps(last)
    # It can't be turned back on from the privacy page.
    again = client.post("/api/privacy/consents/WALLET_GOOGLE", json={"granted": True}, headers=headers)
    assert again.status_code == 409


# --- revocation -------------------------------------------------------------------------------------

def test_deletion_request_voids_every_pass_and_the_copy_is_empty(harness, wallets):
    client, factory, codes = harness
    user, headers = _student(client, codes, factory)
    _add_apple(client, headers, ("name", "blood", "allergies"))
    client.post("/api/wallet/emergency-card/google", headers=headers, json={"fields": ["name"], **_google_consent()})
    row = next(r for r in _passes(factory, user["id"]) if r.platform == "APPLE")
    auth = {"Authorization": f"ApplePass {wallet_apple.auth_token(wallet_apple.config(), row.serial)}"}
    client.post(f"/api/wallet/apple/v1/devices/d1/registrations/{PASS_TYPE}/{row.serial}", json={"pushToken": "tok-9"},
                headers=auth)
    wallets["apns"].clear()
    assert client.post("/api/records/deletion-request", headers=headers).status_code == 200
    assert {(r.status, r.void_reason) for r in _passes(factory, user["id"])} == {("VOIDED", wallet_passes.ACCOUNT_DELETION)}
    assert wallets["apns"] == [["tok-9"]] and wallets["google"][-1]["state"] == "INACTIVE"
    voided = json.loads(_unzip(client.get(f"/api/wallet/apple/v1/passes/{PASS_TYPE}/{row.serial}", headers=auth).content)["pass.json"])
    assert voided["voided"] is True
    assert "Test Member" not in json.dumps(voided) and ALLERGY not in json.dumps(voided)
    with factory() as db:
        actions = {a.action for a in db.scalars(select(M.WorkflowAudit)).all()}
    assert "WALLET_PASS_VOIDED_ACCOUNT_DELETION" in actions


def test_removing_voids_only_that_wallet(harness, wallets):
    client, factory, codes = harness
    user, headers = _student(client, codes, factory)
    _add_apple(client, headers)
    client.post("/api/wallet/emergency-card/google", headers=headers, json={"fields": ["name"], **_google_consent()})
    removed = client.delete("/api/wallet/emergency-card/apple", headers=headers)
    assert removed.status_code == 200
    rows = {row.platform: row for row in _passes(factory, user["id"])}
    assert rows["APPLE"].status == "VOIDED" and rows["GOOGLE"].status == "ACTIVE"
    assert [p["platform"] for p in removed.json()["passes"]] == ["GOOGLE"]


def test_leaving_campus_voids_the_passes(harness, wallets):
    client, factory, codes = harness
    user, headers = _student(client, codes, factory)
    _add_apple(client, headers)
    with factory() as db:
        departure = M.CampusDeparture(id="dep-1", account_id=user["id"], university="Test University", reason="GRADUATING",
                                      destination="", effective_on="2026-01-01", status="SCHEDULED", created_at=0.0)
        db.add(departure)
        campus_departure.complete_departure(db, departure)
        db.commit()
    row = _passes(factory, user["id"])[0]
    assert (row.status, row.void_reason, row.push_pending) == ("VOIDED", wallet_passes.LEFT_CAMPUS, True)


def test_no_health_data_in_logs(harness, wallets, caplog):
    client, factory, codes = harness
    caplog.set_level(logging.DEBUG)
    _user, headers = _student(client, codes, factory)
    url = "/api" + _add_apple(client, headers, ("name", "allergies", "conditions"))["downloadPath"]
    client.get(url)
    client.post("/api/wallet/emergency-card/google", headers=headers,
                json={"fields": ["allergies", "conditions"], **_google_consent()})
    client.post("/api/records/deletion-request", headers=headers)
    assert ALLERGY not in caplog.text and CONDITION not in caplog.text


# --- Google Wallet API client (the network, faked at the transport) ---------------------------------

def test_google_client_signs_in_creates_the_class_and_inserts_a_new_object(monkeypatch, credentials):
    monkeypatch.setenv("APP_BASE_URL", "https://studentkare.test")
    monkeypatch.setenv("GOOGLE_WALLET_ISSUER_ID", "3388000000012345678")
    monkeypatch.setenv("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON", base64.b64encode(credentials["service_account"].encode()).decode())
    monkeypatch.setattr(wallet_google, "_token_cache", {})
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append((request.method, request.url.path))
        if request.url.host == "oauth2.googleapis.com":
            form = dict(x.split("=", 1) for x in request.content.decode().split("&"))
            claims = json.loads(base64.urlsafe_b64decode(form["assertion"].split(".")[1] + "=="))
            assert claims["scope"] == wallet_google.SCOPE and claims["aud"] == wallet_google.TOKEN_URL
            assert claims["exp"] - claims["iat"] == wallet_google.TOKEN_LIFETIME_SECONDS
            return httpx.Response(200, json={"access_token": "at", "expires_in": 3600})
        assert request.headers["Authorization"] == "Bearer at"
        if request.method in ("GET", "PUT"):
            return httpx.Response(404)
        return httpx.Response(200, json={})

    cfg = wallet_google.config()
    assert cfg is not None
    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        wallet_google.upsert_object(cfg, "abc", wallet_google.object_body(cfg, "abc", None, 0.0), client=client)
    assert calls == [("POST", "/token"), ("GET", f"/walletobjects/v1/genericClass/{cfg.class_id}"),
                     ("POST", "/walletobjects/v1/genericClass"), ("PUT", f"/walletobjects/v1/genericObject/{cfg.object_id('abc')}"),
                     ("POST", "/walletobjects/v1/genericObject")]


def test_apns_push_reports_gone_devices_and_raises_on_failure(monkeypatch, credentials):
    monkeypatch.setenv("APP_BASE_URL", "https://studentkare.test")
    monkeypatch.setenv("APPLE_WALLET_PASS_TYPE_ID", PASS_TYPE)
    monkeypatch.setenv("APPLE_WALLET_TEAM_ID", "TEAM123456")
    monkeypatch.setenv("APPLE_WALLET_CERT_PEM", credentials["pass_pem"])
    monkeypatch.setenv("APPLE_WALLET_KEY_PEM", credentials["pass_key_pem"])
    monkeypatch.setenv("APPLE_WALLET_WWDR_PEM", credentials["wwdr_pem"])
    monkeypatch.setenv("APPLE_WALLET_AUTH_SECRET", "a-test-secret-of-enough-length")
    cfg = wallet_apple.config()
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append((request.url.path, request.headers["apns-topic"], request.content))
        return httpx.Response(410 if request.url.path.endswith("gone") else 200)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        assert wallet_apple.push(cfg, ["ok", "gone"], client=client) == ["gone"]
    assert seen[0] == ("/3/device/ok", PASS_TYPE, b"{}")
    with httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(500))) as client, \
            pytest.raises(wallet_apple.AppleWalletError):
        wallet_apple.push(cfg, ["ok"], client=client)
    # The TLS client really loads the pass certificate (HTTP/2 needs h2 installed).
    wallet_apple.make_client(cfg).close()
