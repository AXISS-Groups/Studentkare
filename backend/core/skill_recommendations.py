import os
import logging
from core.skill_analytics import generate_skill_analytics

logger = logging.getLogger(__name__)

async def generate_skill_recommendations(user_id: str) -> list[str]:
    """
    Generate actionable learning and career recommendations 
    based on the user's computed skill gaps and strengths.
    """
    analytics = await generate_skill_analytics(user_id)
    strengths = analytics.get("strengths", [])
    gaps = analytics.get("gaps", [])
    
    recs = []
    
    # Cross-reference logic based on requested examples
    if "Backend" in gaps or "technical_skills" in gaps:
        if "Frontend" in strengths or "Frontend Development" in strengths or "Frontend" in str(strengths):
            recs.extend([
                "Learn Node.js to complement your Frontend skills",
                "Build a full-stack REST API project",
                "Learn SQL fundamentals"
            ])
        else:
            recs.extend([
                "Start with foundational Backend concepts",
                "Learn Python or Node.js",
                "Build a simple database-backed app"
            ])
            
    if "interview_prep" in gaps:
        if "technical_skills" not in gaps and analytics["display_categories"].get("technical_skills", 0) > 60:
            recs.extend([
                "Practice Data Structures and Algorithms (DSA)",
                "Complete 5 mock interviews",
                "Review system design basics for senior roles"
            ])
        else:
            recs.extend([
                "Review common behavioral interview questions",
                "Draft your STAR method stories",
                "Complete a basic mock interview"
            ])
            
    if "networking" in gaps:
        recs.extend([
            "Connect with 5 alumni on LinkedIn",
            "Attend an upcoming industry webinar or local meetup",
            "Ask a mentor for a 15-minute coffee chat"
        ])
        
    if "communication" in gaps:
        recs.extend([
            "Practice writing clear technical documentation",
            "Present a small project to a peer or mentor",
            "Participate in a group discussion or forum"
        ])
        
    if "leadership" in gaps:
        recs.extend([
            "Volunteer to lead a small group project",
            "Mentor a junior student in a subject you know well",
            "Read a recommended book on engineering management"
        ])

    # Deduplicate and return top 3-5
    unique_recs = list(dict.fromkeys(recs))
    return unique_recs[:5]
