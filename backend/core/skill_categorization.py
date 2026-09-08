import os
import json
import logging
from enum import Enum
from datetime import datetime, timezone

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "student_alumni_db")
from db import client as _mongo
db = _mongo[DB_NAME]

class DisplayCategory(str, Enum):
    technical_excellence = "Technical Excellence"
    professional_communication = "Professional Communication"
    personal_brand = "Personal Brand"
    leadership_collaboration = "Leadership & Collaboration"
    career_preparation = "Career Preparation"
    industry_presence = "Industry Presence"

class Subcategory(str, Enum):
    frontend = "Frontend"
    backend = "Backend"
    cloud = "Cloud"
    devops = "DevOps"
    database = "Database"
    data_science = "Data Science"
    machine_learning = "Machine Learning"
    mobile_development = "Mobile Development"
    cyber_security = "Cyber Security"
    ui_ux = "UIUX"
    communication = "Communication"
    collaboration = "Collaboration"
    problem_solving = "Problem Solving"
    leadership = "Leadership"
    mentoring = "Mentoring"
    interview_practice = "Interview Practice"
    professional_networking = "Professional Networking"

class Source(str, Enum):
    manual = "manual"
    taxonomy = "taxonomy"
    ai = "ai"

SUBCATEGORY_TO_DISPLAY = {
    Subcategory.frontend: [DisplayCategory.technical_excellence],
    Subcategory.backend: [DisplayCategory.technical_excellence],
    Subcategory.cloud: [DisplayCategory.technical_excellence],
    Subcategory.devops: [DisplayCategory.technical_excellence],
    Subcategory.database: [DisplayCategory.technical_excellence],
    Subcategory.data_science: [DisplayCategory.technical_excellence],
    Subcategory.machine_learning: [DisplayCategory.technical_excellence],
    Subcategory.mobile_development: [DisplayCategory.technical_excellence],
    Subcategory.cyber_security: [DisplayCategory.technical_excellence],
    Subcategory.ui_ux: [DisplayCategory.technical_excellence],
    Subcategory.communication: [DisplayCategory.professional_communication, DisplayCategory.leadership_collaboration],
    Subcategory.collaboration: [DisplayCategory.leadership_collaboration, DisplayCategory.professional_communication],
    Subcategory.problem_solving: [DisplayCategory.technical_excellence, DisplayCategory.career_preparation],
    Subcategory.leadership: [DisplayCategory.leadership_collaboration],
    Subcategory.mentoring: [DisplayCategory.leadership_collaboration, DisplayCategory.professional_communication],
    Subcategory.interview_practice: [DisplayCategory.career_preparation],
    Subcategory.professional_networking: [DisplayCategory.industry_presence, DisplayCategory.personal_brand],
}

# Hardcoded taxonomy dictionary for common skills
TAXONOMY = {
    "react": Subcategory.frontend,
    "next.js": Subcategory.frontend,
    "node.js": Subcategory.backend,
    "docker": Subcategory.devops,
    "aws": Subcategory.cloud,
    "git": Subcategory.devops,
    "public speaking": Subcategory.communication,
    "teamwork": Subcategory.collaboration,
    "leadership": Subcategory.leadership,
    "python": Subcategory.backend,
    "java": Subcategory.backend,
    "mongodb": Subcategory.database,
    "postgresql": Subcategory.database,
    "communication": Subcategory.communication,
    "problem solving": Subcategory.problem_solving,
    "react native": Subcategory.mobile_development,
}

