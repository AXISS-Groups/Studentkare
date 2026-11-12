"""Public upload/read, scanner/transaction denials and the clinical boundary."""
import io
import time
from unittest.mock import Mock

import pytest
from fastapi import HTTPException, UploadFile
from sqlalchemy import select

from core import workflow_models as M
from services import integration_config, platform_assets, security_scanner

PNG = b"\x89PNG\r\n\x1a\n" + b"fixture"
SVG = b'<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h10v10z"/></svg>'


@pytest.fixture
def assets(super_admin_client, monkeypatch):
    from app.main import app
    from services.workflow_auth import workflow_db

    client, headers = super_admin_client
    db = next(app.dependency_overrides[workflow_db]())
    monkeypatch.setitem(integration_config.INTEGRATIONS_DB, "platform", {
        **integration_config.INTEGRATIONS_DB["platform"], "logo_url": "", "favicon_url": "",
    })
    scanner = Mock(return_value=True)
    monkeypatch.setattr(security_scanner, "scan_file_for_viruses", scanner)
    yield client, headers, db, scanner
    db.close()


@pytest.mark.parametrize("kind,content,mime", [
    ("logo", PNG, "image/png"),
    ("favicon", b"\x00\x00\x01\x00fixture", "image/x-icon"),
    ("logo", b"\xff\xd8\xfffixture", "image/jpeg"),
    ("logo", b"RIFF0000WEBPfixture", "image/webp"),
    ("logo", SVG, "image/svg+xml"),
])
def test_uploaded_asset_is_public_from_its_own_table(assets, kind, content, mime):
    client, headers, db, scanner = assets
    response = client.post(f"/api/admin/platform/asset/{kind}", headers=headers,
                           files={"file": ("untrusted-name.html", content, "text/html")})
    assert response.status_code == 200, response.text
    db.expire_all()
    asset = db.get(M.PlatformAsset, kind)
    assert asset is not None and asset.mime_type == mime
    assert db.scalar(select(M.Document)) is None
    assert db.get(M.SystemSetting, "integration:platform").value[f"{kind}_url"] == response.json()["url"]
    assert db.scalar(select(M.WorkflowAudit).where(
        M.WorkflowAudit.action == f"PLATFORM_{kind.upper()}_UPLOADED")).resource_id == asset.version
    scanner.assert_called_once_with(asset.content, allow_offline_bypass=False)
    client.cookies.clear()
    got = client.get(response.json()["url"])
    assert got.status_code == 200 and got.content == asset.content
    assert got.headers["content-type"] == mime
    assert got.headers["x-content-type-options"] == "nosniff"
    assert "sandbox" in got.headers["content-security-policy"]
    assert got.headers["cache-control"] == "no-store"


def test_replacement_keeps_asset_kinds_and_configuration_separate(assets):
    client, headers, db, _ = assets
    urls = []
    for kind, content in [("logo", PNG), ("favicon", PNG + b"icon"), ("logo", PNG + b"new")]:
        response = client.post(f"/api/admin/platform/asset/{kind}", headers=headers,
                               files={"file": ("same.png", content, "image/png")})
        assert response.status_code == 200, response.text
        urls.append(response.json()["url"])
    db.expire_all()
    assert len(db.scalars(select(M.PlatformAsset)).all()) == 2
    assert urls[0] != urls[2]
    assert client.get(urls[2]).content == PNG + b"new"
    assert client.get(urls[1]).content == PNG + b"icon"
    stored = db.get(M.SystemSetting, "integration:platform").value
    assert stored["logo_url"] == urls[2] and stored["favicon_url"] == urls[1]


@pytest.mark.parametrize("content", [b"", b"<html>payload</html>", b"%PDF-1.7", b"II*\x00bad", b"0000ftypheic"])
def test_unsupported_bytes_never_reach_scanner_or_storage(assets, content):
    client, headers, db, scanner = assets
    response = client.post("/api/admin/platform/asset/logo", headers=headers,
                           files={"file": ("logo.png", content, "image/png")})
    assert response.status_code == 400
    scanner.assert_not_called()
    assert db.scalar(select(M.PlatformAsset)) is None


def test_size_is_read_from_registry_and_caps_the_read(assets, monkeypatch):
    _, _, db, scanner = assets
    monkeypatch.setattr(platform_assets, "setting", lambda key, session: 8)
    stream = io.BytesIO(PNG + b"oversize")
    with pytest.raises(HTTPException) as error:
        platform_assets.upload(db, "logo", UploadFile(file=stream, filename="logo.png"), "admin")
    assert error.value.status_code == 413 and stream.tell() == 9
    scanner.assert_not_called()


