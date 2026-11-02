"""Google Wallet: the emergency card as a Generic pass, written through the Wallet API.

Plan docs/plans/tier1-emergency-card-wallet-2026-10-24.md. Called only by
services/wallet_passes.py, which decides what goes on a pass and checks consent.

The pass object is written server-to-server first, so the "save" link the student
opens is a signed JWT that names the object id and nothing else: no health data is
ever in a URL. Google stores the object, so adding one needs the student's explicit
consent (purpose WALLET_GOOGLE in services/consent_ledger.py).

Configuration, read in this one place (never committed; docs/guides/wallet-passes.md):

* ``GOOGLE_WALLET_ISSUER_ID``             the Google Wallet issuer id (digits)
* ``GOOGLE_WALLET_SERVICE_ACCOUNT_JSON``  the service-account key JSON (or base64 of it)
* ``APP_BASE_URL``                        the origin allowed to show the save button

Anything missing or unreadable → ``config()`` is None and Google Wallet is not offered.
Nothing here logs pass content or a token.
"""
from __future__ import annotations

import base64
import json
import os
import threading
import time
from dataclasses import dataclass

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

from core import wallet_copy as C

ISSUER_ENV = "GOOGLE_WALLET_ISSUER_ID"
SERVICE_ACCOUNT_ENV = "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON"
BASE_URL_ENV = "APP_BASE_URL"

# Google Wallet protocol values (definitions, not tunables).
API = "https://walletobjects.googleapis.com/walletobjects/v1"
TOKEN_URL = "https://oauth2.googleapis.com/token"  # noqa: S105 — an endpoint, not a secret
SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer"
SAVE_URL = "https://pay.google.com/gp/v/save/{jwt}"
CLASS_SUFFIX = "studentkare_emergency_card"
TOKEN_LIFETIME_SECONDS = 3600
TOKEN_REFRESH_MARGIN_SECONDS = 120
HTTP_TIMEOUT_SECONDS = 10.0
NOT_FOUND = 404
CONFLICT = 409
LANGUAGE_TAGS = {"en": "en-IN", "hi": "hi-IN", "te": "te-IN"}


class GoogleWalletError(RuntimeError):
    """The Wallet API could not be reached or refused a write. Never carries pass content."""


@dataclass(frozen=True)
class GoogleConfig:
    issuer_id: str
    client_email: str
    key: rsa.RSAPrivateKey
    origin: str

    @property
    def class_id(self) -> str:
        return f"{self.issuer_id}.{CLASS_SUFFIX}"

    def object_id(self, serial: str) -> str:
        return f"{self.issuer_id}.{serial}"


def config() -> GoogleConfig | None:
    issuer = os.getenv(ISSUER_ENV, "").strip()
    raw = os.getenv(SERVICE_ACCOUNT_ENV, "").strip()
    origin = os.getenv(BASE_URL_ENV, "").strip().rstrip("/")
    if not issuer.isdigit() or not raw or not origin.startswith("https://"):
        return None
    if not raw.startswith("{"):
        try:
            raw = base64.b64decode(raw, validate=True).decode()
        except ValueError:
            return None
    try:
        account = json.loads(raw)
        key = serialization.load_pem_private_key(account["private_key"].encode(), password=None)
        email = str(account["client_email"])
    except (ValueError, KeyError, TypeError):
        return None
    if not isinstance(key, rsa.RSAPrivateKey) or "@" not in email:
        return None
    return GoogleConfig(issuer_id=issuer, client_email=email, key=key, origin=origin)


# --- JWTs (RS256) ------------------------------------------------------------------------------

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def sign_jwt(cfg: GoogleConfig, claims: dict) -> str:
    header = _b64(json.dumps({"alg": "RS256", "typ": "JWT"}, separators=(",", ":")).encode())
    body = _b64(json.dumps(claims, separators=(",", ":")).encode())
    signature = cfg.key.sign(f"{header}.{body}".encode(), padding.PKCS1v15(), hashes.SHA256())
    return f"{header}.{body}.{_b64(signature)}"


def save_claims(cfg: GoogleConfig, serial: str, now: float | None = None) -> dict:
    """The "save to Google Wallet" JWT: the object id only (its content is already at Google)."""
    return {"iss": cfg.client_email, "aud": "google", "typ": "savetowallet", "iat": int(now or time.time()),
            "origins": [cfg.origin], "payload": {"genericObjects": [{"id": cfg.object_id(serial)}]}}


def save_url(cfg: GoogleConfig, serial: str) -> str:
    return SAVE_URL.format(jwt=sign_jwt(cfg, save_claims(cfg, serial)))


_token_lock = threading.Lock()
_token_cache: dict[str, tuple[str, float]] = {}


def access_token(cfg: GoogleConfig, client: httpx.Client) -> str:
    """An OAuth access token for the Wallet API from the service account (JWT bearer grant)."""
    with _token_lock:
        cached = _token_cache.get(cfg.client_email)
        if cached and cached[1] - TOKEN_REFRESH_MARGIN_SECONDS > time.time():
            return cached[0]
    now = int(time.time())
    assertion = sign_jwt(cfg, {"iss": cfg.client_email, "scope": SCOPE, "aud": TOKEN_URL, "iat": now,
                               "exp": now + TOKEN_LIFETIME_SECONDS})
    try:
        response = client.post(TOKEN_URL, data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                                                "assertion": assertion})
    except httpx.HTTPError as error:
        raise GoogleWalletError("Google sign-in for the Wallet API could not be reached") from error
    if not response.is_success:
        raise GoogleWalletError(f"Google sign-in for the Wallet API refused ({response.status_code})")
    data = response.json()
    token = str(data.get("access_token", ""))
    with _token_lock:
        _token_cache[cfg.client_email] = (token, now + float(data.get("expires_in", TOKEN_LIFETIME_SECONDS)))
    return token