NLP_KEYWORD_MAP = {
    "speak": Subcategory.communication,
    "english": Subcategory.communication,
    "language": Subcategory.communication,
    "write": Subcategory.communication,
    "debate": Subcategory.communication,
    "present": Subcategory.communication,
    "ui": Subcategory.ui_ux,
    "ux": Subcategory.ui_ux,
    "design": Subcategory.ui_ux,
    "figma": Subcategory.ui_ux,
    "adobe": Subcategory.ui_ux,
    "react": Subcategory.frontend,
    "angular": Subcategory.frontend,
    "vue": Subcategory.frontend,
    "frontend": Subcategory.frontend,
    "html": Subcategory.frontend,
    "css": Subcategory.frontend,
    "node": Subcategory.backend,
    "django": Subcategory.backend,
    "python": Subcategory.backend,
    "java": Subcategory.backend,
    "backend": Subcategory.backend,
    "sql": Subcategory.database,
    "data": Subcategory.data_science,
    "machine learning": Subcategory.machine_learning,
    "ml": Subcategory.machine_learning,
    "ai": Subcategory.machine_learning,
    "cloud": Subcategory.cloud,
    "aws": Subcategory.cloud,
    "azure": Subcategory.cloud,
    "devops": Subcategory.devops,
    "docker": Subcategory.devops,
    "kubernetes": Subcategory.devops,
    "lead": Subcategory.leadership,
    "manage": Subcategory.leadership,
    "mentor": Subcategory.mentoring,
    "team": Subcategory.collaboration,
    "collab": Subcategory.collaboration,
    "problem": Subcategory.problem_solving,
    "interview": Subcategory.interview_practice,
    "network": Subcategory.professional_networking,
    "security": Subcategory.cyber_security,
    "cyber": Subcategory.cyber_security,
    "mobile": Subcategory.mobile_development,
    "ios": Subcategory.mobile_development,
    "android": Subcategory.mobile_development,
}

SKILL_WEIGHTS = {
    # ── Technical ──────────────────────────────────────────────────────────────
    "react": 10,
    "react native": 10,
    "next.js": 12,
    "typescript": 10,
    "javascript": 9,
    "node.js": 12,
    "python": 11,
    "java": 10,
    "c++": 10,
    "go": 11,
    "rust": 11,
    "docker": 10,
    "kubernetes": 12,
    "aws": 15,
    "gcp": 13,
    "azure": 13,
    "mongodb": 9,
    "postgresql": 10,
    "mysql": 9,
    "redis": 9,
    "graphql": 9,
    "html": 7,
    "css": 7,
    "git": 8,
    "sql": 9,
    "machine learning": 13,
    "deep learning": 14,
    "pytorch": 13,
    "tensorflow": 13,
    "data science": 12,
    "system design": 13,
    "figma": 9,
    # ── Communication ──────────────────────────────────────────────────────────
    "communication": 9,
    "public speaking": 9,
    "presentation": 8,
    "writing": 8,
    "technical writing": 9,
    # ── Soft Skills ────────────────────────────────────────────────────────────
    "problem solving": 8,
    "critical thinking": 8,
    "teamwork": 7,
    "adaptability": 7,
    "time management": 7,
    "collaboration": 7,
    # ── Leadership ─────────────────────────────────────────────────────────────
    "leadership": 9,
    "mentoring": 8,
    "management": 9,
    "project management": 9,
    # ── Interview Prep ─────────────────────────────────────────────────────────
    "interview prep": 9,
    "mock interviews": 9,
    "resume building": 8,
    # ── Networking ─────────────────────────────────────────────────────────────
    "networking": 7,
    "linkedin": 7,
}
DEFAULT_WEIGHT = 7

async def get_claude_chat(session_id: str, system_message: str):
    """Local helper to invoke emergentintegrations LLM."""
    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    from emergentintegrations.llm.chat import LlmChat
    return LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=system_message,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