def test_sanitized_output_is_also_size_capped(assets, monkeypatch):
    _, _, db, scanner = assets
    monkeypatch.setattr(platform_assets, "setting", lambda key, session: 8)
    monkeypatch.setattr(platform_assets.upload_files, "sniff_and_sanitize_svg", lambda content: b"x" * 9)
    with pytest.raises(HTTPException) as error:
        platform_assets.upload(db, "logo", UploadFile(file=io.BytesIO(b"<svg/>")), "admin")
    assert error.value.status_code == 413
    scanner.assert_not_called()


@pytest.mark.parametrize("result", [False, None])
def test_unverified_scan_does_not_publish(assets, result):
    client, headers, db, scanner = assets
    scanner.return_value = result
    response = client.post("/api/admin/platform/asset/logo", headers=headers,
                           files={"file": ("a.png", PNG, "image/png")})
    assert response.status_code == 503
    assert db.scalar(select(M.PlatformAsset)) is None
    assert integration_config.INTEGRATIONS_DB["platform"]["logo_url"] == ""


def test_scanner_failure_keeps_the_existing_asset_and_config(assets):
    client, headers, db, scanner = assets
    first = client.post("/api/admin/platform/asset/logo", headers=headers,
                        files={"file": ("a.png", PNG, "image/png")})
    scanner.side_effect = HTTPException(503, {"code": "SCANNER_OFFLINE"})
    failed = client.post("/api/admin/platform/asset/logo", headers=headers,
                         files={"file": ("b.png", PNG + b"new", "image/png")})
    assert failed.status_code == 503
    db.expire_all()
    assert db.get(M.PlatformAsset, "logo").content == PNG
    assert integration_config.INTEGRATIONS_DB["platform"]["logo_url"] == first.json()["url"]


def test_database_failure_rolls_back_without_exposing_parameters(assets, monkeypatch):
    _, _, db, _ = assets
    monkeypatch.setattr(db, "commit", Mock(side_effect=RuntimeError("private-upload-parameters")))
    with pytest.raises(HTTPException) as error:
        platform_assets.upload(db, "logo", UploadFile(file=io.BytesIO(PNG)), "admin")
    assert error.value.status_code == 503
    assert "private-upload-parameters" not in repr(error.value.detail)
    assert db.scalar(select(M.PlatformAsset)) is None
    assert db.get(M.SystemSetting, "integration:platform") is None
    assert integration_config.INTEGRATIONS_DB["platform"]["logo_url"] == ""


def test_public_reader_never_uses_a_vault_row_even_with_asset_title(assets):
    client, _, db, _ = assets
    db.add(M.Document(id="asset_logo_fake", account_id="admin", category="ASSET",
                      title="Platform logo", filename="private.svg", mime_type="image/svg+xml",
                      content=SVG + b"private-record", created_at=time.time()))
    db.commit()
    client.cookies.clear()
    assert client.get("/api/platform/asset/logo").status_code == 404
    assert client.get("/api/platform/asset/asset_logo_fake").status_code == 422


def test_unauthenticated_and_student_uploads_are_denied(assets):
    from services.workflow_auth import authenticated_user

    client, headers, db, scanner = assets
    client.cookies.clear()
    assert client.post("/api/admin/platform/asset/logo", files={"file": ("a.png", PNG)}).status_code == 401
    from app.main import app

    app.dependency_overrides[authenticated_user] = lambda: {"id": "student", "role": "STUDENT"}
    assert client.post("/api/admin/platform/asset/logo", headers=headers,
                       files={"file": ("a.png", PNG)}).status_code == 403
    scanner.assert_not_called()
    assert db.scalar(select(M.PlatformAsset)) is None


def test_reader_rechecks_stored_type_and_strips_active_svg(assets):
    client, _, db, _ = assets
    db.add(M.PlatformAsset(asset_type="logo", version="fixture", mime_type="text/html",
                           content=PNG, updated_at=time.time()))
    db.commit()
    assert client.get("/api/platform/asset/logo").status_code == 404
    asset = db.get(M.PlatformAsset, "logo")
    asset.mime_type = "image/svg+xml"
    asset.content = b'<svg xmlns:s="http://www.w3.org/2000/svg"><s:script>payload()</s:script><path d="M0 0"/></svg>'
    db.commit()
    got = client.get("/api/platform/asset/logo")
    assert got.status_code == 200 and b"script" not in got.content and b"payload" not in got.content


def test_platform_asset_is_classified_without_commerce_or_clinical_grants():
    from core import rule_l

    assert rule_l.TABLE_PLANES[M.PlatformAsset.__tablename__] == rule_l.PLATFORM
    for role in rule_l.GROUP_ROLES:
        assert M.PlatformAsset.__tablename__ not in rule_l.GRANT_MATRIX[role]
