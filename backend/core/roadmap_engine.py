from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List


class MilestoneType(str, Enum):
    RESUME = "RESUME"
    PROJECT = "PROJECT"
    PROFILE = "PROFILE"
    NETWORKING = "NETWORKING"
    SKILLS = "SKILLS"
    MOCK_INTERVIEW = "MOCK_INTERVIEW"
    PORTFOLIO = "PORTFOLIO"
    CERTIFICATION = "CERTIFICATION"
    JOB_APPLICATION = "JOB_APPLICATION"
    LINKEDIN = "LINKEDIN"

async def evaluate_roadmap_milestones(user: Dict[str, Any], milestones: List[Dict[str, Any]], db) -> List[Dict[str, Any]]:
    """
    Evaluates each milestone against the user's data and platform activity to automatically mark it complete.
    """
    user_id_str = str(user.get("_id", ""))

    # Pre-fetch counts for DB-dependent milestones to avoid sequential DB calls
    connections_count = None
    bookings_count = None
    applications_count = None

    for m in milestones:
        comp_val = m.get("completed")
        if isinstance(comp_val, str):
            comp_val = comp_val.lower() == "true"
            m["completed"] = comp_val

        m_type = m.get("milestone_type")
        is_done = False

        if m_type == MilestoneType.RESUME.value:
            is_done = len(user.get("resume_documents") or []) > 0 or bool((user.get("resume_url") or "").strip())

        elif m_type == MilestoneType.PROJECT.value:
            is_done = len(user.get("projects") or []) > 0

        elif m_type == MilestoneType.PROFILE.value:
            is_done = len((user.get("bio") or user.get("headline") or "").strip()) > 10

        elif m_type == MilestoneType.NETWORKING.value:
            if db is not None and user_id_str:
                if connections_count is None:
                    connections_count = await db.connections.count_documents({"$or": [{"from_id": user_id_str}, {"to_id": user_id_str}], "status": "accepted"})
                is_done = connections_count > 0

        elif m_type == MilestoneType.SKILLS.value:
            is_done = len(user.get("skills") or []) >= 3

        elif m_type == MilestoneType.MOCK_INTERVIEW.value:
            if db is not None and user_id_str:
                if bookings_count is None:
                    bookings_count = await db.bookings.count_documents({"student_id": user_id_str})
                is_done = bookings_count > 0

        elif m_type == MilestoneType.PORTFOLIO.value:
            is_done = bool((user.get("portfolio_url") or "").strip())

        elif m_type == MilestoneType.CERTIFICATION.value:
            is_done = len(user.get("certificates") or user.get("certifications") or []) > 0

        elif m_type == MilestoneType.JOB_APPLICATION.value:
            if db is not None and user_id_str:
                if applications_count is None:
                    applications_count = await db.applications.count_documents({"user_id": user_id_str})
                is_done = applications_count > 0
            else:
                is_done = len(user.get("applied_jobs") or []) > 0

        elif m_type == MilestoneType.LINKEDIN.value:
            is_done = bool((user.get("linkedin_url") or "").strip())

        if is_done:
            if not m.get("completed"):
                m["completed"] = True
                m["completed_at"] = datetime.now(timezone.utc).isoformat()
        else:
            m["completed"] = False
            m["completed_at"] = None

    for idx, m in enumerate(milestones, 1):
        m["id"] = f"m{idx}"

    return milestones


