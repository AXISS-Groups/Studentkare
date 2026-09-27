"""Crisis gate: deterministic floor, fail-closed behaviour, and navigator wiring.

The gate is the only thing standing between a student in distress and a generic
"contact support" reply, so these tests assert behaviour rather than implementation,
and pin the phrase table against its TypeScript peer.
"""
import re
from pathlib import Path

import pytest
from test_workflow_api import harness, register  # noqa: F401 — pytest fixtures

from services import crisis_gate

REPO_ROOT = Path(__file__).resolve().parents[2]
TS_GATE = REPO_ROOT / "src" / "ai" / "core" / "crisisGate.ts"


# ── Deterministic floor ────────────────────────────────────────────────────────

@pytest.mark.parametrize("text", [
    "I want to end my life",
    "I want to kill myself",
    "kil myself right now",
    "feeling extremely sucidal today",
    "selfharm is the only way out",
    "thinking about cutting my wrists",
    "I’m going to suicide tonight",          # curly apostrophe
    "मैं अपनी जान लेना चाहता हूँ",              # Hindi
    "నేను చనిపోవాలని అనుకుంటున్నాను",            # Telugu
    "mujhe marne ka man kar raha hai",       # Hinglish
    "na valla kavatam ledu suicide cheskuntanu",  # Tenglish
])
def test_self_harm_phrases_are_crisis(text):
    result = crisis_gate.evaluate(text)
    assert result["isCrisis"] is True
    assert result["kind"] == "CRISIS_SELF_HARM"
    assert crisis_gate.TELE_MANAS_PRIMARY in result["message"]


@pytest.mark.parametrize("text", [
    "severe chest pain and crushing feeling on my left arm",
    "cannot breathe, allergic reaction swelling throat",
    "deep wound bleeding heavily and won't stop",
    "my roommate is unresponsive",
    "he is having a seizure",
])
def test_medical_emergencies_route_to_emergency_services(text):
    result = crisis_gate.evaluate(text)
    assert result["kind"] == "CRISIS_MEDICAL"
    assert crisis_gate.EMERGENCY_NUMBER in result["message"]


@pytest.mark.parametrize("text", [
    "how many pills to die",
    "what is the lethal dose of paracetamol",
    "took an accidental overdose of pills, vomiting blood",
    "how many crocin to kill",
])
def test_overdose_queries_get_poison_control_and_no_dosage(text):
    result = crisis_gate.evaluate(text)
    assert result["kind"] == "CRISIS_OVERDOSE"
    assert crisis_gate.POISON_HELPLINE in result["message"]
    # Rule 3: never return a threshold, a quantity, or a substance-specific amount.
    assert not re.search(r"\d+\s*(mg|g|ml|tablets?|pills?)", result["message"], re.IGNORECASE)


@pytest.mark.parametrize("text", [
    "I am dying of boredom in this 3 hour lecture",
    "this assignment is killing me",
    "I could murder a biryani right now",
    "dead tired after gym",
    "my phone battery died",
    "How do I book an appointment?",
    "",
])
def test_everyday_language_stays_clear(text):
    result = crisis_gate.evaluate(text)
    assert result["isCrisis"] is False
    assert result["kind"] == "CLEAR"


def test_explicit_crisis_phrase_outranks_hyperbole_allowlist():
    """A message containing both must escalate, never be excused as an exaggeration."""
    result = crisis_gate.evaluate("dead tired and I want to kill myself")
    assert result["isCrisis"] is True
    assert result["kind"] == "CRISIS_SELF_HARM"
    assert crisis_gate.is_hyperbole("dead tired and I want to kill myself") is False


# ── Fail closed ────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("bad_input", [None, 42, [], {}, object()])
def test_non_string_input_fails_closed(bad_input):
    result = crisis_gate.evaluate(bad_input)
    assert result["isCrisis"] is True
    assert result["kind"] == "ERROR_FAIL_CLOSED"
    assert result["status"] == "error"
    assert result["resources"], "a fail-closed result must still hand back contacts"


def test_internal_failure_fails_closed(monkeypatch):
    """If matching itself breaks, the gate denies rather than letting the query pass."""
    class Exploding:
        def search(self, _):
            raise RuntimeError("classifier exploded")

    monkeypatch.setattr(crisis_gate, "_COMPILED", [(Exploding(), "CRISIS_SELF_HARM", "EN")])
    result = crisis_gate.evaluate("how do I book an appointment")
    assert result["isCrisis"] is True
    assert result["kind"] == "ERROR_FAIL_CLOSED"


def test_fail_closed_message_never_echoes_the_query():
    """Rule 9: the query is the most sensitive string here and must not leak."""
    result = crisis_gate.evaluate(12345)
    assert "12345" not in result["message"]


# ── Drift guard against the TypeScript peer ────────────────────────────────────

def _ts_patterns():
    source = TS_GATE.read_text(encoding="utf-8")
    block = source[source.index("CRISIS_PHRASE_MAPPINGS"):source.index("export const CLEAR_HYPERBOLE_PATTERNS")]
    return re.findall(r"\{\s*pattern:\s*/(.+?)/i,\s*kind:\s*'([A-Z_]+)',\s*language:\s*'([A-Z]+)'\s*\}", block)


def test_phrase_table_matches_typescript_gate():
    """Two implementations of one safety rule must not drift. Edit both or neither."""
    assert TS_GATE.exists(), f"TypeScript crisis gate not found at {TS_GATE}"
    assert _ts_patterns() == crisis_gate.CRISIS_PHRASE_MAPPINGS


def test_hyperbole_table_matches_typescript_gate():
    source = TS_GATE.read_text(encoding="utf-8")
    block = source[source.index("CLEAR_HYPERBOLE_PATTERNS"):source.index("function buildFailClosedResult")]
    assert re.findall(r"/(.+?)/i,", block) == crisis_gate.CLEAR_HYPERBOLE_PATTERNS


# ── Navigator wiring ───────────────────────────────────────────────────────────

def test_navigator_returns_crisis_support_not_contact_support(harness):
    """The regression this whole module exists to prevent."""
    client, _factory, codes = harness
    _user, headers = register(client, codes, "crisis-nav@example.test")

    res = client.post("/api/care/navigate", json={"query": "I want to end my life"}, headers=headers).json()

    assert res["domain"] == "crisis"
    assert res["confident"] is False
    assert res["citations"] == []
    assert crisis_gate.TELE_MANAS_PRIMARY in res["answer"]
    assert "contact support" not in res["answer"].lower()
    assert res["crisis"]["kind"] == "CRISIS_SELF_HARM"
    assert any(r["number"] == crisis_gate.TELE_MANAS_PRIMARY for r in res["crisis"]["resources"])


def test_navigator_overdose_query_never_reaches_medication_sources(harness):
    """'how much is too much' routes to the medications domain — it must be gated first."""
    client, _factory, codes = harness
    _user, headers = register(client, codes, "crisis-od@example.test")

    res = client.post("/api/care/navigate", json={"query": "paracetamol how much is too much"}, headers=headers).json()

    assert res["domain"] == "crisis"
    assert res["crisis"]["kind"] == "CRISIS_OVERDOSE"
    assert res["citations"] == []
    assert crisis_gate.POISON_HELPLINE in res["answer"]


def test_navigator_still_answers_ordinary_questions(harness):
    """The gate must not make the navigator useless."""
    client, _factory, codes = harness
    _user, headers = register(client, codes, "crisis-ok@example.test")

    res = client.post("/api/care/navigate", json={"query": "How do I book an appointment?"}, headers=headers).json()

    assert res["domain"] == "appointments"
    assert "crisis" not in res
