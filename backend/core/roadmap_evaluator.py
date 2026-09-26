from datetime import datetime, timezone

from core.career_intelligence import db
from core.skill_score_engine import calculate_skill_scores


async def evaluate_roadmap_progress(user_id: str) -> dict:
    """
    Evaluates the roadmap milestones dynamically based on verified backend user state.
    """
    # Fetch user data
    from bson import ObjectId

    # Handle user_id as string or ObjectId
    try:
        uid = ObjectId(user_id)
    except Exception:
        uid = user_id

    # Fallback querying by string if ObjectId fails or is not used consistently
    user = await db.users.find_one({"_id": uid})
    if not user:
        user = await db.users.find_one({"_id": str(uid)})

    if not user:
        return None

    roadmap = await db.career_roadmaps.find_one({"user_id": str(user_id)})
    if not roadmap or not roadmap.get("weekly_plan"):
        return roadmap

    changed = False

    # Calculate profile completion dynamically
    fields = ['full_name', 'email', 'institution', 'branch', 'bio', 'phone', 'location']
    filled = sum(1 for f in fields if user.get(f))
    profile_completion = (filled / len(fields)) * 100

    # Skills
    skill_scores = None

    for item in roadmap["weekly_plan"]:
        if item.get("completed"):
            continue

        m_type = item.get("milestone_type")
        if not m_type:
            continue

        is_completed = False

        if m_type == "RESUME":
            is_completed = len(user.get("resume_documents") or []) > 0
        elif m_type == "PROFILE":
            is_completed = profile_completion >= 80
        elif m_type in ("PROJECT", "PORTFOLIO"):
            is_completed = len(user.get("projects") or []) >= 1
        elif m_type == "NETWORKING":
            is_completed = int(user.get("connections_made") or 0) >= 5
        elif m_type == "CERTIFICATION":
            is_completed = len(user.get("certifications") or []) >= 1
        elif m_type == "MOCK_INTERVIEW":
            is_completed = int(user.get("mock_interviews_completed") or 0) >= 1
        elif m_type == "JOB_APPLICATION":
            is_completed = int(user.get("applications_count") or 0) >= 3
        elif m_type == "SKILLS":
            if skill_scores is None:
                skill_scores = await calculate_skill_scores(str(user_id))
            is_completed = skill_scores.get("technical_skills", 0) >= 50
        elif m_type == "LINKEDIN":
            is_completed = bool(user.get("linkedin_url"))

        if is_completed:
            item["completed"] = True
            item["completed_at"] = datetime.now(timezone.utc).isoformat()
            changed = True

    if changed:
        completed_indices = [i for i, item in enumerate(roadmap["weekly_plan"]) if item.get("completed")]
        roadmap["milestones_completed"] = completed_indices
        await db.career_roadmaps.update_one(
            {"_id": roadmap["_id"]},
            {"$set": {
                "weekly_plan": roadmap["weekly_plan"],
                "milestones_completed": completed_indices
            }}
        )

    return roadmap
