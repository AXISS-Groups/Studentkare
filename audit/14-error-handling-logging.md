# 14 — Error Handling & Logging

> **Revalidated 2026-10-17 (revalidation 2)** against `main` @ `d333afe`. Revalidation 1 was `main` @ `ad01230` earlier the same day; the original baseline was `development` @ `ab4ce3f`, 2026-10-08. Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Blocks are newest first. Where they disagree, the newest wins. "Original assessment" is the 2026-10-08 record.

## 2026-10-17 revalidation 2 (`d333afe`)

| Item | Status | Evidence |
|---|---|---|
| Identifiers in email logs | PARTIALLY RESOLVED (TD-15) | `core/email.py` prints unchanged |
| Silent failure in email path | **New finding** (TD-48) | Suppression lookup and event log go to MongoDB inside `try/except: return False` |
| Startup failures swallowed | OPEN | `main.py:96-137` still `except Exception: print(...)`. New Rule L status block at least prints the exception class |
| Job failures | **Improved** | `run_job_now` rolls back, records `FAILED` with the error, and uses `logger.exception` (`workflow_scheduler.py:226-231`). Urgent outbox failures raise a CRITICAL ops event |
| LLM errors | Good | the gateway logs only the rule, model and error class, never prompt or output (30) |
| CORS on error responses | **Fixed** (`4daba6b`) | CORS is outermost, so 429 and 413 stay readable by the browser (`test_cors_error_responses.py`) |
| Observability of the worker | Gap (TD-49) | no metric or alert on job freshness |
| `print(` vs `logger` | OPEN | new modules (`rule_l`, `commerce_session`, `llm_gateway`) use `logging`; startup still uses `print` |

---

## 2026-10-17 update — revalidation 1 (`ad01230`)

| Original finding | Status | Evidence |
|---|---|---|
| Identifiers and OTP codes in logs | PARTIALLY RESOLVED (TD-15) | `workflow_auth.py:271` logs channel+reason only; code printed only with explicit dev opt-in (`:272-273`). Still: `core/email.py` prints recipient addresses (lines 192, 216, 291, 293, 297, 343, 345, 348) |
| Startup failures swallowed | OPEN | `main.py` startup `except Exception` blocks unchanged |
| UI success after failure | PARTIALLY RESOLVED (TD-19) | guardian view removed; crisis gate fail-closed message (`119853d`); SOS records each outbound attempt with real status; `PaymentCheckoutModal` remains |
| Two logging systems | OPEN | 68 `print(` |
| Broad `except Exception` | OPEN | 134 / 29 `pass` |
| Frontend errors collapse to null | PARTIALLY RESOLVED | `ApiError` now keeps structured `detail` (per remediation plan §1.0); ViewModels return `Said` message keys |

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

## What is good

- **Global API error shape**: `backend/app/main.py:195-220` maps `SQLAlchemyError` → 503 and any `Exception` → 500 with a generic message; internal details are not returned to clients. Ops alerts posted to Slack explicitly exclude user data.
- **Frontend error boundary**: `src/App.tsx:183` wraps routes in `ErrorBoundary`; `RouteGuard` shows an explicit "session could not be checked" state instead of guessing (`src/core/routing/Router.tsx:62-68`).
- **Sentry**: frontend `sendDefaultPii: false` and a `beforeSend` scrubber (`src/lib/sentry.ts:68,124`).
- **Outbound HTTP timeouts**: spot-checked OTP delivery (`otp_delivery.py:76,130`) and Slack (`slack_notifier.py:138`) calls set `timeout=`. Ollama calls use 60 s (`llm_gateway.py:29`). Nginx `proxy_read_timeout 25s`.
- **Startup guard fails closed** in production for missing secrets/DB (`main.py:21-38`).

## Findings

