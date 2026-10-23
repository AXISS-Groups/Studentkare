"""Push providers: the Expo push service (phones) and Web Push (browsers).

The one place push credentials are read from the environment (AGENTS.md
rule 11). Nothing here decides who gets what; services/push_dispatch.py does.

* **Expo** (``EXPO_ACCESS_TOKEN``): the app registers an Expo push token; Expo
  forwards to APNs and FCM with the credentials EAS holds for the app
  (``eas credentials``). The token here is the Expo account's access token with
  "enhanced push security" on, so a leaked device token cannot be pushed to by
  anyone else. Unset → phones get no push (said so in the admin view).
* **Web Push** (``VAPID_PRIVATE_KEY``, ``VAPID_PUBLIC_KEY``, ``VAPID_SUBJECT``):
  RFC 8030 delivery, RFC 8291 ``aes128gcm`` payload encryption and RFC 8292
  VAPID, implemented with ``cryptography`` (already pinned). The private key is
  the base64url raw 32-byte P-256 scalar that ``npx web-push generate-vapid-keys``
  prints, or a PEM. A public key that does not match the private key means Web
  Push is off (fail closed). Unset → browsers get no push.

A Web Push endpoint is a URL a browser handed us, so the server only ever POSTs
to an allowlisted push service host (no request to an arbitrary address).

Errors come back as closed codes, never provider text (rule 9).
"""
from __future__ import annotations

import base64
import json
import logging
import os
import time
from dataclasses import dataclass
from http import HTTPStatus
from urllib.parse import urlsplit

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

logger = logging.getLogger("services.push_providers")

# Protocol values (definitions, not tunables).
EXPO_SEND_URL = "https://exp.host/--/api/v2/push/send"
EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts"
EXPO_BATCH = 100            # Expo accepts at most 100 messages per request
EXPO_RECEIPT_BATCH = 1000   # and at most 1000 receipt ids
HTTP_TIMEOUT_SECONDS = 10.0
WEB_PUSH_RECORD_SIZE = 4096
VAPID_TOKEN_SECONDS = 12 * 3600
P256_POINT_BYTES = 65
P256_SCALAR_BYTES = 32
WEB_AUTH_SECRET_BYTES = 16
SALT_BYTES = 16

# Push services the browsers use. Exact hosts, then suffixes.
WEB_PUSH_HOSTS = frozenset({"fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"})
WEB_PUSH_HOST_SUFFIXES = (".notify.windows.com", ".push.apple.com", ".push.services.mozilla.com")

# Outcome codes the dispatcher understands.
OK = "ok"
RETRY = "retry"               # try again later (network, 429, 5xx)
GONE = "device_gone"          # the device or subscription no longer exists: revoke it
FAILED = "failed"             # this message can't be sent; don't retry
NOT_CONFIGURED = "not_configured"


def _b64url_decode(value: str) -> bytes:
    text = (value or "").strip()
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


# --- Expo --------------------------------------------------------------------------

def expo_token() -> str:
    return os.getenv("EXPO_ACCESS_TOKEN", "").strip()


def expo_configured() -> bool:
    return bool(expo_token())


@dataclass(frozen=True)
class ExpoResult:
    outcome: str
    ticket_id: str = ""
    code: str = ""


def _expo_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {expo_token()}", "Accept": "application/json",
            "Content-Type": "application/json"}


_EXPO_GONE = frozenset({"DeviceNotRegistered"})
_EXPO_RETRY = frozenset({"MessageRateExceeded"})


def _expo_ticket(ticket: object) -> ExpoResult:
    if not isinstance(ticket, dict):
        return ExpoResult(RETRY, code="expo_bad_response")
    if ticket.get("status") == "ok" and ticket.get("id"):
        return ExpoResult(OK, ticket_id=str(ticket["id"])[:80])
    details = ticket.get("details") if isinstance(ticket.get("details"), dict) else {}
    error = str(details.get("error", "") or "")
    if error in _EXPO_GONE:
        return ExpoResult(GONE, code="expo_device_not_registered")
    if error in _EXPO_RETRY:
        return ExpoResult(RETRY, code="expo_rate_exceeded")
    return ExpoResult(FAILED, code=f"expo_{error.lower()}"[:60] if error else "expo_error")


