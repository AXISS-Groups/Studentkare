# 17 — Security: Solutions

Answers [audit/17-security-audit.md](../audit/17-security-audit.md). Owns **TD-10, TD-16, TD-29, TD-31, TD-42** and the origin-check finding. Related solutions live elsewhere:

| Finding | Solution file |
|---|---|
| TD-01 residual (ENV-01), TD-40 | [25](25-environment-configuration-solutions.md) |
| TD-02, TD-39 | [18](18-cicd-deployment-solutions.md) |
| TD-03 (Rule L) | [16](16-database-solutions.md) |
| TD-05 | [11](11-git-workflow-solutions.md) |
| TD-15 | [14](14-error-handling-logging-solutions.md) |
| TD-47 | [28](28-privacy-solutions.md) |

> Security changes here touch authentication. Each one needs a named reviewer and tests that prove the fail-closed path.

---

## TD-10 — Correct client identity behind the proxy; one shared limiter

**Goal:**
- Per-IP limits apply to the real client, not the nginx container.
- Clients cannot forge their identity.
- Limits hold across replicas.

**Approach**
1. Let only the trusted proxy set the client address. Uvicorn's `--proxy-headers` combined with `--forwarded-allow-ips=<proxy CIDR>` rewrites `request.client.host` from `X-Forwarded-For`, and only when the request comes from that CIDR.
2. Make the global middleware read the address the ASGI server already resolved (`scope["client"]`) instead of re-parsing headers.
3. Move the global limiter from the in-memory dict to the existing Postgres `RateBucket` mechanism (`workflow_auth.limit`), or to Redis if it is introduced later.

**Proposed change**
- `backend/Dockerfile` entrypoint (shell form so the variable expands):
  ```dockerfile
  CMD exec uvicorn app.main:app --host 0.0.0.0 --port 8000 \
      --proxy-headers --forwarded-allow-ips "${FORWARDED_ALLOW_IPS:-127.0.0.1}"
  ```
  Set `FORWARDED_ALLOW_IPS` to the nginx/ingress subnet: the compose network CIDR, or the cluster pod/ingress CIDR in Helm.
- `deploy/nginx.conf`: overwrite instead of append, so a client-supplied XFF chain never reaches the app:
  ```nginx
  proxy_set_header X-Forwarded-For $remote_addr;
  proxy_set_header X-Real-IP $remote_addr;
  ```
  If a CDN or LB sits in front of nginx, use `set_real_ip_from <lb cidr>; real_ip_header X-Forwarded-For;` in nginx and keep `$remote_addr`.
- `backend/core/rate_limiter.py` `client_ip_from_scope`: stop trusting `cf-connecting-ip`, `x-real-ip` and the left-most XFF from arbitrary clients:
  ```python
  def client_ip_from_scope(scope: dict) -> str:
      # Uvicorn --proxy-headers already resolved the client from trusted proxies only.
      client = scope.get("client")
      return client[0] if client and client[0] else "unknown"
  ```
  If Cloudflare is used, trust `CF-Connecting-IP` only when the peer address is in Cloudflare's published ranges (config list).
- Global limiter storage: back `SlidingWindowRateLimiter` with a fixed-window counter in Postgres (reuse `M.RateBucket` and `limit()`), or keep it in-memory but document it as per-instance and add the DB-backed limit to `/api/auth/*` only, which already exists.

**Verify (tests)**
- Two requests with different spoofed `X-Forwarded-For` values from the same peer share one bucket.
- Behind the proxy (simulate a peer in the allowed CIDR with XFF `1.2.3.4`), `request.client.host == "1.2.3.4"`.
- 31 OTP sends from 31 different real IPs within 15 minutes all succeed, so the bucket is per client, not global.

**Effort:** S. **Risk:** A wrong CIDR makes every request look like the proxy again. Add a startup log line that shows the resolved client for the health probe.

---

## TD-16 — Production compose overlay must not expose dev services

**Decision first** (see [10](10-documentation-solutions.md) ADR-001): is the compose overlay a supported production path, or is Helm the only one?

**If Helm-only:** delete `docker-compose.prod.yml` and the CI step that validates it, and say so in `docs/DEPLOYMENT_GUIDE.md`.

**If the overlay stays (sketch)**
```yaml
# docker-compose.yml: dev-only services get a profile
services:
  postgres:   { profiles: ["dev"], ... }
  pgbouncer:  { profiles: ["dev"], image: edoburu/pgbouncer:1.23.1, ... }   # pinned
# docker-compose.prod.yml
services:
  prometheus:
    command: [ "--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/prometheus",
               "--storage.tsdb.retention.time=30d", "--storage.tsdb.retention.size=10GB",
               "--web.enable-lifecycle" ]          # drop --web.enable-admin-api
    ports: !reset []                               # Compose ≥2.24; or bind 127.0.0.1:9090:9090
  loki:         { ports: !reset [] }
  alertmanager: { ports: !reset [] }
  blackbox:     { ports: !reset [] }
  otel-collector: { ports: !reset [] }
  tempo:        { ports: !reset [] }               # also removes the 4317/4318 clash
  frontend:     { deploy: { replicas: 1 } }        # fixed host port cannot run 2 replicas outside Swarm
  grafana:      { ports: ["127.0.0.1:3001:3000"] } # reach via SSH tunnel / reverse proxy with auth
```
**Verify:**
- `docker compose -f docker-compose.yml -f docker-compose.prod.yml config` lists no `postgres` or `pgbouncer` service and no published monitoring ports.
- A port scan of a staging host shows only 80/443.

