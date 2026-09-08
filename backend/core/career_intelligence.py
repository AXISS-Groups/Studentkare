import os
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "student_alumni_db")
from db import client as _mongo
db = _mongo[DB_NAME]

# Define Career Paths and their core Dimensions with Weights
CAREER_PATHS = {
    "Frontend Engineer": {
        "weights": {"Technical Excellence": 60, "Career Preparation": 20, "Personal Brand": 20}
    },
    "Backend Engineer": {
        "weights": {"Technical Excellence": 60, "Career Preparation": 20, "Personal Brand": 20}
    },
    "Full Stack Engineer": {
        "weights": {"Technical Excellence": 65, "Career Preparation": 20, "Personal Brand": 15}
    },
    "Data Scientist": {
        "weights": {"Technical Excellence": 60, "Career Preparation": 20, "Industry Presence": 20}
    },
    "DevOps Engineer": {
        "weights": {"Technical Excellence": 60, "Career Preparation": 20, "Industry Presence": 20}
    },
    "Product Manager": {
        "weights": {"Professional Communication": 30, "Leadership & Collaboration": 30, "Industry Presence": 20, "Technical Excellence": 20}
    },
    "UI/UX Designer": {
        "weights": {"Technical Excellence": 50, "Professional Communication": 25, "Personal Brand": 25}
    }
}

def get_readiness_level(score: float) -> str:
    if score <= 20: return "Explorer"
    if score <= 40: return "Builder"
    if score <= 60: return "Developing Professional"
    if score <= 80: return "Career Ready"
    return "Industry Ready"

