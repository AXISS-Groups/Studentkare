"""
Alertmanager webhook receiver for Studentkare.
Receives alerts from Alertmanager and forwards to Slack via existing slack_notifier.
"""

import os
import hmac
import hashlib
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
    """Verify Alertmanager webhook signature."""
    if not secret:
        return True  # No secret configured, skip verification (dev only)
    expected = "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/webhook")
async def alertmanager_webhook(
    request: Request,
    payload: AlertmanagerPayload,
    x_alertmanager_signature: str = Header(None, alias="X-Alertmanager-Signature"),
):
    """
    Receive alerts from Alertmanager and forward to Slack.
    Reuses existing slack_notifier infrastructure with PHI blocklist and storm guard.
    """
    # Verify signature if secret is configured
    secret = os.getenv("ALERTMANAGER_WEBHOOK_SECRET", "")
    if secret:
        body = await request.body()
        if not x_alertmanager_signature or not verify_webhook_signature(body, x_alertmanager_signature, secret):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

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