**Effort:** S.

---

## TD-42 — Remove the `localStorage` bearer-token path
- Delete `getToken()` and its use in `aiApi` in `src/data/api.ts:~347`. The copy in `src/data/services/api.ts` goes when that unimported file is deleted per [05](05-code-quality-solutions.md). Requests rely on the session cookie plus CSRF only, through `src/data/services/http.ts`.
- Delete `src/screens/auth/Flow03LoginScreen.tsx` (unreferenced; it writes `sk_token`).
- Add a lint ban:
  ```js
  // config/eslint.config.js
  { files: ['src/**/*.{ts,tsx}'], rules: { 'no-restricted-syntax': ['error',
    { selector: "CallExpression[callee.object.name='localStorage'][arguments.0.value=/token|session|otp|abha/i]",
      message: 'Guardrail 9: never store tokens, session data or identifiers in client storage.' }] } }
  ```
  This must merge with the existing `no-restricted-syntax` hex rule for `src/**/*.tsx`. ESLint flat config replaces the rule options per matching block, so combine both selectors into one array.

**Verify:** `git grep -n "localStorage" -- src | grep -i token` returns nothing. **Effort:** S.

---

## Origin check (MEDIUM → LOW, dev only)
`backend/services/workflow_auth.py:74-77`: parse the origin and compare the hostname exactly.
```python
from urllib.parse import urlsplit
host = urlsplit(origin).hostname or ""
if settings().is_dev_or_test and host in {"localhost", "127.0.0.1", "0.0.0.0", "::1"}:
    return
```
**Verify:** test that `https://localhost.attacker.example` gets 403 in development. **Effort:** S.

---

## TD-29 — Firebase client integration
**Recommended:** remove it. Delete `src/lib/platform/firebaseClient.ts`, the `initFirebase` call in `src/App.tsx:71`, the `firebase` dependency, and the `firebase` block of `/api/config/public`.
**If a real use case exists** (for example web push): write an ADR. Then:
- allow only `firebase/messaging`;
- forbid `firebase/firestore` and `firebase/auth` with a lint ban;
- record in the privacy notice what is sent;
- send no PHI.

**Verify:** the bundle contains no `firestore` chunk. **Effort:** S.

---

## TD-31 — One AI entry point before any LLM goes live

**Goal:** Guardrail 3 becomes mechanically enforced, not just documented.

**Steps**
1. Keep `backend/services/ai_client.py::invoke_ai_model` as the only model entry point. Fix its failure semantics: return `status: "unavailable"` with no output when the model is unreachable, never `"success"` with the user's prompt echoed back.
2. Make `llm_gateway._call_ollama` private to `ai_client` and make it async (`httpx.AsyncClient`) so it doesn't block the event loop.
3. Delete `services/agents/routing_agent.py`, which calls `ChatOllama` directly, along with the other unreachable agents ([03](03-architecture-solutions.md) TD-08).
4. Add an enforcement test:
   ```python
   # backend/tests/test_ai_single_entry.py
   import pathlib, re
   def test_no_model_calls_outside_ai_client():
       root = pathlib.Path(__file__).parents[1]
       offenders = [p for p in root.rglob("*.py")
                    if "tests" not in p.parts and p.name not in {"ai_client.py", "llm_gateway.py"}
                    and re.search(r"ChatOllama|/api/generate|openai\.|anthropic\.", p.read_text())]
       assert offenders == []
   ```
5. Frontend: delete `src/ai/core/client.ts::executeAIModelCall` (unused, echoes the prompt). The frontend must never call a model directly.

**Verify:** the test passes; the unavailable path is covered by a test. **Effort:** M. **Depends on:** TD-08 deletion.

---

## Remaining LOW items
- **`/docs` and `/openapi.json` in production:** `FastAPI(docs_url=None if not settings().is_dev_or_test else "/docs", openapi_url=…)`. Keep the schema available to CI for client generation ([15](15-api-solutions.md)) by exporting it at build time.
- **gitleaks rules:** re-enable `generic-api-key` in `config/gitleaks.toml` and add path-scoped allowlist entries for the false positives instead. Delete the duplicate root `.gitleaks.toml`.

## Guardrail scorecard target

| Guardrail | Closed by |
|---|---|
| 1 Fail closed | ENV-01 ([25](25-environment-configuration-solutions.md)) |
| 3 AI constitution | TD-31 |
| 4 Rule L | TD-03 ([16](16-database-solutions.md)) |
| 5 M18 separate service | Stays "not built". Do not build M18 inside the monolith |
| 9 No identifiers in logs or client storage | TD-15, TD-42 |
| 10 Strict TS | TD-35 ([05](05-code-quality-solutions.md)) |
