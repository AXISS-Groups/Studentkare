# Studentkare — student-owned health records platform for Indian campuses

React 18 + Vite frontend, FastAPI backend (see `docs/architecture/ARCHITECTURE.md`).
Docker is the recommended setup. Native Node/Python is a secondary option
(see `docs/guides/CONTRIBUTING.md`).

## Quick start (Docker)

Root `docker-compose.yml` is the development default (SQLite on the
`care-data` volume). Production stays separate via `docker-compose.prod.yml`
with vault-injected Postgres/secrets (see `.env.prod.example`).
Never use the dev `.env` in production.

**macOS / Linux / Git Bash** (WSL optional, not required):

```bash
git clone <repo>
cd Studentkare
cp .env.dev.example .env
docker compose up --build
```

**Windows PowerShell** (Docker Desktop):

```powershell
git clone <repo>
cd Studentkare
Copy-Item .env.dev.example .env
docker compose up --build
```

**Windows CMD** (Docker Desktop):

```cmd
git clone <repo>
cd Studentkare
copy .env.dev.example .env
docker compose up --build
```

Then open **http://localhost:3000** and check
**http://localhost:8000/api/health**.
Teardown keeps the volume: `docker compose down`.

## Docs

- Setup details (Docker + native): `docs/guides/CONTRIBUTING.md`
- Environment reference: `docs/integration-guide.md`
- Backend config schema: `backend/config/.env.example` (production reference only)

# Code review checklist bundle

`CODE_REVIEW_CHECKLIST.md` is the reviewer guide: 69 checkpoints across linting, hardcoding, comments, clean code, AI agent orchestration, and general practice. Paste it into your wiki. Every other file is extracted from its section 7 and goes into your repository at the path shown.

| File | Where it goes | Note |
|---|---|---|
| `eslint.config.mjs` | repo root | ESLint 9.22+ with typescript-eslint |
| `pylint.pyproject.toml` | merge into `pyproject.toml` | fragment, not a standalone file |
| `.flake8` | repo root | needs bugbear, bandit, eradicate plugins |
| `checkstyle.xml` | repo root | referenced by the Maven Checkstyle plugin |
| `pom-plugins.snippet.xml` | merge into `pom.xml` under `<build>` | Checkstyle, SpotBugs + FindSecBugs, Spotless; set the version properties |
| `spotbugs-exclude.xml` | repo root | may only shrink (LINT-09) |
| `.gitleaks.toml` | repo root | replace the `acme` token pattern with your own formats |
| `.semgrep/review-checklist.yml` | `.semgrep/` | 24 checklist rules |
| `.github/workflows/code-review-gates.yml` | `.github/workflows/` | delete jobs for languages you don't use |
| `.github/pull_request_template.md` | `.github/` | the attestation job reads its checkboxes |
| `requirements-dev.txt` | repo root | replace minimums with exact pins |
| `review-checklist.yml` | anywhere | machine-readable manifest of all 69 checkpoints |
| `scripts/generate_manifest.py` | `scripts/` | regenerates the manifest after editing the checklist |

## What was verified

- Semgrep 1.177: all 24 rules pass `semgrep --test` against positive and negative fixtures in Python, TypeScript, and Java.
- ESLint 9.39 + typescript-eslint, Pylint 4.0, flake8 7.3, Checkstyle 10.26: configs load and flag planted violations.
- gitleaks 8.30: custom rule and defaults fire; `.env.example` is allowlisted.
- actionlint 1.7: workflow is clean. The PR size, attestation, and TODO-format scripts were run against a local git repo.
- `spotbugs-exclude.xml` validates against the SpotBugs filter schema.

Not executed: SpotBugs analysis and the Maven plugin snippet (XML-validated only), `npm audit`/`pip-audit`, diff-cover, and the jobs on GitHub-hosted runners. Run the workflow once on a test PR before making it a required check.

## Adopting it

1. Start with the workflow jobs set to required only for `secrets`, `semgrep`, and your languages' lint jobs.
2. Run on existing code, record current debt as a baseline, then apply LINT-09 (debt may only shrink).
3. Turn on `manual-attestation` and `comment-hygiene` once the team has used the PR template for a sprint.
