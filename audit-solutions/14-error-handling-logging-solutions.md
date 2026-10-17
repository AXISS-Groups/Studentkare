# 14 — Error Handling & Logging: Solutions

Answers [audit/14-error-handling-logging.md](../audit/14-error-handling-logging.md). Owns **TD-15** (identifiers in logs) and **TD-19** (silent catch and success-after-failure UI), plus structured logging and the frontend error type. Startup readiness is in [03](03-architecture-solutions.md).

---

## TD-15 — No personal identifiers in logs

**Remaining offenders:** `backend/core/email.py` prints recipient addresses at lines 192, 216, 291, 293, 297, 343, 345 and 348.

**Steps**
1. Add a shared masking helper. `mask_identifier` already exists at `services/workflow_auth.py:595`; move it to `core/pii.py`, re-export it from `workflow_auth` for compatibility, and add the helpers below.
   ```python
   # backend/core/pii.py
   import hashlib, hmac, os
   def mask_email(addr: str) -> str:
       local, _, domain = (addr or "").partition("@")
       return f"{local[:1]}•••@{domain}" if domain else "•••"
   def log_ref(value: str) -> str:
       """Stable, non-reversible reference for correlating log lines about one person."""
       key = os.getenv("LOG_HASH_KEY", "").encode() or b"dev"
       return hmac.new(key, value.encode(), hashlib.sha256).hexdigest()[:12]
   ```
2. Replace each print, for example:
   ```python
   logger.warning("email skipped ref=%s reason=%s", log_ref(to_email), why)
   ```
3. **Logging filter as a safety net:** a `logging.Filter` that redacts email, Indian mobile-number (`[6-9]\d{9}`) and ABHA-number patterns from every record before it is emitted.
4. **CI check:**
   - Ruff `T201` bans `print` in `backend/services` and `backend/core` ([05](05-code-quality-solutions.md)).
   - Add a grep test that fails when a log or format call interpolates `identifier`, `email`, `phone`, `to_email` or `abha` without `log_ref`/`mask_*`.

**Verify:** a unit test sends mail with no provider configured and asserts the captured log contains no `@`. **Effort:** S.

---

## Structured logging, one system
```python
# backend/core/logging_setup.py, called first thing in app/main.py (replaces basicConfig)
import json, logging, sys, contextvars
request_id = contextvars.ContextVar("request_id", default="-")

class JsonFormatter(logging.Formatter):
    def format(self, r):
        return json.dumps({"ts": self.formatTime(r), "level": r.levelname, "logger": r.name,
                           "msg": r.getMessage(), "request_id": request_id.get(),
                           **({"exc": self.formatException(r.exc_info)} if r.exc_info else {})})

def setup():
    h = logging.StreamHandler(sys.stdout); h.setFormatter(JsonFormatter()); h.addFilter(PiiRedactionFilter())
    logging.basicConfig(level=logging.INFO, handlers=[h], force=True)
```
Add a middleware that sets `request_id` from `X-Request-ID` (or generates one) and echoes it in the response. nginx should pass `$request_id`. Loki can then filter by `request_id` and `level`.
Delete the unreachable `core/logging_middleware.py`.
**Effort:** S.

---

## TD-19 — Never report success after failure

**Backend**
- Ruff `BLE001` (blind except) and `S110` (try/except/pass), introduced with frozen `noqa` markers ([05](05-code-quality-solutions.md)).
- Rule: catch the narrowest exception, then log with `logger.exception`. If the operation was the user's request, return an error. Swallowing is allowed only for best-effort side effects, such as Slack ops alerts, and then needs a `# best-effort: <why>` comment.

**Frontend**
- Delete `src/components/marketplace/PaymentCheckoutModal.tsx`. It is unreferenced, posts a fake signed webhook, and shows a receipt regardless of the result.
- Lint (warn, then error):
  ```js
  'no-restricted-syntax': ['error',
    { selector: "CallExpression[callee.property.name='catch'] > ArrowFunctionExpression[body.type='BlockStatement'][body.body.length=0]",
      message: 'Do not swallow errors; set an error state.' },
    { selector: 'CatchClause > BlockStatement[body.length=0]', message: 'Empty catch: handle or rethrow.' }]
  ```
  Allow-list the deliberate cases, such as the `localStorage` preference fallback in `InterfaceProvider.tsx`, with an inline disable and a reason.
- Pattern for ViewModels: `status: 'idle' | 'loading' | 'error' | 'success'`. `success` is set only after the server confirms. `design-system/Moments` `ResultMoment` already enforces "success only for order/booking/payment"; use it.

**AI fallbacks:** see [17](17-security-solutions.md) TD-31. `status: "unavailable"`, never `"success"` with echoed input.

**Effort:** M (spread across PRs).

---

## Frontend API errors: one typed result
`ApiError` now keeps structured `detail` (per the team's plan). Finish the job:
```ts
// src/data/services/http.ts
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code?: string; detail: string | unknown; offline: boolean };
```
- Repositories return `ApiResult`.
- ViewModels map `code` to a message key ([27](27-i18n-accessibility-solutions.md) I18N-02), handle `offline` explicitly, and never return `null`.
- Remove patterns like `return { success: false, message: '2FA service offline' }` for every exception.

**Effort:** M, applied as features are touched.

---

## Timeouts, retries, isolation
- Outbound HTTP keeps explicit timeouts (already the case for OTP and Slack). Add a lint/grep check that every `httpx` call passes `timeout=`.
- Retries only for idempotent calls, with jittered backoff (`tenacity`). Never retry a WhatsApp SOS send inside the request; use the outbox ([19](19-scalability-solutions.md) SCALE-01).
- `/api/ready` reports scheduler and integration state ([03](03-architecture-solutions.md)).
