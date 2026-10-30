"""Apple Wallet: the emergency card as a signed .pkpass, and update pushes (APNs).

Plan docs/plans/tier1-emergency-card-wallet-2026-10-24.md. Called only by
services/wallet_passes.py, which decides what goes on a pass.

Configuration, read in this one place (never committed; docs/guides/wallet-passes.md):

* ``APPLE_WALLET_PASS_TYPE_ID``  the Pass Type ID (``pass.co.studentkare.emergency``)
* ``APPLE_WALLET_TEAM_ID``       the Apple Developer team id
* ``APPLE_WALLET_CERT_PEM``      the Pass Type ID certificate, PEM (or base64 of the PEM)
* ``APPLE_WALLET_KEY_PEM``       its private key, PEM (or base64 of the PEM)
* ``APPLE_WALLET_KEY_PASSWORD``  the key's password, if it has one
* ``APPLE_WALLET_WWDR_PEM``      Apple's WWDR intermediate certificate (G4), PEM (or base64)
* ``APPLE_WALLET_AUTH_SECRET``   a random secret; each pass's web-service token is an HMAC of
                                  its serial under it, so no token is stored
* ``APP_BASE_URL``               must be https: Apple Wallet only calls an https web service

Anything missing or unreadable → ``config()`` is None and Apple Wallet is not offered
(fail closed). Nothing here logs a pass's content, a token or a push token.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import os
import ssl
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path

import httpx
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.serialization import pkcs7
from PIL import Image

from core import wallet_copy as C

PASS_TYPE_ENV = "APPLE_WALLET_PASS_TYPE_ID"  # noqa: S105 — variable names, not secrets
TEAM_ENV = "APPLE_WALLET_TEAM_ID"
CERT_ENV = "APPLE_WALLET_CERT_PEM"
KEY_ENV = "APPLE_WALLET_KEY_PEM"
KEY_PASSWORD_ENV = "APPLE_WALLET_KEY_PASSWORD"  # noqa: S105
WWDR_ENV = "APPLE_WALLET_WWDR_PEM"
AUTH_SECRET_ENV = "APPLE_WALLET_AUTH_SECRET"  # noqa: S105
BASE_URL_ENV = "APP_BASE_URL"

# PassKit protocol values (definitions, not tunables).
WEB_SERVICE_PATH = "/api/wallet/apple"
APNS_URL = "https://api.push.apple.com/3/device/{token}"
APNS_GONE = 410
APNS_TIMEOUT_SECONDS = 10.0
MIME_TYPE = "application/vnd.apple.pkpass"
AUTH_SCHEME = "ApplePass"
MIN_AUTH_SECRET_BYTES = 16
# icon.png is required by Wallet; 29 pt at 1x/2x/3x. Drawn from the brand mark the
# server already ships for the newsroom (content/newsroom/sk-mark.png).
ICON_SIZES = {"icon.png": 29, "icon@2x.png": 58, "icon@3x.png": 87}
MARK = Path(__file__).resolve().parents[1] / "content" / "newsroom" / "sk-mark.png"


class AppleWalletError(RuntimeError):
    """Apple Wallet could not be reached or refused a push. Never carries pass content."""


@dataclass(frozen=True)
class AppleConfig:
    pass_type_id: str
    team_id: str
    cert: x509.Certificate
    key: object
    wwdr: x509.Certificate
    auth_secret: bytes
    web_service_url: str
    cert_pem: bytes
    key_pem: bytes
    key_password: bytes | None


def _pem(name: str) -> bytes | None:
    raw = os.getenv(name, "").strip()
    if not raw:
        return None
    if raw.startswith("-----BEGIN"):
        return raw.encode()
    try:
        decoded = base64.b64decode(raw, validate=True)
    except ValueError:
        return None
    return decoded if decoded.lstrip().startswith(b"-----BEGIN") else None


def config() -> AppleConfig | None:
    """The Apple Wallet credentials, or None when any is missing or unreadable."""
    pass_type = os.getenv(PASS_TYPE_ENV, "").strip()
    team = os.getenv(TEAM_ENV, "").strip()
    secret = os.getenv(AUTH_SECRET_ENV, "").strip().encode()
    base = os.getenv(BASE_URL_ENV, "").strip().rstrip("/")
    cert_pem, key_pem, wwdr_pem = _pem(CERT_ENV), _pem(KEY_ENV), _pem(WWDR_ENV)
    password = os.getenv(KEY_PASSWORD_ENV, "").encode() or None
    if not (pass_type and team and cert_pem and key_pem and wwdr_pem) or len(secret) < MIN_AUTH_SECRET_BYTES:
        return None
    if not base.startswith("https://"):
        return None
    try:
        cert = x509.load_pem_x509_certificate(cert_pem)
        wwdr = x509.load_pem_x509_certificate(wwdr_pem)
        key = serialization.load_pem_private_key(key_pem, password=password)
    except (ValueError, TypeError):
        return None
    return AppleConfig(pass_type_id=pass_type, team_id=team, cert=cert, key=key, wwdr=wwdr, auth_secret=secret,
                       web_service_url=f"{base}{WEB_SERVICE_PATH}", cert_pem=cert_pem, key_pem=key_pem,
                       key_password=password)


def auth_token(cfg: AppleConfig, serial: str) -> str:
    """The pass's web-service token: derived, never stored (Apple requires ≥ 16 characters)."""
    return hmac.new(cfg.auth_secret, f"apple-wallet:{serial}".encode(), hashlib.sha256).hexdigest()


