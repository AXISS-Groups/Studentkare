# 22 — Technical Debt: Register → Solution Map

Answers [audit/22-technical-debt.md](../audit/22-technical-debt.md). Every finding in the audit register maps to exactly one solution. Priorities: **P0** this week, **P1** before team growth, **P2** normal development, **P3** long-term. Effort figures are estimates.

| ID | Finding (short) | Audit status | Solution | Priority | Effort |
|---|---|---|---|---|---|
| TD-01 | Env gating, residual `APP_ENV` default | PARTIALLY RESOLVED | [25 · ENV-01](25-environment-configuration-solutions.md) | P1 | S |
| TD-02 | CI ignores `development` | OPEN | [18 · TD-39 + TD-02](18-cicd-deployment-solutions.md) | **P0** | S |
| TD-03 | Rule L not in Postgres | OPEN | [16 · TD-03](16-database-solutions.md) | P1 | M–L |
| TD-04 | 2FA in memory | RESOLVED | — | — | — |
| TD-05 | Credential in history | NOT REVALIDATED | [11 · TD-05](11-git-workflow-solutions.md) | **P0** | S |
| TD-06 | Three frontend trees | OPEN | [02 · TD-06](02-repository-structure-solutions.md) | P1 | M |
| TD-07 | Monolithic backend files | OPEN | [03 · TD-07](03-architecture-solutions.md) | P1 | L |
| TD-08 | Unreachable backend modules | OPEN | [03 · TD-08](03-architecture-solutions.md) | P1 | S–M |
| TD-09 | Demo vendor screens | PARTIALLY RESOLVED | [04 · TD-09](04-mvvm-solutions.md) | P2 | M–L |
| TD-10 | Rate limit on proxy IP | OPEN | [17 · TD-10](17-security-solutions.md) | **P0** | S |
| TD-11 | Schema paths differ | OPEN | [16 · TD-11](16-database-solutions.md) | P1 | M |
| TD-12 | Migrations on every replica | OPEN | [16 · TD-12](16-database-solutions.md) | P1 | S–M |
| TD-13 | No typed API contract | OPEN | [15 · TD-13](15-api-solutions.md) | P1 | M |
| TD-14 | Setup docs wrong | OPEN | [09 · TD-14](09-installation-solutions.md) | **P0** | S |
| TD-15 | Identifiers in logs | PARTIALLY RESOLVED | [14 · TD-15](14-error-handling-logging-solutions.md) | P2 | S |
| TD-16 | Prod compose exposure | OPEN | [17 · TD-16](17-security-solutions.md) | **P0** | S |
| TD-17 | Duplicate API client + shims | OPEN | [05 · TD-17](05-code-quality-solutions.md) | P1 | S–M |
| TD-18 | DPDP router unmounted | SUPERSEDED → RESOLVED | — | — | — |
| TD-19 | Silent catch / fake success | PARTIALLY RESOLVED | [14 · TD-19](14-error-handling-logging-solutions.md) | P2 | M |
| TD-20 | Stores seeded from mockData | PARTIALLY RESOLVED | [04 · TD-20](04-mvvm-solutions.md) | P2 | S |
| TD-21 | `NullPool` everywhere | OPEN | [16 · TD-21](16-database-solutions.md) | P2 | S |
| TD-22 | No CD / tags | OPEN | [18 · TD-22](18-cicd-deployment-solutions.md) | P1 | M |
| TD-23 | Weak lint, Knip non-blocking | PARTIALLY RESOLVED | [05 · TD-23](05-code-quality-solutions.md) | P2 | S + ongoing |
| TD-24 | Raw hex | PARTIALLY RESOLVED | [26 · TD-24](26-design-system-solutions.md) | P3 | M |
| TD-25 | Central routing hotspots | OPEN | [07 · TD-25](07-collaboration-solutions.md) | P1 | M |
| TD-26 | Self-certification | RESOLVED | ([06](06-ai-vibe-code-solutions.md): CI guardrail report replaces it) | — | — |
| TD-27 | Plaintext documents | OPEN | [28 · TD-27](28-privacy-solutions.md) | P2 | M–L |
| TD-28 | No HMR, hidden Vite backend | OPEN | [21 · TD-28](21-developer-experience-solutions.md) | P1 | S |
| TD-29 | Firebase client | OPEN | [17 · TD-29](17-security-solutions.md) | P2 | S |
| TD-30 | No E2E in CI | OPEN | [13 · TD-30](13-testing-solutions.md) | P1 | M |
| TD-31 | AI constitution not wired | OPEN | [17 · TD-31](17-security-solutions.md) | P2 (P0 before any LLM ships) | M |
| TD-32 | Root clutter | OPEN | [02 · TD-32](02-repository-structure-solutions.md) | P2 | S |
| TD-33 | Design archive size | OPEN | [26 · DS-03](26-design-system-solutions.md) | P3 | S–M |
| TD-34 | Name drift | OPEN | [01 · TD-34](01-technology-stack-solutions.md) | P3 | S |
| TD-35 | `any` / `@ts-ignore` | PARTIALLY RESOLVED | [05 · TD-35](05-code-quality-solutions.md) | P2 | S + ongoing |
| TD-36 | Stale branches | OPEN | [11 · TD-36](11-git-workflow-solutions.md) | P3 | S |
| TD-37 | Client "auth managers" | OPEN | [06 · TD-37](06-ai-vibe-code-solutions.md) | P2 | S |
| TD-38 | Mixed timestamps | OPEN | [16 · TD-38](16-database-solutions.md) | P3 | M |
| TD-39 | CI red at icon audit | OPEN | [18 · TD-39](18-cicd-deployment-solutions.md) + [26 · TD-43](26-design-system-solutions.md) | **P0** | S |
| TD-40 | Feature keys missing in deploy | OPEN | [25 · TD-40](25-environment-configuration-solutions.md) | **P0** | S |
| TD-41 | Docker dev cannot sign in | OPEN | [09 · TD-41](09-installation-solutions.md) | **P0** | S |
| TD-42 | localStorage bearer token | OPEN | [17 · TD-42](17-security-solutions.md) | P2 | S |
| TD-43 | Design proof-of-done unreachable | OPEN | [26 · TD-43](26-design-system-solutions.md) | **P0** (unblocks TD-39) | S |
| TD-44 | Unreviewed te/hi on Tier 1 | OPEN | [27 · TD-44](27-i18n-accessibility-solutions.md) | P1 | S + review |
| TD-45 | Native not type-checked | OPEN | [18 · TD-45](18-cicd-deployment-solutions.md) | P1 | S |
| TD-46 | Bus factor | OPEN | [07 · TD-46](07-collaboration-solutions.md) | P1 | ongoing |
| TD-47 | Campus consoles without consent | NOT REVALIDATED | [28 · TD-47](28-privacy-solutions.md) | P1 (before wiring) | M |

## Report-local findings

| ID | Solution | Priority |
|---|---|---|
| ENV-04 typed settings, ENV-05 alert webhook | [25](25-environment-configuration-solutions.md) | P1 / P2 |
| DS-04 icon bundle, DS-05 Storybook CI | [26](26-design-system-solutions.md) | P2 |
| I18N-02 server error localisation; A11Y-01 / A11Y-02 | [27](27-i18n-accessibility-solutions.md) | P2 |
| PRIV-03 archive key custody, PRIV-06 SOS disclosure | [28](28-privacy-solutions.md) | P1 / P2 |
| MOB-02 microphone, MOB-03 device checks, MOB-04 Expo config | [29](29-mobile-offline-solutions.md) | P2 (P1 before store submission) |
| SCALE-01 SOS sends in request | [19](19-scalability-solutions.md) | P1 |

## Debt budget rule
To keep debt from growing again while features ship:
- Reserve about 20% of each sprint for P1/P2 items from this map.
- A PR that touches a file on a legacy list (hex, icons, any) or a large file leaves it better: removes it from the list or extracts at least one piece. Reviewers enforce this.
- Re-run the audit scans monthly and update `audit/22-technical-debt.md` statuses (see `audit/README.md` "How this audit is maintained").