async def calculate_career_readiness(user_id: str) -> dict:
    """
    Calculate a holistic career readiness score (0-100) combining skills,
    profile completion, projects, and networking. Returns a dict.
    """
    try:
        from bson import ObjectId
        # Handle string or ObjectId
        query_id = ObjectId(user_id) if isinstance(user_id, str) and len(user_id) == 24 else user_id
        user = await db.users.find_one({"_id": query_id})
        if not user:
            return {"score": 0.0, "level": "Explorer"}
            
        # 1. Skill Points (0-60 points)
        from core.skill_score_engine import calculate_skill_scores
        scores = await calculate_skill_scores(str(user_id))
        
        technical = scores.get("Technical Excellence", 0)
        communication = scores.get("Professional Communication", 0)
        brand = scores.get("Personal Brand", 0)
        leadership = scores.get("Leadership & Collaboration", 0)
        career_prep = scores.get("Career Preparation", 0)
        industry = scores.get("Industry Presence", 0)
        
        weighted_skill_score = (
            technical * 0.35 +
            communication * 0.15 +
            brand * 0.15 +
            leadership * 0.10 +
            career_prep * 0.15 +
            industry * 0.10
        )
        
        # Beginner Acceleration
        if weighted_skill_score <= 25:
            multiplier = 1.5
        elif weighted_skill_score <= 50:
            multiplier = 1.2
        else:
            multiplier = 1.0
            
        adjusted_skill_score = weighted_skill_score * multiplier
        skill_points = (min(adjusted_skill_score, 100) / 100) * 60.0
        
        # 2. Profile Completion (0-15 points)
        # Check basic fields
        fields = ['full_name', 'email', 'institution', 'branch', 'bio', 'phone', 'location']
        filled = sum(1 for f in fields if user.get(f))
        profile_pct = (filled / len(fields)) * 100
        profile_points = (profile_pct / 100) * 15.0
        
        # 3. Resume Strength (0-10 points)
        resume_docs = user.get("resume_documents") or []
        has_resume = any(d.get("active") for d in resume_docs)
        resume_points = 10.0 if has_resume else 0.0
        
        # 4. Project Experience (0-10 points)
        projects = user.get("projects") or []
        project_points = min(len(projects) * 5.0, 10.0)
        
        # 5. Networking (0-5 points)
        connections = int(user.get("connections_made") or 0)
        networking_points = min(connections * 1.0, 5.0)
        
        total_score = skill_points + profile_points + resume_points + project_points + networking_points
        final_score = min(max(total_score, 0.0), 100.0)
        
        # Determine next level threshold for frontend progress bar
        current_level = get_readiness_level(final_score)
        level_thresholds = [
            (21, "Builder"),
            (41, "Developing Professional"),
            (61, "Career Ready"),
            (81, "Industry Ready"),
            (100, "Industry Ready"),
        ]
        next_level = "Industry Ready"
        next_threshold = 100
        for thresh, lvl in level_thresholds:
            if final_score < thresh:
                next_level = lvl
                next_threshold = thresh
                break
        
        return {
            "score": round(final_score, 1),
            "level": current_level,
            "next_level": next_level,
            "next_threshold": next_threshold,
            "breakdown": {
                "skill_points": round(skill_points, 2),
                "profile_points": round(profile_points, 2),
                "resume_points": round(resume_points, 2),
                "project_points": round(project_points, 2),
                "networking_points": round(networking_points, 2),
                "weighted_skill_score": round(weighted_skill_score, 2),
                "multiplier": multiplier,
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to calculate career readiness for {user_id}: {e}")
        return {"score": 0.0, "level": "Explorer", "next_level": "Builder", "next_threshold": 21}

async def detect_career_path(user_id: str) -> dict:
    """
    Infer the closest matching career paths using weighted path scoring.
    """
    cursor = db.user_skill_categories.find({"user_id": user_id})
    user_skills = await cursor.to_list(length=1000)
    
    # Extract all dimensions the user has from display_categories
    user_dimensions = set()
    for s in user_skills:
        dcs = s.get("display_categories", [])
        if not dcs and "display_category" in s:
            dcs = [s["display_category"]]
        for dc in dcs:
            user_dimensions.add(dc.lower())
    
    path_scores = []
    
    for path_name, data in CAREER_PATHS.items():
        weights = data["weights"]
        
        matched_weight = 0
        total_weight = sum(weights.values())
        missing = []
        
        for req_dim, w in weights.items():
            if req_dim.lower() in user_dimensions:
                matched_weight += w
            else:
                missing.append(req_dim)
                
        # Calculate percentage match
        match_pct = (matched_weight / total_weight) * 100 if total_weight > 0 else 0
        
        # Apply Confidence Threshold Status
        if match_pct < 30:
            status = "Emerging" # Actually, threshold rules say < 30 means DO NOT assign path
        elif match_pct < 60:
            status = "Emerging"
        elif match_pct < 80:
            status = "Developing"
        else:
            status = "Strong Match"
            
        path_scores.append({
            "path": path_name,
            "confidence": match_pct,
            "missing_skills": missing,
            "status": status
        })
        
    # Sort by highest confidence
    path_scores.sort(key=lambda x: x["confidence"], reverse=True)
    
    top_path = path_scores[0] if path_scores else None
    
    # Rule: Confidence <= 30% -> Do NOT assign a path
    if top_path and top_path["confidence"] <= 30:
        top_path = {
            "path": None,
            "label": "Career Path Still Emerging",
            "confidence": top_path["confidence"],
            "status": "Emerging",
            "missing_skills": top_path["missing_skills"]
        }
    
    return {
        "top_match": top_path,
        "all_paths": path_scores[:3]  # Return top 3 for UI
    }

async def snapshot_career_readiness(user_id: str) -> dict:
    """Event-driven snapshot taken whenever a user modifies their skills/profile."""
    readiness_data = await calculate_career_readiness(user_id)
    score = readiness_data["score"]
    
    doc = {
        "user_id": user_id,
        "readiness_score": score,
        "level": readiness_data["level"],
        "timestamp": datetime.now(timezone.utc)
    }
    await db.user_career_snapshots.insert_one(doc)
    return doc
