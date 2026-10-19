# 30 — AI / LLM Integration (Agent Ayush, constitution gateway, retrieval)

**New dimension, created 2026-10-17 (revalidation 2)** against `main` @ `d333afe`.

## Why this needs its own report
Until revalidation 1 there was no live model call in the backend. The AI constitution was "not wired" (TD-31), and report 06 covered AI only as a source of *development* debt. Commit `6e9ff13` changed that:
- Agent Ayush can now ask an on-prem Ollama model to rephrase approved knowledge passages.
- Every call goes through `services/llm_gateway.invoke()`.
- A retrieval index (`services/vector_store.py`) and a quality endpoint support it.

At the same time, `ea6bc1f` deleted 20 unreachable "agent" modules, and `e861bb3` replaced a fabricated medication lookup.

A model that writes health guidance shown to students has its own safety, testing and observability needs. None of the existing reports can track those (criteria 1, 3 and 5 of the audit prompt §6). Report 06 keeps the AI-assisted-*development* view; this report covers the AI *feature*.

## Scope
`backend/services/llm_gateway.py` (206 lines), `services/agent_ayush.py` (442), `services/vector_store.py`, `services/crisis_gate.py`, `core/ai_security_guardrails.py` (124), the Ayush routes in `services/clinical_api.py` (`/agents/ayush/ask`, `/agents/ayush/history`, `/ops/knowledge/reindex`, `/ops/knowledge/index-status`, `/ops/agents/ayush/quality`), the frontend `src/ai/**` tree, and tests `test_agent_ayush_generation.py` and `test_ai_constitution.py`.

## Current state (verified in code; no test or model was run)

| Element | Evidence | Assessment |
|---|---|---|
| Single model path | `llm_gateway.py` docstring and `invoke()`. No other backend module imports `httpx` toward a model runtime. The static walk shows `llm_gateway` reachable via `clinical_api → agent_ayush` | Good. Meets AGENTS.md guardrail 3 for the backend |
| Fail-closed gateway | Raises `ConstitutionError` (rule not loaded or unknown), `PromptBlocked` (guardrail) or `ModelUnavailable`. There is no permissive default. A circuit-breaker pause of `LLM_RETRY_AFTER_SECONDS` follows a transport failure | Good |
| Opt-in runtime | `OLLAMA_URL` unset means no model and extractive answers (`agent_ayush.generate`). `backend/config/.env.example` comments it out. No compose file or Helm value sets it | Generation is **off** in every shipped config, which is intended |
| Prompt content | `build_rephrase_prompt` sends the question plus approved passages, "nothing about the student". The gateway never logs prompt or output text | Good (Rule-C) |
| Pre-model refusals | `check_scope` (out-of-scope regexes), crisis gate, and refusal when a passage carries advice (`test_a_passage_carrying_advice_refuses_before_the_model_sees_it`) | Good |
| Output guard | `output_is_safe` (diagnosis and dosage patterns), then `rephrasing_is_grounded`: citations must exist and be in range; no new numbers; per-sentence term support ≥ 0.75 (`vector_store.support`); a negation in the answer must appear in a supporting source sentence | Good layered design, with one gap (AI-01) |
| Fallback | Any failure returns the extractive quote, with the reason recorded | Good |
| Retrieval | Indexes only active, reviewed, unexpired `KnowledgeSource` rows, filtered at index time and query time; sentence-boundary chunks; blended vector + term score (`vector_store.py` docstring) | Good |
| History | Kept only with opt-in (`history_kept`) | Good (privacy) |
| Quality | `GET /ops/agents/ayush/quality` reports which path answered, from recorded `AgentTurn` rows | Runtime telemetry exists. No offline evaluation (AI-02) |
| Tests | `test_agent_ayush_generation.py`: 9 rejection cases plus timeout, unreachable, constitution-not-loaded, guardrail-block and extractive-only paths, using a fake transport. `conftest.py` pops `OLLAMA_URL`, so no test reaches a real model | Good coverage of the control flow. Not executed by this audit |
| Frontend `src/ai/**` | 59 files of deterministic TypeScript (crisis gate, "agents", "mesh", "orchestrator"). `src/ai/core/client.ts` `executeAIModelCall` has no non-test importer | Naming suggests AI that does not exist (AI-03) |

## Findings

