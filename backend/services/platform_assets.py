"""Public brand-image repository. No query here touches clinical documents."""
import time
import uuid
from typing import Literal, get_args

from fastapi import HTTPException, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.settings_registry import setting
from services import integration_config, integration_secret_vault, security_scanner, upload_files

AssetType = Literal["logo", "favicon"]
ASSET_TYPES = frozenset(get_args(AssetType))
ASSET_MIMES = frozenset({upload_files.PNG, upload_files.JPEG, upload_files.WEBP, upload_files.ICO})


def _image(content: bytes) -> tuple[str, bytes]:
    mime = upload_files.sniff_mime(content)
    if mime in ASSET_MIMES:
        return mime, content
    if mime is None:
        sanitized = upload_files.sniff_and_sanitize_svg(content)
        if sanitized is not None:
            return upload_files.SVG, sanitized
    raise HTTPException(400, {"code": "PLATFORM_ASSET_INVALID_IMAGE"})


def upload(db: Session, asset_type: AssetType, file: UploadFile, actor_id: str) -> dict:
    if asset_type not in ASSET_TYPES:
        raise HTTPException(404, {"code": "PLATFORM_ASSET_NOT_FOUND"})
    max_bytes = setting("platform.asset_max_bytes", db)
    content = file.file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(413, {"code": "PLATFORM_ASSET_TOO_LARGE", "maxBytes": max_bytes})
    mime, content = _image(content)
    if len(content) > max_bytes:
        raise HTTPException(413, {"code": "PLATFORM_ASSET_TOO_LARGE", "maxBytes": max_bytes})
    if security_scanner.scan_file_for_viruses(content, allow_offline_bypass=False) is not True:
        raise HTTPException(503, {"code": "PLATFORM_ASSET_SCAN_FAILED"})

    version = uuid.uuid4().hex
    asset_url = f"/api/platform/asset/{asset_type}?v={version}"
    now = time.time()
    try:
        # Config, asset and audit share one transaction, unlike save_to_db().
        config_row = db.scalar(select(M.SystemSetting).where(
            M.SystemSetting.key == "integration:platform").with_for_update())
        config = dict(integration_config.INTEGRATIONS_DB["platform"])
        if config_row is not None:
            config.update(integration_secret_vault.decrypt_config(config_row.value))
        config[f"{asset_type}_url"] = asset_url
        stored = integration_secret_vault.encrypt_config(config)
        if config_row is None:
            db.add(M.SystemSetting(key="integration:platform", value=stored, updated_at=now))
        else:
            config_row.value, config_row.updated_at = stored, now

        asset = db.get(M.PlatformAsset, asset_type)
        if asset is None:
            asset = M.PlatformAsset(asset_type=asset_type)
            db.add(asset)
        asset.version, asset.mime_type, asset.content, asset.updated_at = version, mime, content, now
        db.add(M.WorkflowAudit(id=uuid.uuid4().hex, actor_id=actor_id,
                               action=f"PLATFORM_{asset_type.upper()}_UPLOADED",
                               resource_id=version, created_at=now))
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(503, {"code": "PLATFORM_ASSET_SAVE_FAILED"}) from None
    integration_config.INTEGRATIONS_DB["platform"].update(config)
    return {"success": True, "assetType": asset_type, "url": asset_url}


def read(db: Session, asset_type: AssetType) -> Response:
    if asset_type not in ASSET_TYPES:
        raise HTTPException(404, {"code": "PLATFORM_ASSET_NOT_FOUND"})
    asset = db.get(M.PlatformAsset, asset_type)
    max_bytes = setting("platform.asset_max_bytes", db)
    if asset is None or not asset.content or len(asset.content) > max_bytes:
        raise HTTPException(404, {"code": "PLATFORM_ASSET_NOT_FOUND"})
    mime, content = _image(asset.content)
    if mime != asset.mime_type or len(content) > max_bytes:
        raise HTTPException(404, {"code": "PLATFORM_ASSET_NOT_FOUND"})
    return Response(content=content, media_type=mime, headers={
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'none'; sandbox",
        "Cross-Origin-Resource-Policy": "same-origin",
    })
