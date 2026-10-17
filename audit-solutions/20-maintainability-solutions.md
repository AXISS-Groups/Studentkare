# 20 — Maintainability: Solutions

Answers [audit/20-maintainability.md](../audit/20-maintainability.md). This file owns a **burn-down of the tribal-knowledge list**: each item that only someone who knows the history could tell you, turned into a code change, a document or a test.

| # | Tribal knowledge (from audit 20) | Eliminated by | Owner |
|---|---|---|---|
| 1 | `src/modules` is dead | delete it, plus an import ban | [02](02-repository-structure-solutions.md) TD-06 |
| 2 | `src/data/api.ts` is live, `services/api.ts` is not | delete the unimported copy | [05](05-code-quality-solutions.md) TD-17 |
| 3 | Some vendor screens are mock-only | connect them, or show "not connected" | [04](04-mvvm-solutions.md) TD-09 |
| 4 | Safety-named backend modules are unused | delete or wire them, plus the reachability test | [03](03-architecture-solutions.md) TD-08 |
| 6 | Dev `create_all`, prod Alembic, tests on SQLite | Alembic everywhere, tests on Postgres | [16](16-database-solutions.md) TD-11 |
| 7 | Demo mode needs two flags only the Vite spawn sets | set them in `.env.dev.example` | [09](09-installation-solutions.md) TD-41 |
| 8 | `npm run dev` silently starts a SQLite backend | make it opt-in and log it loudly | [21](21-developer-experience-solutions.md) TD-28 |
| 9 | Which deploy target is real | ADR-0001 | [10](10-documentation-solutions.md) |
| 10 | `OTP_HASH_SECRET` **or** `JWT_SECRET` | name one in the settings module; deprecate the alias | [25](25-environment-configuration-solutions.md) |
| 11 | 2FA needs a key no deploy config sets | keys in configs, plus a startup report | [25](25-environment-configuration-solutions.md) TD-40 |
| new | Which dated plan doc in `docs/` is current | docs index with status labels | [10](10-documentation-solutions.md) |
| new | `features/health/module.ts` holds every role's routes | per-domain modules | [07](07-collaboration-solutions.md) TD-25 |

**Done when:** a new engineer's questions in their first two weeks don't need any item on this list. Track that in the onboarding retro ([24](24-new-developer-test-solutions.md)).

## Comments and docs that describe intent, not behaviour
- Review rule: a PR that changes behaviour updates the docstrings and comments on the lines it touches. Reviewers block on stale comments.
- Fix the known one now: the `main.py` comment "Seed demo accounts only when explicitly enabled" is accurate since `d92e2ef`. Re-check every "fail-closed" comment in `main.py` lifespan. For example, "fail-closed: never breaks startup" describes fail-open behaviour; reword it to "best-effort".

## Keep what's good
The fail-closed and "honesty" docstrings in the new services (`erasure.py`, `check_in_pass.py`, `emergency_api.py`, `twofa_store.py`) are the best maintainability asset in the repo. Make that docstring style ("what this guarantees, and what happens on failure") the standard in `docs/standards/CODING_STANDARDS.md`.

## Signal-to-noise metric
Track monthly in `audit/`:
- unreachable backend modules (target 0);
- Knip unused files (target under 20);
- shims (target 0);
- legacy-list sizes: hex, icons, any (shrinking only);
- TSX files over 500 lines.
