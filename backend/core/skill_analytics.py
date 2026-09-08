import os
import logging

logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "student_alumni_db")
from db import client as _mongo
from core.skill_score_engine import calculate_skill_scores

db = _mongo[DB_NAME]

async def generate_skill_analytics(user_id: str) -> dict:
    """
    Generate an analytics report of the user's skills, identifying
    subcategories they are strong in, and display categories they lack.
    """
    scores = await calculate_skill_scores(user_id)
    
    # Analyze subcategories specifically to find top strengths
    cursor = db.user_skill_categories.find({"user_id": user_id})
    categories = await cursor.to_list(length=1000)
    
    sub_scores = {}
    for cat in categories:
        sub = cat.get("subcategory")
        if not sub:
            continue
        weight = float(cat.get("weight", 5.0))
        confidence = float(cat.get("confidence", 1.0))
        sub_scores[sub] = sub_scores.get(sub, 0.0) + (weight * confidence)
        
    # Strengths are subcategories with high accumulated weight
    strengths = [sub for sub, score in sorted(sub_scores.items(), key=lambda x: x[1], reverse=True) if score >= 10.0]
    # Fallback if no subcategory reaches threshold
    if not strengths and sub_scores:
        strengths = [max(sub_scores.items(), key=lambda x: x[1])[0]]
        
    # Gaps are display categories with scores under 40
    gaps = [cat for cat, score in scores.items() if score < 40]
    
    return {
        "display_categories": scores,
        "subcategories": sub_scores,
        "strengths": strengths,
        "gaps": gaps,
        "recommendations": []  # To be filled by recommendation engine
    }
