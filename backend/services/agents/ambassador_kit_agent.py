"""
services.agents.ambassador_kit_agent — AI Campus Ambassador Marketing Kit Generator.

Generates a complete marketing toolkit (referral URL, 3 social posts, talking
points) for a campus ambassador.
"""
from __future__ import annotations

import os
from typing import List
from pydantic import BaseModel, Field

from services.integration_config import LiveSetting

APP_DOMAIN = LiveSetting("app_domain", "studentkare.co")
BRAND_NAME = LiveSetting("brand_name", "StudentKare")


class AmbassadorKitRequest(BaseModel):
    ambassador_name: str
    college_name: str
    ambassador_code: str


class AmbassadorKitResponse(BaseModel):
    referral_url: str
    posts: List[str] = Field(default_factory=list)
    talking_points: List[str] = Field(default_factory=list)


class AmbassadorKitAgent:
    async def generate_toolkit(self, req: AmbassadorKitRequest) -> AmbassadorKitResponse:
        base = os.environ.get("APP_BASE_URL", "http://localhost:3000").rstrip("/")
        referral_url = f"{base}/ambassador/{req.ambassador_code}?ref={req.ambassador_code}"
        posts = [
            f"Excited to be a {req.college_name} ambassador for {BRAND_NAME}! #{str(BRAND_NAME).replace(' ', '')}",
            f"Join the alumni network with code {req.ambassador_code} and unlock mentorship.",
            f"From {req.college_name} to top firms — your alumni network starts here.",
        ]
        talking_points = [
            f"Ambassador {req.ambassador_name} from {req.college_name}",
            "Free mentorship, events and career resources",
            "Exclusive ECHO 2026 showcase opportunities",
        ]
        return AmbassadorKitResponse(referral_url=referral_url, posts=posts, talking_points=talking_points)


ambassador_kit_agent = AmbassadorKitAgent()
