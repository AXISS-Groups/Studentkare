"""
Studentkare — G0.3 AI Constitution Python Wrapper Test
Asserts fail-closed execution when Constitution fails to load or invalid rule is asserted.
"""
import pytest

from services.ai_client import (
    invoke_ai_model,
    set_force_constitution_failure,
    verify_constitution_loaded,
)


def setup_function():
    set_force_constitution_failure(False)


def test_ai_model_invocation_success():
    res = invoke_ai_model("Triage summary", "Rule-A")
    assert res["status"] == "success"
    assert res["rule_asserted"] == "Rule-A"


def test_ai_model_fails_closed_when_constitution_missing():
    set_force_constitution_failure(True)
    assert verify_constitution_loaded() is False
    with pytest.raises(RuntimeError, match="[AI CONSTITUTION FAILURE]"):
        invoke_ai_model("Triage summary", "Rule-A")


def test_ai_model_fails_on_invalid_rule():
    with pytest.raises(ValueError, match="[AI CONSTITUTION VIOLATION]"):
        invoke_ai_model("Triage summary", "INVALID_RULE")
