# 08 — Developer Onboarding: Solutions

Answers [audit/08-developer-onboarding.md](../audit/08-developer-onboarding.md). Most root causes are owned elsewhere:

| Cause | Owner |
|---|---|
| Setup docs, dev sign-in (TD-14, TD-41) | [09](09-installation-solutions.md) |
| Dead architecture and scaffolder (TD-06) | [02](02-repository-structure-solutions.md) |
| CI (TD-02, TD-39) | [18](18-cicd-deployment-solutions.md) |
| Dev loop (TD-28) | [21](21-developer-experience-solutions.md) |

This file owns the **onboarding guide** itself.

---

## Write `docs/onboarding/README.md` (single entry point)

Linked from line 3 of the README. Sections:
1. **What Studentkare is.** One paragraph, the five roles (student, doctor, partner, campus admin, super admin), and what is real versus not connected yet.
2. **Run it.** Link to the README quick start, then the demo logins table (once [09](09-installation-solutions.md) TD-41 is done).
3. **Map of the code.** The target layout from [02](02-repository-structure-solutions.md). Until the deletions land, include a "**Do not edit**" list: `src/modules/`, `src/data/api.ts` vs `src/data/services/api.ts` (say which is live), and the unreachable backend modules.
4. **Build a feature end to end.** A worked example in this order:
   - backend `app/<domain>/router.py` + `schemas.py` + Alembic revision ([16](16-database-solutions.md));
   - regenerate the TS client ([15](15-api-solutions.md));
   - repository → ViewModel → view ([04](04-mvvm-solutions.md));
   - `module.ts` route ([07](07-collaboration-solutions.md));
   - i18n keys in `src/i18n/areas/` ([27](27-i18n-accessibility-solutions.md));
   - icons per `CLAUDE.md` ([26](26-design-system-solutions.md));
   - tests.

   Link to a real merged PR that followed it.
5. **Safety rules.** The 10 AGENTS.md guardrails in one line each, plus the Tier 1 review rule.
6. **How to ship.** Branch naming; PR into `development`; required checks; CODEOWNERS review ([11](11-git-workflow-solutions.md)).
7. **Where to ask / what's current.** `audit/README.md`, `docs/README.md` index ([10](10-documentation-solutions.md)).

**Verify:** the onboarding test in [24](24-new-developer-test-solutions.md), run with a real new hire. **Effort:** S (first draft) after the [09](09-installation-solutions.md) fixes.

---

## Scaffolder
Covered by [02](02-repository-structure-solutions.md) step 2. Additionally, `npm run gen:module <name>` prints the next steps: where to add the route, the i18n keys, and the implementation-map entry.

## Onboarding checklist (first week)
- [ ] Day 1: stack running, signed in as each demo role.
- [ ] Day 1: read the onboarding README and `AGENTS.md`.
- [ ] Day 2: a small PR (a docs fix or a migration off one legacy-list file) through the full CI and review loop.
- [ ] Days 3–5: a ticket in one domain, paired with its CODEOWNER.
