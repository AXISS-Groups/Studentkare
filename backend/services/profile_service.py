"""
services.profile_service — Profile completion computation.

Calculates a percentage completion and an itemised checklist for a user
profile.  Used by the Echo Profile Loop Agent to target incomplete profiles.
"""
from __future__ import annotations

from typing import Any, Dict, List

REQUIRED_FIELDS = [
    "email",
    "full_name",
    "role",
    "institution",
    "branch",
    "year",
    "board_or_university",
    "skills",
    "resume_url",
    "projects",
    "linkedin_url",
    "bio",
    "face_image_base64",
]


def compute_profile_completion(user: Dict[str, Any]) -> Dict[str, Any]:
    items: List[Dict[str, Any]] = []
    for field in REQUIRED_FIELDS:
        value = user.get(field)
        is_complete = bool(value) and (not isinstance(value, (list, dict)) or len(value) > 0)
        items.append({"field": field, "complete": is_complete})

    completed = sum(1 for i in items if i["complete"])
    percentage = round((completed / len(REQUIRED_FIELDS)) * 100, 1)
    return {"percentage": percentage, "items": items}
