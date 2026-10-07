"""Routing Agent: classifies queries into RAG, FAQ, or ESCALATE.

Tests cover rule-based matching, crisis bypass, and model fallback independently.
"""

import pytest

from services.agents.routing_agent import RoutingAgent


def test_faq_keyword_match():
    agent = RoutingAgent()
    result = agent.route("I want to book an appointment")
    assert result == ("FAQ", "appointment")


def test_rag_keyword_match():
    agent = RoutingAgent()
    result = agent.route("I have a headache and fever")
    assert result[0] == "RAG"


def test_crisis_bypass_overrides_everything():
    agent = RoutingAgent()
    result = agent.route("any random text here", is_crisis=True)
    assert result == ("ESCALATE", None)


def test_model_fallback_returns_valid_category():
    agent = RoutingAgent()
    result = agent.route("can you tell me a joke")
    assert result[0] in ["RAG", "FAQ", "ESCALATE"]


def test_model_fallback_with_mock_llm(monkeypatch):
    from unittest.mock import MagicMock

    from services.agents import routing_agent

    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(content="ESCALATE")
    monkeypatch.setattr(routing_agent, "llm", mock_llm)

    agent = RoutingAgent()
    result = agent.route("tell me something unique that has no keywords")
    assert result == ("ESCALATE", None)