def token_matches(cfg: AppleConfig, serial: str, header: str | None) -> bool:
    if not header or not header.startswith(f"{AUTH_SCHEME} "):
        return False
    return hmac.compare_digest(header[len(AUTH_SCHEME) + 1:].strip(), auth_token(cfg, serial))


# --- the pass ------------------------------------------------------------------------------

def _field(key: str, label: str, value: str, **extra) -> dict:
    return {"key": key, "label": label, "value": value, **extra}


def pass_json(cfg: AppleConfig, serial: str, content: dict | None, updated_at: float) -> dict:
    """pass.json. ``content`` is wallet_passes.PassContent.as_dict(), or None for a voided pass.

    Labels and fixed values are keys localised by the ``.lproj/pass.strings`` files;
    the student's own data is shown as it is.
    """
    base = {
        "formatVersion": 1,
        "passTypeIdentifier": cfg.pass_type_id,
        "teamIdentifier": cfg.team_id,
        "serialNumber": serial,
        "authenticationToken": auth_token(cfg, serial),
        "webServiceURL": cfg.web_service_url,
        "organizationName": C.ORGANIZATION,
        "description": C.text("pass.description"),
        "sharingProhibited": True,
    }
    if content is None:
        return {**base, "voided": True, "generic": {
            "primaryFields": [_field("removed", "pass.description", "value.removed")],
        }}
    primary, secondary, auxiliary = [], [], []
    back = [
        _field("call112", "label.call112", C.EMERGENCY_NUMBER, dataDetectorTypes=["PKDataDetectorTypePhoneNumber"]),
        _field("teleManas", "label.teleManas", C.TELE_MANAS_NUMBER,
               dataDetectorTypes=["PKDataDetectorTypePhoneNumber"]),
    ]
    if content.get("name") is not None:
        primary.append(_field("name", "label.name", content["name"]))
    if content.get("blood") is not None:
        secondary.append(_field("blood", "label.blood", f"blood.{content['blood']}" if content["blood"] else "value.notSet"))
    contact = content.get("contact")
    if contact is not None:
        value = " · ".join(part for part in (contact["name"], contact["phone"]) if part) or "value.notSet"
        secondary.append(_field("contact", "label.contact", value))
        if contact["phone"]:
            back.append(_field("contactPhone", "label.contact", value, dataDetectorTypes=["PKDataDetectorTypePhoneNumber"]))
    for key in ("allergies", "conditions"):
        if content.get(key) is not None:
            auxiliary.append(_field(key, f"label.{key}", ", ".join(content[key]) or "value.notSet"))
    if content.get("medicines") is not None:
        back.append(_field("medicines", "label.medicines", ", ".join(content["medicines"]) or "value.notSet"))
    back.append(_field("updated", "label.updated", _iso(updated_at), dateStyle="PKDateStyleMedium",
                       timeStyle="PKDateStyleShort"))
    back.append(_field("about", "label.about", "value.about"))
    return {**base, "generic": {
        "headerFields": [_field("title", "pass.title", "value.call112")],
        "primaryFields": primary, "secondaryFields": secondary, "auxiliaryFields": auxiliary, "backFields": back,
    }}


