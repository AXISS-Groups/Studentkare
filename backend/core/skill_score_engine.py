import os
import logging

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "student_alumni_db")
from db import client as _mongo
db = _mongo[DB_NAME]

CATEGORY_TARGETS = {
    "Technical Excellence": 100,
    "Professional Communication": 50,
    "Personal Brand": 50,
    "Leadership & Collaboration": 60,
    "Career Preparation": 50,
    "Industry Presence": 40,
}

async def calculate_skill_scores(user_id: str) -> dict:
    """
    Load all categorized skills for a user, group by display category, 
    sum weights, and normalize to 0-100 scale using CATEGORY_TARGETS.
    """
    cursor = db.user_skill_categories.find({"user_id": user_id})
    categories = await cursor.to_list(length=1000)
    
    # Initialize base scores
    earned_points = {
        "Technical Excellence": 0.0,
        "Professional Communication": 0.0,
        "Personal Brand": 0.0,
        "Leadership & Collaboration": 0.0,
        "Career Preparation": 0.0,
        "Industry Presence": 0.0
    }
    
    # Sum weights (weight * confidence)
    for cat in categories:
        display_categories = cat.get("display_categories", [])
        if not display_categories and "display_category" in cat:
            display_categories = [cat["display_category"]]
            
        weight = float(cat.get("weight", 5.0))
        confidence = float(cat.get("confidence", 1.0))
        points = weight * confidence
        
        for dc in display_categories:
            if dc in earned_points:
                earned_points[dc] += points
            
    # Normalize to 0-100 integer
    normalized = {}
    for key, val in earned_points.items():
        target = CATEGORY_TARGETS.get(key, 100)
        score_val = (val / target) * 100
        score_int = int(round(score_val))
        normalized[key] = min(100, max(0, score_int))
        
    return normalized
