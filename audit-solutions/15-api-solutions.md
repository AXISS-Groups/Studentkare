# 15 — API Architecture & Contracts: Solutions

Answers [audit/15-api-audit.md](../audit/15-api-audit.md). Owns **TD-13** (typed contract), versioning, pagination, error codes and API docs. The router split is TD-07 in [03](03-architecture-solutions.md).

---

## TD-13 — Generated, typed client from OpenAPI

**Goal:** Every backend response has a declared schema. The frontend's types are generated from it, so a breaking backend change fails CI instead of failing silently in production.

**Steps**
1. **Response models with camelCase.** Add a shared base:
   ```python
   # backend/core/schemas.py
   from pydantic import BaseModel, ConfigDict
   from pydantic.alias_generators import to_camel
   class ApiModel(BaseModel):
       model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
   ```
   Then declare `response_model=` on each route, with `response_model_by_alias=True` (the FastAPI default). Start with routes the frontend uses most: auth session, home, records, orders, appointments. Do this as part of each domain move in [03](03-architecture-solutions.md).
2. **Export the schema at build time.** This doesn't need `/openapi.json` to be public in production:
   ```bash
   cd backend && PYTHONPATH=.:app APP_ENV=testing python -c \
     "import json; from app.main import app; print(json.dumps(app.openapi()))" > ../openapi.json
   ```
3. **Generate TS types:** `npx openapi-typescript openapi.json -o src/data/generated/api.d.ts`. Use them with `openapi-fetch`, or wrap them in the existing `http.ts` (keeps CSRF and cookie handling):
   ```ts
   import type { paths } from '@/data/generated/api';
   type Session = paths['/api/auth/session']['get']['responses']['200']['content']['application/json'];
   ```
4. **CI drift check:** regenerate in the `frontend` job. Fail if `git diff --exit-code src/data/generated` shows changes. A backend change then forces a frontend type update in the same PR.
5. **Retire hand-written response types** in `src/data/types/workflowTypes.ts` as each repository switches over.

New dev dependencies: `openapi-typescript` and optionally `openapi-fetch`, pinned.

**Verify:** renaming a response field on the backend makes `tsc` fail in CI. **Effort:** M (setup S; per-route models incremental).

---

## Error codes (also unblocks localisation, [27](27-i18n-accessibility-solutions.md))
```python
# backend/core/errors.py
class ApiError(HTTPException):
    def __init__(self, status: int, code: str, detail: str):
        super().__init__(status, detail={"code": code, "detail": detail})
# usage
raise ApiError(401, "OTP_INVALID_OR_EXPIRED", "Invalid or expired verification code.")
```
- Add an exception handler that also wraps plain `HTTPException` as `{code: "HTTP_<status>", detail}`, so the response shape is uniform.
- Document the codes in a generated enum that is included in OpenAPI.
- The frontend maps `code` to an i18n key. `detail` remains as the English fallback.

**Effort:** M (incremental).

## Versioning
- Treat the current `/api/*` as v1 implicitly.
- Move the 19 stray `/api/v1/*` routes under their domain routers at their unversioned paths, keeping the old path as an alias for one release: `router.add_api_route(old_path, handler, deprecated=True)`.
- Add a `/api/v2` prefix only for real breaking changes. The mobile app pins the API version in its config.
- Add a `Deprecation` header on alias routes, and remove them after the mobile app's minimum supported version moves past them.

**Effort:** S per domain.

## Pagination
```python
class Page(ApiModel, Generic[T]):
    items: list[T]
    next_cursor: str | None
def page_params(limit: int = Query(50, ge=1, le=200), cursor: str | None = None): ...
```
Use keyset (cursor) pagination on `(created_at, id)` for list endpoints. Migrate when a list endpoint is touched; readings currently use a hard `.limit(1000)`.
**Effort:** S per endpoint.

## Authorisation consistency
- Keep dependency-based auth (`authenticated_user`, `require_staff`, `require_super_admin`, `two_factor_setup_user`).
- Add a CI route audit using the same AST scan as the audit. Every route must either declare an auth dependency or appear on an explicit `PUBLIC_ROUTES` allow-list (`backend/app/public_routes.py`). This turns today's manual review of the 53 flagged routes into a rule.
- Object-level authorisation: add tests for one IDOR case per domain (user A cannot read user B's record, order or appointment).

**Effort:** S (scanner), M (IDOR tests).

## Docs exposure
Disable `/docs` and `/openapi.json` outside dev/test ([17](17-security-solutions.md)). The exported `openapi.json` in CI serves client generation and internal docs, and can be published to an internal docs site.
