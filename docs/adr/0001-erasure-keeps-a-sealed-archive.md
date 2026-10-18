# 0001. DPDP erasure keeps a sealed, time-limited archive

- **Status:** Accepted
- **Date:** recorded 2026-10-19 (the decision predates this record)
- **Deciders:** repository owner, as named Tier 1 reviewer (`backend/services/erasure.py` docstring)

## Context
Students can delete their account (DPDP Act 2023). The operator may still need the data for a
limited period, for example for a dispute or a legal hold.

## Decision
Seven days after a deletion request, every row reachable from the account is removed from the
live tables. A Fernet-encrypted archive of those rows is kept for `DPDP_ARCHIVE_RETENTION_DAYS`.
Only a super admin can open it, and they must record a reason. It is then destroyed. The student
is told this, including the number of days. Without a valid key and retention period, nothing
is erased (fail closed), and a CRITICAL ops event says so (audit JOB-04).

## Consequences
- `DPDP_ARCHIVE_KEY` must be present in the backend **and** the worker (audit TD-40).
- The retention period is a legal choice and must match the privacy notice.
- A blocked erasure is a statutory-deadline risk, so it pages ops.
