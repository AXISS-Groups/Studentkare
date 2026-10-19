# 0004. Migrations run once per deploy under an advisory lock

- **Status:** Proposed (branch `fix/migrations-once-per-deploy`)
- **Date:** 2026-10-19
- **Deciders:** pending review

## Context
Production ran `alembic upgrade head` in every backend replica's startup, so several replicas
could migrate at the same time. A separate migration job would need different wiring for
Compose, Dokploy and Helm.

## Decision
Startup still runs the migration, but inside a Postgres advisory lock (`MIGRATION_LOCK_KEY`).
The first replica migrates, and the others wait and then find the schema already at head. The
Rule L grants are reapplied under the same lock. Development builds its schema through
migrations too, not `create_all`.

## Consequences
- Works on every deploy target without extra jobs.
- A long migration delays every replica's readiness. Keep migrations short, and backfill data
  separately.
