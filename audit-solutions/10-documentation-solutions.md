# 10 — Documentation: Solutions

Answers [audit/10-documentation-audit.md](../audit/10-documentation-audit.md). Owns the **docs index**, **ADRs**, **plan-file sprawl**, and the architecture-claim corrections. Setup docs (TD-14) are owned by [09](09-installation-solutions.md); the onboarding guide by [08](08-developer-onboarding-solutions.md).

---

## 1. A docs index with status labels
Create `docs/README.md`:
```markdown
| Doc | Purpose | Status | Owner | Last reviewed |
|---|---|---|---|---|
| guides/CONTRIBUTING.md | setup + workflow | current | @… | 2026-10-.. |
| architecture/ARCHITECTURE.md | system overview | current | @… | |
| runbooks/* | ops | current | | |
| remediation-plan-2026-10-09.md | working plan | active | | |
| dead-code-2026-10-11.md | — | superseded by dead-code-2026-10-14.md → move to archive/ | | |
| P0_HOUSE_CONSTITUTION_CERTIFICATION.md | — | withdrawn → archive/ | | |
```
Rules:
- Every doc has one of these statuses: `current`, `active` (working plan), `superseded` (moved to `docs/archive/`) or `withdrawn` (moved to `docs/archive/`).
- A dated working file is superseded by its successor and moved, not left beside it.

**Effort:** S.

## 2. Architecture Decision Records
Create `docs/adr/NNNN-title.md` (template: Context / Decision / Consequences / Status). Seed ADRs from decisions already made in the plan files:

| ADR | Decision | Source |
|---|---|---|
| 0001 | Production deploy target: Helm **or** compose overlay (pick one; see [17](17-security-solutions.md) TD-16) | open decision |
| 0002 | `src/features/<domain>` is the only frontend architecture | [02](02-repository-structure-solutions.md) |
| 0003 | Backend domain packages inside one service; no microservices except M18 | [03](03-architecture-solutions.md) |
| 0004 | M18 will be a separate service with its own DB role | AGENTS.md g5 |
| 0005 | Dark mode supported; default Light until hex migration | remediation plan §3.4 |
| 0006 | Full en/te/hi translation; unreviewed languages gated | remediation plan §3.5, [27](27-i18n-accessibility-solutions.md) |
| 0007 | Microphone permission kept for planned calls | remediation plan 2026-10-13, [29](29-mobile-offline-solutions.md) |
| 0008 | Erasure keeps a sealed archive for N days | `services/erasure.py` docstring |
| 0009 | Clinician decision support deleted, not wired | remediation plan 2026-10-14 |

**Effort:** S.

## 3. Correct the architecture claims
| Claim | Fix |
|---|---|
| `AGENTS.md`: "FHIR R4 as the canonical clinical data model" | Change to "FHIR R4 is the target interchange model; the internal schema is `core/workflow_models.py`", or schedule the work |
| `AGENTS.md`: Rule L "enforced at Postgres grants" | True only after [16](16-database-solutions.md) TD-03; until then add "(not yet enforced — TD-03)" |
| `.cursorrules` links to root `CODING_STANDARDS.md` / `ARCHITECTURE.md` | Point to `docs/standards/CODING_STANDARDS.md` and `docs/architecture/ARCHITECTURE.md`, or delete `.cursorrules` if `AGENTS.md`/`CLAUDE.md` supersede it |
| `.cursorrules`: "Dev OTP Code is always `123456`" | Now true only with `SEED_DEMO_DATA` + `DEV_OTP_CONSOLE` (see [09](09-installation-solutions.md)) |
| `docs/guides/CLAUDE.md` duplicates `AGENTS.md` | Delete the copy; link instead |
| `docs/standards/code-review-checklist/` (Java/Maven) | Move to `docs/archive/` or delete |

**Effort:** S.

## 4. Move non-engineering content out
Revenue reports, ticket spreadsheets (`docs/tickets/*.xlsx`) and PR bodies (`docs/PR_BODY.md`, `docs/PR-*.md`) go to Drive/Notion/GitHub. Keep links in `docs/README.md` if needed. **Effort:** S.

## 5. Keep docs from rotting
- PR template checkbox: "Docs updated or N/A (which doc?)".
- CI: the doc string checks from [09](09-installation-solutions.md) plus a markdown link checker (`lychee`) on `README.md`, `docs/**/*.md` and `audit/**/*.md`.
- Quarterly: owners re-date the "Last reviewed" column.
