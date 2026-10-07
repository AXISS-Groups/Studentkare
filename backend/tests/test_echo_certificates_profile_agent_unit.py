"""
Unit tests for Echo Certificates, SA Account Check & Autonomous Profile Loop Agent.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.agents.echo_profile_loop_agent import echo_profile_loop_agent
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


@pytest.mark.anyio
async def test_echo_profile_loop_agent_status():
    """Verify EchoProfileLoopAgent status reporting and background loop toggle."""
    status = echo_profile_loop_agent.get_status()
    assert status["agent_name"] == "EchoProfileLoopAgent"
    assert "is_running" in status
    assert "total_cycles_executed" in status

    started = echo_profile_loop_agent.start_background_loop(interval_seconds=3600)
    assert started is True or echo_profile_loop_agent.get_status()["is_running"] is True

    stopped = echo_profile_loop_agent.stop_background_loop()
    assert stopped is True or echo_profile_loop_agent.get_status()["is_running"] is False


@pytest.mark.anyio
async def test_echo_profile_loop_agent_execute_cycle():
    """Verify execution cycle of EchoProfileLoopAgent with mocked DB cursor."""
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[
        {
            "id": "Echo-Test01",
            "email": "incomplete@snist.edu.in",
            "phone": "9876543210",
            "full_name": "Incomplete Student",
            "showcase_title": "HackWave 3.0",
            "slug": "hackwave-3",
        }
    ])
    mock_users_cursor = MagicMock()
    mock_users_cursor.__aiter__ = MagicMock(return_value=iter([]))

    with patch("services.agents.echo_profile_loop_agent.db.echo_registrations.find", return_value=mock_cursor), \
         patch("services.agents.echo_profile_loop_agent.db.users.find", return_value=mock_users_cursor), \
         patch("services.agents.echo_profile_loop_agent.send_email", new_callable=AsyncMock) as mock_send_email, \
         patch("services.agents.echo_profile_loop_agent.send_wa_message", new_callable=AsyncMock) as mock_send_wa, \
         patch("services.agents.echo_profile_loop_agent.db.echo_registrations.update_one", new_callable=AsyncMock):

        result = await echo_profile_loop_agent.execute_cycle(target_group="all_incomplete", channel="both")
        assert result["status"] == "success"
        assert result["processed_count"] >= 1
        assert "emails_sent" in result
        assert "whatsapp_sent" in result
        assert mock_send_email.called
        assert mock_send_wa.called
