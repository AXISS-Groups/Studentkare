import logging

logger = logging.getLogger(__name__)

def compute_predictions(overall_score: int, ranked_actions: list) -> dict:
    """
    Generate time-based readiness predictions using existing ranked_actions data.
    
    Classification rules for action types by timeframe:
      - 7-day:  PHOTO, PROFILE, EDUCATION, RESUME, LINKEDIN
      - 30-day: SKILLS, PROJECT, PORTFOLIO, NETWORKING
      - 90-day: MOCK_INTERVIEW, CERTIFICATION, JOB_APPLICATION
    """
    timeframe_map = {
        "PHOTO":            7,
        "PROFILE":          7,
        "EDUCATION":        7,
        "RESUME":           7,
        "LINKEDIN":         7,
        "SKILLS":           30,
        "PROJECT":          30,
        "PORTFOLIO":        30,
        "NETWORKING":       30,
        "MOCK_INTERVIEW":   90,
        "CERTIFICATION":    90,
        "JOB_APPLICATION":  90,
    }

    base = overall_score
    gains_7d = 0
    gains_30d = 0
    gains_90d = 0
    action_details_7d = []
    action_details_30d = []
    action_details_90d = []

    for act in ranked_actions:
        m_type = str(act.get("type", "")).upper()
        gain = int(act.get("gain", 0))
        days = timeframe_map.get(m_type, 90)
        if days <= 7:
            gains_7d += gain
            action_details_7d.append({"type": m_type, "gain": gain, "title": act.get("title", "")})
        if days <= 30:
            gains_30d += gain
            action_details_30d.append({"type": m_type, "gain": gain, "title": act.get("title", "")})
        # 90-day includes all
        gains_90d += gain
        action_details_90d.append({"type": m_type, "gain": gain, "title": act.get("title", "")})

    pred_7d = min(100, base + gains_7d)
    pred_30d = min(100, base + gains_30d)
    pred_90d = min(100, base + gains_90d)

    improvement_7d = pred_7d - base
    improvement_30d = pred_30d - base
    improvement_90d = pred_90d - base

    return {
        "current": base,
        "predictions": {
            "7d":  {"score": pred_7d,  "gain": improvement_7d,  "actions": action_details_7d},
            "30d": {"score": pred_30d, "gain": improvement_30d, "actions": action_details_30d},
            "90d": {"score": pred_90d, "gain": improvement_90d, "actions": action_details_90d},
        }
    }


def estimate_placement_readiness(overall_score: int, skill_scores: dict, profile_pct: int) -> dict:
    """
    Estimate readiness for key career milestones based on current scores.
    Uses explainable threshold logic — no ML, no fabricated numbers.
    """
    tech = skill_scores.get("Technical Excellence", 0)
    career_prep = skill_scores.get("Career Preparation", 0)
    brand = skill_scores.get("Personal Brand", 0)
    industry = skill_scores.get("Industry Presence", 0)

    internship = _threshold_readiness("Internship Ready", [
        ("Technical Excellence >= 50", tech >= 50, 30),
        ("Career Preparation >= 40", career_prep >= 40, 30),
        ("Profile Completion >= 60%", profile_pct >= 60, 25),
        ("Personal Brand >= 40", brand >= 40, 15),
    ], overall_score)

    placement = _threshold_readiness("Placement Ready", [
        ("Technical Excellence >= 60", tech >= 60, 25),
        ("Career Preparation >= 50", career_prep >= 50, 25),
        ("Profile Completion >= 70%", profile_pct >= 70, 20),
        ("Personal Brand >= 50", brand >= 50, 15),
        ("Industry Presence >= 40", industry >= 40, 15),
    ], overall_score)

    interview = _threshold_readiness("Interview Ready", [
        ("Career Preparation >= 60", career_prep >= 60, 35),
        ("Technical Excellence >= 50", tech >= 50, 30),
        ("Professional Communication >= 50", skill_scores.get("Professional Communication", 0) >= 50, 20),
        ("Leadership & Collaboration >= 40", skill_scores.get("Leadership & Collaboration", 0) >= 40, 15),
    ], overall_score)

    return {
        "internship_readiness": internship,
        "placement_readiness": placement,
        "interview_readiness": interview,
    }


def simulate_goal_impact(current_readiness: int, enabled_actions: list, ranked_actions: list) -> dict:
    """
    Simulate the impact of completing specific actions without modifying the database.
    
    enabled_actions: list of action types the user has toggled ON in the simulator.
    ranked_actions: the full list of available ranked_actions from skill-intelligence.
    
    Returns dict with simulated score, breakdown per action, and total gain.
    """
    action_gain_map = {}
    for act in ranked_actions:
        m_type = str(act.get("type", "")).upper()
        action_gain_map[m_type] = {
            "gain": int(act.get("gain", 0)),
            "title": act.get("title", ""),
        }

    simulated = current_readiness
    breakdown = []
    enabled_set = set(t.upper() for t in enabled_actions)

    for act_type in enabled_actions:
        at = act_type.upper()
        info = action_gain_map.get(at, {"gain": 0, "title": act_type})
        gain = info["gain"]
        if gain > 0:
            breakdown.append({
                "type": at,
                "title": info["title"],
                "gain": gain,
                "simulated_score_before": simulated,
                "simulated_score_after": min(100, simulated + gain),
            })
            simulated += gain

    simulated = min(100, simulated)
    total_gain = simulated - current_readiness

    return {
        "current": current_readiness,
        "simulated": simulated,
        "total_gain": total_gain,
        "breakdown": breakdown,
    }


def _threshold_readiness(label: str, checks: list, overall_score: int) -> dict:
    """
    Evaluate readiness against a set of weighted threshold checks.
    checks: list of (description, bool_met, weight_pct)
    Returns dict with label, percentage, met_count, total_count, is_ready, details.
    """
    met = 0
    total = 0
    details = []
    for desc, is_met, weight in checks:
        total += weight
        if is_met:
            met += weight
        details.append({
            "criteria": desc,
            "met": is_met,
            "weight": weight,
        })

    percentage = round((met / total) * 100) if total > 0 else 0
    is_ready = met >= 70

    return {
        "label": label,
        "percentage": percentage,
        "is_ready": is_ready,
        "met_weight": met,
        "total_weight": total,
        "details": details,
    }