**Severity: HIGH — Personal identifiers and OTP codes written to stdout**
Location: `backend/services/workflow_auth.py:207` (`print(f"[OTP] dispatch failed for {identifier} via {channel}: {reason}")` — runs in **all** environments including production); `workflow_auth.py:209` (prints the OTP code itself in non-production when `DEV_OTP_CONSOLE` is unset or true); `backend/core/email.py:192,216,291` (recipient email addresses).
Problem: Email addresses and phone numbers are personal data; combined with a health platform they reveal who uses the service. AGENTS.md guardrail 9 forbids identifiers in logs. Promtail ships container logs to Loki (`deploy/promtail-config*.yml`), so these persist in log storage.
Impact: Personal data in log retention outside the clinical store; OTP codes in logs on any non-production deployment readable by anyone with log access.
Recommendation: Log a masked identifier (the `targetMasked` logic already exists at `workflow_auth.py:324`) or a hash; never log codes outside an explicit local-only flag that defaults to **off**.

**Severity: HIGH — Startup failures swallowed**
Location: `backend/app/main.py:83-88` (integration config), `89-99` (scheduler), `100-112` (demo seed), `116-122` (pool metrics loop `except Exception: pass`)
Problem: `except Exception as e: print(...)` then continue.
Impact: The API reports healthy while scheduled jobs (reminders, outbox, follow-ups) never run; `/api/health` does not reflect scheduler or integration state.
Recommendation: `logger.exception(...)`, expose scheduler/integration status in `/api/health` (or a separate readiness endpoint) and alert on it.

**Severity: HIGH — UI reports success after failure**
Location: `src/features/auth/views/GuardianConsentView.tsx:26-31`; `src/components/marketplace/PaymentCheckoutModal.tsx:48-70`; AI fallbacks returning `status: "success"` with echoed input (`backend/services/ai_client.py:127-134`, `src/ai/core/client.ts:47-51`).
Impact: Users and operators are told an action succeeded when it did not — the most dangerous kind of silent failure in a health product.
Recommendation: Ban `.catch(() => {})` followed by a success state; AI fallbacks must return a distinct status (`unavailable`) that the UI renders honestly.

**Severity: MEDIUM — Two logging systems, unstructured**
Evidence: 68 `print(` vs 113 `logging` calls in non-test backend code; `logging.basicConfig` called in both `main.py:9` and `core/logging_middleware.py:16` (the latter unreachable); plain-text format.
Impact: Prints bypass log levels and handlers; Loki queries cannot filter by field; no request ID correlation.
Recommendation: One logger setup with JSON output and a request-ID middleware; Ruff `T201` to ban `print` in `backend/services` and `backend/core`.

**Severity: MEDIUM — Broad `except Exception` everywhere**
Evidence: 132 non-test occurrences, 29 immediately `pass`.
Recommendation: Ruff `BLE001` + `S110` as errors with explicit `# noqa` justification where a broad catch is deliberate.

**Severity: MEDIUM — Frontend API layer collapses errors to `null`/`false`**
Location: `src/data/api.ts` (e.g. `ingestVitals` returns `null` on network error and on non-2xx alike, lines 649-661; 2FA methods return `{ success: false, message: '2FA service offline' }` for any exception, `services/api.ts:385-387`).
Impact: ViewModels cannot distinguish 401, 403, 409, 422, 5xx and offline; users see generic failures and developers lose diagnostics.
Recommendation: A typed `Result<T, ApiError>` with status and server `detail`, produced by `http.ts` only.

**Severity: LOW — Retries without backoff discipline on AI path**
Location: `services/llm_gateway.py:57-70` — up to 6 synchronous 60 s HTTP attempts inside an `async` function (`_call_ollama` uses sync `httpx.Client`), blocking the event loop. Currently unreachable code; fix before wiring.

## Failure isolation
- In-process scheduler and API share one process; a slow job delays requests.
- Rate limiting is per-process memory (see 17/19).
- No circuit breakers on external providers in live code (`src/ai/core/circuitBreakers.ts` is client-side and unused per Knip).
