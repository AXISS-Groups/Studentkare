## Summary
<!-- What changed, in 1–3 sentences. -->

## Why
<!-- Problem or ticket link. -->

## How it was tested
<!-- Commands run, test names, evaluation results for prompt/routing changes (HC-05, AGT-14). -->

## Rollback plan
<!-- How to revert safely (GEN-07). -->

## Required reviewer checks
<!-- Tick every box. If a check does not apply, tick it and append "N/A: <reason>". -->
- [ ] HC-01/HC-07: no credentials, real personal data, or production identifiers anywhere in the diff
- [ ] CMT-02: comments and docstrings next to changed code are still accurate
- [ ] CMT-05/CMT-07: public APIs and LLM-facing tool/agent descriptions are documented and accurate
- [ ] CC-06: no swallowed errors; causes preserved; cancellation re-raised
- [ ] GEN-02: authorization checked per resource; inputs validated; no injection paths
- [ ] GEN-07: API, event, and schema changes are backward compatible or versioned; migrations are lock-safe
- [ ] AGT-02/AGT-26: hard rules enforced in code; untrusted-content agents hold no privileged tools
- [ ] AGT-05/AGT-06/AGT-07: agent loops bounded (steps, time, budget); deadlines propagate; stuck runs detectable
- [ ] AGT-12/AGT-13/AGT-15: routing is validated with a default route; delegation has hop limits; typed envelopes
- [ ] AGT-16/AGT-17/AGT-20: state has single writers or merge rules, concurrency control, and tenant isolation
- [ ] AGT-21/AGT-22/AGT-23/AGT-24: side effects are idempotent across retries, redelivery, resume, and duplicate submission
- [ ] AGT-27: failure-injection tests cover the scenarios touched by this PR

## Waivers
<!-- WAIVER: <ID> | <file> | <reason> | <ticket> | approved: <handle> -->