def send_expo(messages: list[dict], client: httpx.Client | None = None) -> list[ExpoResult]:
    """Send up to EXPO_BATCH messages; one result per message, in order."""
    if not expo_configured():
        return [ExpoResult(NOT_CONFIGURED, code="expo_not_configured") for _ in messages]
    if not messages:
        return []
    owner = client is None
    http = client or httpx.Client(timeout=HTTP_TIMEOUT_SECONDS)
    try:
        response = http.post(EXPO_SEND_URL, headers=_expo_headers(), content=json.dumps(messages[:EXPO_BATCH]))
    except httpx.HTTPError as exc:
        logger.warning("Expo push request failed (%s)", type(exc).__name__)
        return [ExpoResult(RETRY, code="expo_unreachable") for _ in messages]
    finally:
        if owner:
            http.close()
    if response.status_code == HTTPStatus.UNAUTHORIZED or response.status_code == HTTPStatus.FORBIDDEN:
        return [ExpoResult(FAILED, code="expo_credentials_rejected") for _ in messages]
    if response.status_code != HTTPStatus.OK:
        return [ExpoResult(RETRY, code=f"expo_http_{response.status_code}") for _ in messages]
    try:
        tickets = response.json().get("data", [])
    except ValueError:
        tickets = []
    if not isinstance(tickets, list) or len(tickets) != len(messages):
        return [ExpoResult(RETRY, code="expo_bad_response") for _ in messages]
    return [_expo_ticket(ticket) for ticket in tickets]


def expo_receipts(ticket_ids: list[str], client: httpx.Client | None = None) -> dict[str, ExpoResult] | None:
    """Receipts by ticket id; a missing id has no receipt yet. None when the call failed."""
    if not expo_configured() or not ticket_ids:
        return {}
    owner = client is None
    http = client or httpx.Client(timeout=HTTP_TIMEOUT_SECONDS)
    try:
        response = http.post(EXPO_RECEIPTS_URL, headers=_expo_headers(),
                             content=json.dumps({"ids": ticket_ids[:EXPO_RECEIPT_BATCH]}))
    except httpx.HTTPError as exc:
        logger.warning("Expo receipt request failed (%s)", type(exc).__name__)
        return None
    finally:
        if owner:
            http.close()
    if response.status_code != HTTPStatus.OK:
        return None
    try:
        data = response.json().get("data", {})
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None
    out: dict[str, ExpoResult] = {}
    for ticket_id, receipt in data.items():
        if isinstance(receipt, dict) and receipt.get("status") == "ok":
            out[str(ticket_id)] = ExpoResult(OK)
        else:
            out[str(ticket_id)] = _expo_ticket(receipt)
    return out


# --- Web Push -----------------------------------------------------------------------

@dataclass(frozen=True)
class VapidKeys:
    private_key: ec.EllipticCurvePrivateKey
    public_key_b64: str
    subject: str


def _load_private(raw: str) -> ec.EllipticCurvePrivateKey | None:
    text = (raw or "").strip()
    if not text:
        return None
    try:
        if "BEGIN" in text:
            key = serialization.load_pem_private_key(text.replace("\\n", "\n").encode(), password=None)
            return key if isinstance(key, ec.EllipticCurvePrivateKey) else None
        scalar = _b64url_decode(text)
        if len(scalar) != P256_SCALAR_BYTES:
            return None
        return ec.derive_private_key(int.from_bytes(scalar, "big"), ec.SECP256R1())
    except (ValueError, TypeError):
        return None


def _public_b64(key: ec.EllipticCurvePrivateKey) -> str:
    point = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return _b64url(point)


def vapid_keys() -> VapidKeys | None:
    """The VAPID key pair and subject, or None when Web Push is not (correctly) configured."""
    private = _load_private(os.getenv("VAPID_PRIVATE_KEY", ""))
    subject = os.getenv("VAPID_SUBJECT", "").strip()
    if private is None or not (subject.startswith("mailto:") or subject.startswith("https://")):
        return None
    derived = _public_b64(private)
    declared = os.getenv("VAPID_PUBLIC_KEY", "").strip().rstrip("=")
    if declared and declared != derived:
        logger.error("VAPID_PUBLIC_KEY does not match VAPID_PRIVATE_KEY; Web Push is off")
        return None
    return VapidKeys(private, derived, subject)


def web_push_configured() -> bool:
    return vapid_keys() is not None


def web_push_host_allowed(endpoint: str) -> bool:
    try:
        parts = urlsplit(endpoint)
    except ValueError:
        return False
    host = (parts.hostname or "").lower()
    if parts.scheme != "https" or not host or parts.username or parts.password or parts.port not in (None, 443):
        return False
    return host in WEB_PUSH_HOSTS or any(host.endswith(suffix) for suffix in WEB_PUSH_HOST_SUFFIXES)