### Finding: AI-01 — Grounding guard does not catch a dropped negation
- **Severity:** Medium
- **Status:** OPEN (new)
- **Location:** `backend/services/agent_ayush.py` `rephrasing_is_grounded()`, `_NEGATION` (line 182); `tests/test_agent_ayush_generation.py:84-97`
- **Evidence:**
  - The negation check runs only when the **answer** contains a negation.
  - Example: a source says "Do **not** take ibuprofen with alcohol", and the model writes "Take ibuprofen with alcohol [1]". The answer has no negation and every term appears in the source, so the sentence passes support ≥ 0.75. No number was added and the citation is valid.
  - The test suite covers the opposite direction ("negation-flip": the model *adds* "cannot"), not this one.
  - `output_is_safe` may still reject some phrasings, such as dosage-like text, but it is not designed for this case.
- **Problem:** The most dangerous kind of rephrasing error in health guidance, turning a prohibition into an instruction, can pass the guard. This is inferred from reading the code; it was not executed.
- **Impact:** Today the impact is limited, because generation is opt-in and off in every shipped config. It becomes real the day `OLLAMA_URL` is set.
- **Recommendation:**
  - Before enabling generation anywhere, require negation parity in **both** directions: for each answer sentence, the best-supporting source sentence and the answer sentence must agree on negation.
  - Add the dropped-negation case to the parametrised rejection tests.
  - Treat enabling `OLLAMA_URL` in an environment as a Tier 1 change (AGENTS.md).
- **Dependencies:** none
- **Related reports:** 17, 13, 28

### Finding: AI-02 — No offline evaluation set for generation
- **Severity:** Recommendation
- **Status:** OPEN (new)
- **Evidence:** Quality is measured at runtime from recorded turns (`agent_ayush.quality`). There is no fixed question/passage/expected-outcome set that CI runs against a real model, and no regression record when the model (`LLM_MODEL=llama3.1:8b`) or the prompt (`REPHRASE_INSTRUCTIONS`) changes.
- **Recommendation:** Keep a small versioned evaluation set (for example 50–100 cases, including adversarial negation and number cases). Run it against the target model in a manual or non-blocking job whenever `REPHRASE_INSTRUCTIONS`, `CONSTITUTION_SYSTEM_PROMPTS` or `LLM_MODEL` changes, and record the pass rate in the PR.
- **Related reports:** 13

### Finding: AI-03 — Frontend "AI" tree names capabilities that do not exist
- **Severity:** Low
- **Status:** OPEN (carried from 06 pattern 1 and TD-31)
- **Location:** `src/ai/**` (59 files, ≈3.9K LOC), e.g. `multiAgentLoopOrchestrator.ts`, `specialistAgentsMesh.ts`, `core/client.ts`
- **Evidence:** No frontend file calls a model. `executeAIModelCall` has no non-test importer. Deleting `agenticRAGEngine`, `teleconsultLoopAgents` and `activityGuidance` (`6e9ff13`) shows the team is already pruning this tree.
- **Impact:** Reviewers and newcomers may assume model-backed behaviour on the client. The deterministic crisis gate is valuable and is hidden among the rest.
- **Recommendation:** Keep `crisisGate`, `constitution` and the allergy cross-check under a plainly named folder (for example `src/safety/`). Delete the rest with the dead-code pass (TD-06).
- **Related reports:** 06, 02

### Finding: AI-04 — Prompt-injection defence is a short regex list
- **Severity:** Low
- **Status:** OPEN (new; architectural observation)
- **Location:** `core/ai_security_guardrails.py:26-30` and nearby
- **Evidence:** Injection detection matches a handful of fixed phrases ("ignore all previous instructions", "DAN mode", and so on).
- **Impact:** The risk is low **because of the design**, not because of the regex. The model sees only the question and approved passages, and its output must pass the grounding guard or the answer falls back to a quote. A crafted question cannot make the model reveal student data it never receives.
- **Recommendation:** Treat the grounding guard (AI-01) as the primary control and the regex as a tripwire. Do not add student data to prompts without revisiting this.

## What is good
- One gateway, fail-closed, with no permissive default. The caller owns the deterministic fallback.
- The model never sees student identity or records, and prompts and outputs are never logged.
- Generation is off unless deliberately turned on, and the fallback is always a cited quote of approved text.
- 20 unreachable "agent" modules and their tests were deleted rather than kept as apparent capability.

## Related
[06](06-ai-vibe-code-audit.md) (AI-assisted development debt), [17](17-security-audit.md) (guardrail 3), [22](22-technical-debt.md) (TD-31 resolved), [28](28-privacy-consent-data-governance.md).
