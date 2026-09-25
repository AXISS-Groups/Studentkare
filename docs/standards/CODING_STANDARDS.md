# Studentkare Coding Standards & Best Practices

This document outlines the mandatory engineering standards, code conventions, security rules, and architectural guidelines for contributing to **Studentkare**.

---

## 1. General Principles

- **Simplicity First (Ponytail Philosophy)**: Write minimal, pragmatic code. Avoid over-engineering, unused abstractions, premature optimization, or unnecessary external dependencies.
- **Zero Broken Builds**: Code must pass `npm run build` (`tsc && vite build`) and backend tests (`pytest`) before committing.
- **No Swallowed Exceptions**: Never silently catch exceptions without logging or returning appropriate error contracts.

---

## 2. Frontend Development Standards (React + TypeScript)

### 2.1 TypeScript Strictness
- **Strict Typing**: Never use `any` unless interacting with optional third-party SDK dynamic imports (e.g. Firebase or PostHog fallback).
- **Explicit Interfaces**: All component props, API response payload types, and state models must be explicitly defined in `src/data/workflowTypes.ts` or local file interfaces.
- **No Type Casting Bypass**: Avoid unsafe `as unknown as Type` assertions.

### 2.2 React Components & Hooks
- **Functional Components**: Use arrow or standard functions for React components with explicit prop types.
- **Defensive State Handling**: Always initialize array and object states cleanly to prevent `undefined` dereferencing runtime errors.
- **Accessibility**: Include standard ARIA attributes (`aria-label`, `aria-pressed`, `role="status"`, `role="dialog"`) on interactive controls.
- **Performance**: Use memoization (`useCallback`, `useMemo`) judiciously for expensive calculations, but avoid premature optimization.

### 2.3 UI & Styling Guidelines
- **Design System**: Follow `DESIGN.md`. Token source of truth: `design/tokens/studentkare.tokens.json`.
- **Vanilla CSS**: Prefer clear, scoped Vanilla CSS rules over heavy CSS framework utility bloat.
- **Color Palette**: Use semantic tokens from `design/tokens/studentkare.tokens.json` (generated into `src/theme/tokens/generated/`). Never hard-code hex values. See `DESIGN.md` §3 — the older hex values previously listed here failed WCAG AA contrast.
- **Responsive Layouts**: Layouts must scale seamlessly from mobile viewports (320px) to desktop wide monitors (1440px+).

---

## 3. Backend Development Standards (Python + FastAPI)

### 3.1 Python Code Style (PEP 8 & Pydantic V2)
- **Formatting & Type Hints**: All function signatures must include Python type annotations (`str`, `int`, `Optional[T]`, `List[T]`, `Dict[str, Any]`).
- **Pydantic V2**: Use `pydantic.BaseModel` for request/response schemas. Avoid deprecated Pydantic V1 methods like `.dict()` (use `.model_dump()`).
- **SQLAlchemy ORM**: Use SQLAlchemy 2.0 style queries (`select()`, `db.scalar()`, `db.scalars()`).

### 3.2 Security & API Design
- **Session & CSRF**: All state-mutating endpoints (`POST`, `PUT`, `DELETE`) must require authentication and CSRF token validation via `workflow_auth.py`.
- **Role Guards**: Wrap administrative or clinician endpoints with explicit role checks (`require_role("SUPER_ADMIN")`, `require_role("CLINICIAN")`).
- **Sanitization**: Sanitize input strings; restrict file uploads to verified MIME types (`application/pdf`, `image/png`, `image/jpeg`).
- **Environment Secrets**: Never hardcode API keys, database credentials, or secret keys in code. Load from environment variables.

---

## 4. AI Agents & Workflows

- **Deterministic Safety Gates**: AI agents that recommend clinical actions (e.g. Triage Council, Rx Extractor) must flag suggestions as **unverified** until confirmed by a licensed clinician via the Human-in-the-Loop Approval Console.
- **Graceful Fallback**: If an AI agent or LLM service is offline or unreachable, return structured fallback responses with clear user notifications.

---

## 5. Testing Requirements

- **Backend Tests**: Run `PYTHONPATH=backend backend/.venv/bin/pytest` and maintain 100% pass rate across all unit & integration tests.
- **Frontend Verification**: Run `npm run build` to verify zero TypeScript or Vite bundle errors.
- **Smoke Testing**: Run `node tests/workflow.smoke.mjs` when Playwright environment is available.
