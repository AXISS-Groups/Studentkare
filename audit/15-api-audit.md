# 15 — API Architecture & Contracts

> **Revalidated 2026-10-17** against `main` @ `ad01230` (baseline `ab4ce3f`, 2026-10-08). Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Text under "Original assessment" is the 2026-10-08 record; where it conflicts with this block, this block wins.

## 2026-10-17 update

- Routes: **297** (was 253); 13 routers mounted (was 9): + `campus_departure`, `emergency`, `erasure`, `student_requests`.
- AST scan flags 53 routes without a recognisable auth dependency; reviewed: the new ones (`/api/auth/2fa/{status,setup,enable}`, `/api/auth/consents`, `/api/auth/remembered*`) authenticate via `two_factor_setup_user` / `resolve_session` / remembered-device cookie inside the handler — **not** a gap. `/api/auth/consent` (GET, wording) is intended public.
- New 2FA gate: `deny_until_two_factor()` blocks enforced roles until 2FA is on (`workflow_auth.py`).
- Typed contract (TD-13), mixed versioning, pagination, error codes — OPEN, unchanged.
- New endpoints follow per-domain routers — positive (TD-07 trend).

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

## Shape

- 253 route handlers found by AST scan of non-test backend code; 9 routers mounted in `backend/app/main.py:249-257`.
- Prefix conventions coexist: `/api/<area>` (most), `/api/v1/<area>` (19 routes, mostly in `workflow_api.py:2687-3069`), `/api/work/*` (staff work queues), `/api/ops/*` (admin), and in unmounted code `/webhooks/postal`, `/admin/email-quality` (no `/api` prefix, `core/email_quality.py`).
- Request validation: Pydantic models, often `StrictModel` with `extra="forbid"` and `str_strip_whitespace` (`workflow_auth.py:213-215`) — good. 3 handlers take raw `dict`/`request.json()`.
- Responses: ad-hoc dicts (`{"items": [...]}`, `{"success": True}`, `{"id": ...}`); camelCase keys produced by hand. `response_model` is rarely declared, so OpenAPI response schemas are mostly empty.
- Auth: cookie session + CSRF via dependencies `authenticated_user`, `require_staff`, `require_super_admin` etc. AST scan: **209 of 253** routes declare an auth dependency; the 44 that do not are listed below.

## Unauthenticated routes (reviewed)

| Route | Verdict |
|---|---|
| `/api/health`, `/api/info`, `/api/auth/options`, `/api/auth/otp/send`, `/api/auth/otp/verify`, `/api/auth/signup`, `/api/auth/session`, `/api/auth/refresh`, `/api/config/public`, `/api/catalog`, `/api/catalog/{id}/image`, `/api/billing/plans`, `/api/preventive/providers`, `/api/preventive/vaccines`, `/api/home`, `/api/wellness/timetable`, `/api/insurance/benefits`, `/api/platform/asset/{type}` | Intended public |
| `/api/payments/webhook` (`workflow_api.py:917`), `/api/billing/razorpay/webhook` (`billing.py:381`) | HMAC verified, reject when secret unset (`workflow_api.py:888-894`) — good |
| `/api/alerts/webhook` (`alerts.py:68`) | Verifies **only if** `ALERTMANAGER_WEBHOOK_SECRET` is set (`alerts.py:77-80`) — fail-open in dev; prod overlay requires the var |
| `/api/auth/2fa/challenge` (`integrations.py:280`) | Protected by a temp token; but see 2FA storage issue in 17 |
| `/api/billing/inquiries` (POST, `billing.py:433`) | Public write into DB + ops feed; only global IP rate limit protects it (spoofable, see 17) |
| `/api/apilayer/*` (11 routes) | Protected at mount: `include_router(..., dependencies=[Depends(require_super_admin)])` (`main.py:257`) |
| `/admin/email-quality*`, `/webhooks/postal` | Not mounted (Mongo-backed legacy) |

No route was found that exposes clinical data without an auth dependency. Object-level authorization (ownership checks) was spot-checked on readings (`workflow_api.py:153-155` filters by `account_id`) and looks correct; a full IDOR review of 209 routes was out of scope.

## Findings

**Severity: HIGH — No contract between backend and frontend**
Location: `src/data/api.ts`, `src/data/workflowTypes.ts`; routes without `response_model`
Problem: Hand-written TS types and hand-written camelCase dicts on the backend.
Impact: Any backend change can break the UI silently; two developers can't change an endpoint safely without manual coordination. Mobile clients (Expo) will pin old shapes with no versioning.
Recommendation: Declare Pydantic response models (with `alias_generator=to_camel`) on every route; generate the TS client from `/openapi.json` in CI; fail CI if the generated client changes without a commit.

**Severity: MEDIUM — Mixed versioning**
Evidence: 19 `/api/v1/*` routes alongside ~230 unversioned `/api/*` routes; `/api/orders/{id}/payment` and `/api/v1/checkout/razorpay/create-order` serve the same domain under different schemes.
Impact: Unclear which is stable; mobile release cycles need a version strategy.
Recommendation: Treat today's `/api/*` as v1 implicitly; add `/api/v2` only on breaking change. Move the stray `/api/v1/*` routes under their domain routers.

**Severity: MEDIUM — Router organisation**
Evidence: `workflow_api.py` holds ~150 routes across ~25 domains (see 03); `integrations.py` hosts 2FA endpoints under `/api/auth/2fa/*`; `clinical_api.py` hosts AYUSH agent and knowledge reindex.
Recommendation: One router per domain with its own prefix and tag.

**Severity: MEDIUM — Pagination inconsistent**
Evidence: list endpoints use ad-hoc `limit` / hard caps (e.g. readings `.limit(1000)`, `workflow_api.py:137-138`); no cursor/offset convention; ~29 limit/offset occurrences in `workflow_api.py` with differing semantics.
Recommendation: Standard `?limit=&cursor=` with a shared Pydantic `Page[T]` response.

**Severity: MEDIUM — Error response shape**
FastAPI default `{"detail": "..."}` with human sentences; no machine-readable error codes.
Impact: Frontend matches on status codes only; localisation and specific UX states are hard.
Recommendation: `{"detail": str, "code": "OTP_EXPIRED"}` for domain errors.

**Severity: LOW — API documentation**
FastAPI serves `/docs` and `/openapi.json` by default (not disabled in `main.py:140`). Useful in dev; consider disabling or protecting in production.

## Can the API evolve without breaking clients?
Not safely today. Introduce typed responses + generated client first; it is the single change that most reduces cross-team breakage.