async def categorize_skill(skill_name: str) -> dict:
    """Categorize a skill via taxonomy, DB cache, or AI fallback."""
    skill_lower = skill_name.lower().strip()
    
    # 1. Check Taxonomy
    if skill_lower in TAXONOMY:
        subcat = TAXONOMY[skill_lower]
        display = SUBCATEGORY_TO_DISPLAY[subcat]
        logger.info(f"[SkillCategorization] Skill={skill_name} Source=taxonomy Subcategory={subcat} Category={display} Confidence=1.0")
        return {"subcategory": subcat, "display_categories": display, "confidence": 1.0, "source": Source.taxonomy}
        
    # 2. Check DB Cache
    cached = await db.skill_taxonomy_cache.find_one({"skill_name": skill_lower})
    if cached:
        logger.info(f"[SkillCategorization] Skill={skill_name} Source={cached.get('source')} Subcategory={cached.get('subcategory')} Category={cached.get('display_categories')} Confidence={cached.get('confidence')} Cache=hit")
        return {
            "subcategory": cached.get("subcategory"), 
            "display_categories": cached.get("display_categories", cached.get("display_category", [DisplayCategory.technical_excellence])), 
            "confidence": cached.get("confidence", 0.9), 
            "source": cached.get("source", Source.ai)
        }
        
    # 2.5 NLP Fallback
    import re
    for kw, sub in NLP_KEYWORD_MAP.items():
        if re.search(r'\b' + re.escape(kw) + r'\b', skill_lower) or kw == skill_lower:
            display = SUBCATEGORY_TO_DISPLAY[sub]
            logger.info(f"[SkillCategorization] Skill={skill_name} Source=nlp Subcategory={sub} Category={display} Confidence=0.8")
            
            # Save to cache
            await db.skill_taxonomy_cache.update_one(
                {"skill_name": skill_lower},
                {"$set": {
                    "subcategory": sub,
                    "display_categories": display,
                    "confidence": 0.8,
                    "source": Source.taxonomy,
                    "updated_at": datetime.now(timezone.utc)
                }},
                upsert=True
            )
            return {"subcategory": sub, "display_categories": display, "confidence": 0.8, "source": Source.taxonomy}
            
    # 3. AI Fallback
    logger.info(f"[SkillCategorization] Skill={skill_name} Cache=miss")
    prompt = f"""Categorize the following skill.

Allowed Subcategories:
Frontend
Backend
Cloud
DevOps
Database
Data Science
Machine Learning
Mobile Development
Cyber Security
UIUX
Communication
Collaboration
Problem Solving
Leadership
Mentoring
Interview Practice
Professional Networking

Map the subcategory into one or more display categories:
Technical Excellence
Professional Communication
Personal Brand
Leadership & Collaboration
Career Preparation
Industry Presence

Return JSON only.
{{
"subcategory": "...",
"display_categories": ["..."],
"confidence": 0.95
}}

Skill:
{skill_name}"""

    subcategory = Subcategory.frontend
    display_categories = [DisplayCategory.technical_excellence]
    confidence = 0.5
    source = Source.ai
    
    if os.environ.get("EMERGENT_LLM_KEY"):
        try:
            from emergentintegrations.llm.chat import UserMessage
            sys_msg = "You are a skill classification engine. Return ONLY valid JSON."
            chat = await get_claude_chat(f"skill-cat-{skill_lower[:20]}", sys_msg)
            raw = await chat.send_message(UserMessage(text=prompt))
            text = (raw or "").strip()
            if text.startswith("```"):
                text = text.strip("`")
                if text.startswith("json"): text = text[4:]
                text = text.strip()
            data = json.loads(text)
            
            if data.get("subcategory") in [c.value for c in Subcategory]:
                subcategory = Subcategory(data["subcategory"])
            if data.get("display_categories"):
                display_categories = []
                for dc in data["display_categories"]:
                    if dc in [c.value for c in DisplayCategory]:
                        display_categories.append(DisplayCategory(dc))
                if not display_categories:
                    display_categories = [DisplayCategory.technical_excellence]
            confidence = float(data.get("confidence", 0.8))
        except Exception as e:
            logger.error(f"AI categorization failed for '{skill_name}': {e}")
            
    # Save to cache
    await db.skill_taxonomy_cache.update_one(
        {"skill_name": skill_lower},
        {"$set": {
            "subcategory": subcategory,
            "display_categories": display_categories,
            "confidence": confidence,
            "source": source,
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    logger.info(f"[SkillCategorization] Skill={skill_name} Source=ai Subcategory={subcategory} Category={display_categories} Confidence={confidence}")
    return {"subcategory": subcategory, "display_categories": display_categories, "confidence": confidence, "source": source}

async def sync_user_skills(user_id: str, skills: list):
    """Synchronize a user's skills array into the user_skill_categories collection."""
    if not skills:
        return
        
    for skill in skills:
        if not isinstance(skill, str):
            continue
            
        skill_lower = skill.lower().strip()
        # Check if already categorized for this user
        existing = await db.user_skill_categories.find_one({"user_id": user_id, "skill_name": skill_lower})
        if not existing:
            cat_data = await categorize_skill(skill)
            weight = SKILL_WEIGHTS.get(skill_lower, DEFAULT_WEIGHT)
            
            doc = {
                "user_id": user_id,
                "skill_name": skill_lower,
                "subcategory": cat_data["subcategory"],
                "display_categories": cat_data["display_categories"],
                "weight": weight,
                "confidence": cat_data["confidence"],
                "source": cat_data["source"],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            await db.user_skill_categories.insert_one(doc)