def _iso(at: float) -> str:
    from datetime import UTC, datetime

    return datetime.fromtimestamp(at, UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def pass_strings(locale: str) -> bytes:
    """``<locale>.lproj/pass.strings``: every fixed word in that language (UTF-16, as Apple asks)."""
    def esc(value: str) -> str:
        return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    lines = [f'"{esc(key)}" = "{esc(C.text(key, locale))}";' for key in sorted(C.COPY)]
    return ("\n".join(lines) + "\n").encode("utf-16")


def _icons() -> dict[str, bytes]:
    mark = Image.open(MARK).convert("RGBA")
    out = {}
    for name, side in ICON_SIZES.items():
        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        copy = mark.copy()
        copy.thumbnail((side, side), Image.Resampling.LANCZOS)
        canvas.paste(copy, ((side - copy.width) // 2, (side - copy.height) // 2), copy)
        buffer = io.BytesIO()
        canvas.save(buffer, format="PNG")
        out[name] = buffer.getvalue()
    return out


def sign_manifest(cfg: AppleConfig, manifest: bytes) -> bytes:
    """The detached PKCS#7 signature of manifest.json: pass certificate + WWDR chain."""
    return (pkcs7.PKCS7SignatureBuilder()
            .set_data(manifest)
            .add_signer(cfg.cert, cfg.key, hashes.SHA256())
            .add_certificate(cfg.wwdr)
            .sign(serialization.Encoding.DER, [pkcs7.PKCS7Options.DetachedSignature, pkcs7.PKCS7Options.Binary]))


def build_pkpass(cfg: AppleConfig, serial: str, content: dict | None, updated_at: float) -> bytes:
    """The signed .pkpass (a zip of pass.json, images, strings, manifest.json, signature)."""
    files: dict[str, bytes] = {"pass.json": json.dumps(pass_json(cfg, serial, content, updated_at),
                                                       ensure_ascii=False).encode()}
    files.update(_icons())
    for locale in C.LOCALES:
        files[f"{locale}.lproj/pass.strings"] = pass_strings(locale)
    manifest = json.dumps({name: hashlib.sha1(data).hexdigest() for name, data in files.items()},  # noqa: S324 — Apple's manifest format is SHA-1
                          sort_keys=True).encode()
    files["manifest.json"] = manifest
    files["signature"] = sign_manifest(cfg, manifest)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in files.items():
            archive.writestr(name, data)
    return buffer.getvalue()


# --- update pushes (APNs) --------------------------------------------------------------------

def _tls_context(cfg: AppleConfig) -> ssl.SSLContext:
    context = ssl.create_default_context()
    with tempfile.TemporaryDirectory() as folder:
        cert_path, key_path = Path(folder) / "cert.pem", Path(folder) / "key.pem"
        cert_path.write_bytes(cfg.cert_pem)
        key_path.write_bytes(cfg.key_pem)
        cert_path.chmod(0o600)
        key_path.chmod(0o600)
        context.load_cert_chain(str(cert_path), str(key_path), password=cfg.key_password)
    return context


def make_client(cfg: AppleConfig) -> httpx.Client:
    return httpx.Client(http2=True, verify=_tls_context(cfg), timeout=APNS_TIMEOUT_SECONDS)


def push(cfg: AppleConfig, push_tokens: list[str], client: httpx.Client | None = None) -> list[str]:
    """Tell each device a pass changed (empty payload). Returns the tokens Apple says are gone.

    Raises AppleWalletError if any push failed for another reason, so the caller retries.
    """
    gone: list[str] = []
    failed = 0
    own = client is None
    http = client or make_client(cfg)
    try:
        for token in push_tokens:
            try:
                response = http.post(APNS_URL.format(token=token), content=b"{}",
                                     headers={"apns-topic": cfg.pass_type_id, "apns-push-type": "background",
                                              "apns-priority": "5"})
            except httpx.HTTPError:
                failed += 1
                continue
            if response.status_code == APNS_GONE:
                gone.append(token)
            elif not response.is_success:
                failed += 1
    finally:
        if own:
            http.close()
    if failed:
        raise AppleWalletError(f"{failed} of {len(push_tokens)} Apple Wallet update pushes failed")
    return gone
