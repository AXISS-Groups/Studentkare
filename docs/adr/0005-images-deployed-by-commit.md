# 0005. Images are built once per green commit and deployed by SHA

- **Status:** Proposed (branch `ci/release-images-by-sha`)
- **Date:** 2026-10-19
- **Deciders:** pending review

## Context
Helm deployed `studentkare/*:latest` with `pullPolicy: Always`. Nobody could tell which commit
was running, and rolling back meant rebuilding (audit TD-22).

## Decision
`.github/workflows/release.yml` builds the backend and frontend images after CI passes on
`main` and pushes `ghcr.io/<owner>/studentkare-*:sha-<12-char commit>`. A `v*` tag adds a
version tag to the same build. The Helm chart has no default tag and refuses to render without
one. `GET /api/info` reports the commit.

## Consequences
- A rollback is a redeploy of the previous SHA. That only works when the migrations in between
  are backwards-compatible.
- GHCR package visibility and pull credentials must be set up once per cluster.
