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