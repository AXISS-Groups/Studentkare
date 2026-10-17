"""
Unit tests for profile completion (services.profile_service).
"""
from services.profile_service import compute_profile_completion


def test_compute_profile_completion_calculation():
    """Verify compute_profile_completion calculates exact percentage and items checklist."""
    incomplete_user = {
        "email": "test@snist.edu.in",
        "full_name": "Test Student",
        "role": "student",
    }
    res_incomplete = compute_profile_completion(incomplete_user)
    assert "percentage" in res_incomplete
    assert res_incomplete["percentage"] < 100
    assert len(res_incomplete["items"]) > 0

    complete_user = {
        "email": "student100@snist.edu.in",
        "full_name": "Completed Student",
        "role": "student",
        "institution": "Sreenidhi Institute",
        "branch": "CSE",
        "year": "IV Year",
        "board_or_university": "JNTUH",
        "skills": ["Python", "React", "Node"],
        "resume_url": "https://example.com/resume.pdf",
        "projects": [{"title": "Echo AI"}],
        "linkedin_url": "https://linkedin.com/in/test",
        "bio": "Enthusiastic SWE & AI builder",
        "face_image_base64": "data:image/png;base64,sample==",
    }
    res_complete = compute_profile_completion(complete_user)
    assert res_complete["percentage"] == 100