def make_client() -> httpx.Client:
    return httpx.Client(timeout=HTTP_TIMEOUT_SECONDS)


# --- the pass -----------------------------------------------------------------------------------

def localized(key: str) -> dict:
    words = C.translations(key)
    return {"defaultValue": {"language": LANGUAGE_TAGS[C.DEFAULT_LOCALE], "value": words[C.DEFAULT_LOCALE]},
            "translatedValues": [{"language": LANGUAGE_TAGS[loc], "value": words[loc]}
                                 for loc in C.LOCALES if loc != C.DEFAULT_LOCALE]}


def _module(module_id: str, label_key: str, body: str | None = None, body_key: str | None = None) -> dict:
    out = {"id": module_id, "header": C.text(label_key), "localizedHeader": localized(label_key)}
    if body_key:
        out.update(body=C.text(body_key), localizedBody=localized(body_key))
    else:
        out["body"] = body or C.text("value.notSet")
    return out


def object_body(cfg: GoogleConfig, serial: str, content: dict | None, updated_at: float) -> dict:
    """The genericObject. ``content`` None → INACTIVE with every detail removed."""
    base = {"id": cfg.object_id(serial), "classId": cfg.class_id, "cardTitle": localized("pass.title")}
    if content is None:
        return {**base, "state": "INACTIVE", "header": localized("pass.description"),
                "textModulesData": [_module("removed", "pass.description", body_key="value.removed")],
                "linksModuleData": {"uris": []}}
    modules = []
    if content.get("blood") is not None:
        blood = content["blood"]
        modules.append(_module("blood", "label.blood", body_key=f"blood.{blood}" if blood else "value.notSet"))
    contact = content.get("contact")
    if contact is not None:
        modules.append(_module("contact", "label.contact",
                               " · ".join(part for part in (contact["name"], contact["phone"]) if part) or None))
    for key in ("allergies", "conditions", "medicines"):
        if content.get(key) is not None:
            modules.append(_module(key, f"label.{key}", ", ".join(content[key]) or None))
    from datetime import UTC, datetime

    modules.append(_module("updated", "label.updated", datetime.fromtimestamp(updated_at, UTC).strftime("%Y-%m-%d")))
    modules.append(_module("about", "label.about", body_key="value.about"))
    uris = [{"id": "call112", "uri": f"tel:{C.EMERGENCY_NUMBER}", "description": C.text("value.call112")},
            {"id": "teleManas", "uri": f"tel:{C.TELE_MANAS_NUMBER}", "description": C.text("value.teleManas")}]
    if contact is not None and contact["phone"]:
        uris.append({"id": "contact", "uri": f"tel:{contact['phone'].replace(' ', '')}",
                     "description": contact["name"] or C.text("label.contact")})
    header = content["name"] if content.get("name") else C.text("pass.description")
    return {**base, "state": "ACTIVE", "header": {"defaultValue": {"language": LANGUAGE_TAGS["en"], "value": header}},
            "textModulesData": modules, "linksModuleData": {"uris": uris}}


def _request(client: httpx.Client, token: str, method: str, path: str, body: dict | None = None) -> httpx.Response:
    try:
        return client.request(method, f"{API}{path}", json=body, headers={"Authorization": f"Bearer {token}"})
    except httpx.HTTPError as error:
        raise GoogleWalletError("The Google Wallet API could not be reached") from error


def ensure_class(cfg: GoogleConfig, client: httpx.Client, token: str) -> None:
    found = _request(client, token, "GET", f"/genericClass/{cfg.class_id}")
    if found.is_success:
        return
    if found.status_code != NOT_FOUND:
        raise GoogleWalletError(f"Google Wallet class lookup refused ({found.status_code})")
    made = _request(client, token, "POST", "/genericClass", {"id": cfg.class_id})
    if not made.is_success and made.status_code != CONFLICT:
        raise GoogleWalletError(f"Google Wallet class insert refused ({made.status_code})")


def upsert_object(cfg: GoogleConfig, serial: str, body: dict, client: httpx.Client | None = None) -> None:
    """Write the object: update if it exists, insert otherwise."""
    own = client is None
    http = client or make_client()
    try:
        token = access_token(cfg, http)
        ensure_class(cfg, http, token)
        path = f"/genericObject/{cfg.object_id(serial)}"
        updated = _request(http, token, "PUT", path, body)
        if updated.status_code == NOT_FOUND:
            updated = _request(http, token, "POST", "/genericObject", body)
        if not updated.is_success:
            raise GoogleWalletError(f"Google Wallet object write refused ({updated.status_code})")
    finally:
        if own:
            http.close()


def has_users(cfg: GoogleConfig, serial: str, client: httpx.Client | None = None) -> bool:
    """Whether someone saved the object to their wallet (Wallet API ``hasUsers``)."""
    own = client is None
    http = client or make_client()
    try:
        token = access_token(cfg, http)
        found = _request(http, token, "GET", f"/genericObject/{cfg.object_id(serial)}")
        if not found.is_success:
            raise GoogleWalletError(f"Google Wallet object read refused ({found.status_code})")
        return bool(found.json().get("hasUsers"))
    finally:
        if own:
            http.close()
