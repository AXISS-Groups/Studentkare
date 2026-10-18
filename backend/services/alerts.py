"""
Alertmanager webhook receiver for Studentkare.
Receives alerts from Alertmanager and forwards to Slack via existing slack_notifier.
"""

import base64
import binascii
import hashlib
import hmac
import os
from typing import Dict, List

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from services.slack_notifier import post_ops_alert

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AlertLabel(BaseModel):
    alertname: str = ""
    severity: str = "info"
    instance: str = ""
    job: str = ""
    route: str = ""
    method: str = ""
    status_class: str = ""
    operation: str = ""
    kind: str = ""
    result: str = ""


class AlertAnnotation(BaseModel):
    summary: str = ""
    description: str = ""


class Alert(BaseModel):
    status: str = "firing"
    labels: AlertLabel = Field(default_factory=AlertLabel)
    annotations: AlertAnnotation = Field(default_factory=AlertAnnotation)
    startsAt: str = ""
    endsAt: str = ""
    generatorURL: str = ""
    fingerprint: str = ""


class AlertmanagerPayload(BaseModel):
    version: str = "4"
    groupKey: str = ""
    groupLabels: Dict[str, str] = Field(default_factory=dict)
    commonLabels: Dict[str, str] = Field(default_factory=dict)
    commonAnnotations: Dict[str, str] = Field(default_factory=dict)
    externalURL: str = ""
    alerts: List[Alert] = Field(default_factory=list)
    receiver: str = ""
    status: str = "firing"


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify an HMAC-SHA256 signature over the body. No secret never verifies."""
    if not secret or not signature:
        return False
    expected = "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_basic_auth(authorization: str, secret: str) -> bool:
    """Verify HTTP basic auth whose password is the secret.

    Alertmanager's webhook_configs cannot sign a body; http_config.basic_auth is
    how it authenticates (deploy/alertmanager.yml). The username is not checked.
    """
    if not secret or not authorization:
        return False
    scheme, _, encoded = authorization.partition(" ")
    if scheme.lower() != "basic":
        return False
    try:
        _user, _, password = base64.b64decode(encoded, validate=True).decode().partition(":")
    except (binascii.Error, UnicodeDecodeError):
        return False
    return hmac.compare_digest(password.encode(), secret.encode())


def _unauthenticated_allowed() -> bool:
    # Only an explicit development or testing environment may skip authentication;
    # unset or anything else counts as production (audit ENV-05).
    return os.getenv("APP_ENV", "").strip().lower() in {"development", "testing"}


@router.post("/webhook")
async def alertmanager_webhook(
    request: Request,
    payload: AlertmanagerPayload,
    x_alertmanager_signature: str = Header(None, alias="X-Alertmanager-Signature"),
    authorization: str = Header(None),
):
    """
    Receive alerts from Alertmanager and forward to Slack.
    Reuses existing slack_notifier infrastructure with PHI blocklist and storm guard.

    Fails closed: without ALERTMANAGER_WEBHOOK_SECRET the endpoint refuses every
    request outside development and testing.
    """
    secret = os.getenv("ALERTMANAGER_WEBHOOK_SECRET", "")
    if not secret:
        if not _unauthenticated_allowed():
            raise HTTPException(status_code=503, detail="Alert webhook is not configured.")
    else:
        body = await request.body()
        if not (verify_basic_auth(authorization or "", secret)
                or verify_webhook_signature(body, x_alertmanager_signature or "", secret)):
            raise HTTPException(status_code=401, detail="Invalid webhook credentials")

    # Process each alert
    for alert in payload.alerts:
        if alert.status == "resolved":
            continue  # Only forward firing alerts

        severity = alert.labels.severity.upper()
        alertname = alert.labels.alertname
        summary = alert.annotations.summary or f"Alert: {alertname}"
        description = alert.annotations.description or ""

        # Build Slack message
        emoji = ":rotating_light:" if severity == "CRITICAL" else ":warning:"
        text = f"{emoji} *{severity}*: {summary}"
        if description:
            text += f"\n_{description}_"

        # Add labels for context
        labels = []
        for k, v in alert.labels.model_dump().items():
            if v and k not in ("alertname", "severity"):
                labels.append(f"{k}={v}")
        if labels:
            text += f"\nLabels: {', '.join(labels)}"

        # Send via slack_notifier (fail-closed, PHI-blocked, storm-guarded)
        kind = f"alert_{alertname}"
        result = post_ops_alert(text, kind=kind, purpose="ops")

        # Log result
        if result.get("success"):
            print(f"[ALERTS] Slack alert sent: {alertname} ({severity})")
        else:
            print(f"[ALERTS] Slack alert failed: {alertname} - {result.get('reason')}")

    return {"status": "ok", "processed": len(payload.alerts)}


@router.get("/health")
async def alerts_health():
    """Health check for alerts endpoint."""
    return {"status": "healthy", "service": "alerts-webhook"}