def valid_subscription_keys(p256dh: str, auth: str) -> bool:
    try:
        point, secret = _b64url_decode(p256dh), _b64url_decode(auth)
    except (ValueError, TypeError):
        return False
    if len(point) != P256_POINT_BYTES or len(secret) != WEB_AUTH_SECRET_BYTES:
        return False
    try:
        ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), point)
    except ValueError:
        return False
    return True


def encrypt_payload(payload: bytes, p256dh: str, auth: str, *, salt: bytes | None = None,
                    server_key: ec.EllipticCurvePrivateKey | None = None) -> bytes:
    """RFC 8291 aes128gcm: one record, header = salt | rs | idlen | keyid."""
    ua_public = _b64url_decode(p256dh)
    auth_secret = _b64url_decode(auth)
    as_private = server_key or ec.generate_private_key(ec.SECP256R1())
    as_public = as_private.public_key().public_bytes(serialization.Encoding.X962,
                                                     serialization.PublicFormat.UncompressedPoint)
    shared = as_private.exchange(ec.ECDH(), ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), ua_public))
    ikm = HKDF(hashes.SHA256(), P256_SCALAR_BYTES, salt=auth_secret,
               info=b"WebPush: info\x00" + ua_public + as_public).derive(shared)
    record_salt = salt or os.urandom(SALT_BYTES)
    cek = HKDF(hashes.SHA256(), 16, salt=record_salt, info=b"Content-Encoding: aes128gcm\x00").derive(ikm)
    nonce = HKDF(hashes.SHA256(), 12, salt=record_salt, info=b"Content-Encoding: nonce\x00").derive(ikm)
    ciphertext = AESGCM(cek).encrypt(nonce, payload + b"\x02", None)   # 0x02: the last (only) record
    header = record_salt + WEB_PUSH_RECORD_SIZE.to_bytes(4, "big") + bytes([len(as_public)]) + as_public
    return header + ciphertext


def vapid_authorization(endpoint: str, keys: VapidKeys, now: float | None = None) -> str:
    parts = urlsplit(endpoint)
    claims = {"aud": f"{parts.scheme}://{parts.netloc}", "exp": int((now or time.time()) + VAPID_TOKEN_SECONDS),
              "sub": keys.subject}
    signing_input = (_b64url(json.dumps({"typ": "JWT", "alg": "ES256"}, separators=(",", ":")).encode()) + "."
                     + _b64url(json.dumps(claims, separators=(",", ":")).encode()))
    der = keys.private_key.sign(signing_input.encode(), ec.ECDSA(hashes.SHA256()))
    r, s = decode_dss_signature(der)
    signature = r.to_bytes(P256_SCALAR_BYTES, "big") + s.to_bytes(P256_SCALAR_BYTES, "big")
    return f"vapid t={signing_input}.{_b64url(signature)}, k={keys.public_key_b64}"


_WEB_GONE = frozenset({HTTPStatus.NOT_FOUND, HTTPStatus.GONE})
_WEB_RETRY = frozenset({HTTPStatus.TOO_MANY_REQUESTS, HTTPStatus.REQUEST_TIMEOUT})


def send_web_push(endpoint: str, p256dh: str, auth: str, message: dict, *, ttl: int, urgent: bool,
                  client: httpx.Client | None = None) -> str:
    """One Web Push. Returns an outcome code (OK / RETRY / GONE / FAILED / NOT_CONFIGURED)."""
    keys = vapid_keys()
    if keys is None:
        return NOT_CONFIGURED
    if not web_push_host_allowed(endpoint) or not valid_subscription_keys(p256dh, auth):
        return GONE
    body = encrypt_payload(json.dumps(message, ensure_ascii=False).encode(), p256dh, auth)
    headers = {"Authorization": vapid_authorization(endpoint, keys), "Content-Encoding": "aes128gcm",
               "Content-Type": "application/octet-stream", "TTL": str(int(ttl)),
               "Urgency": "high" if urgent else "normal"}
    owner = client is None
    http = client or httpx.Client(timeout=HTTP_TIMEOUT_SECONDS, follow_redirects=False)
    try:
        response = http.post(endpoint, headers=headers, content=body)
    except httpx.HTTPError as exc:
        logger.warning("Web Push request failed (%s)", type(exc).__name__)
        return RETRY
    finally:
        if owner:
            http.close()
    status = response.status_code
    if HTTPStatus.OK <= status < HTTPStatus.MULTIPLE_CHOICES:
        return OK
    if status in _WEB_GONE:
        return GONE
    if status in _WEB_RETRY or status >= HTTPStatus.INTERNAL_SERVER_ERROR:
        return RETRY
    return FAILED
