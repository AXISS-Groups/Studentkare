# Secure Software Development Lifecycle (SSDLC) Guidelines

**Version**: 1.0  
**Enforcement**: Mandatory for all pull requests

---

## 1. Security Definition of Done (DoD)

Before any code is merged into `main`:
1. **P0 House Constitution Compliance**: All 10 non-negotiable guardrails verified.
2. **Fail-Closed Verification**: Deny-by-default logic tested for all authentication, authorization, and crisis gates.
3. **No Log Exposure**: Zero PHI, tokens, secrets, or ABHA numbers printed to log outputs.
4. **Automated Test Coverage**: Vitest suite passes 100% with no skipped or muted security assertions.
5. **Static Analysis**: `npx tsc --noEmit` and custom security linters pass with zero warnings.

---

## 2. Threat Modeling Triggers

A threat modeling review (P65) is **mandatory** whenever a PR:
- Introduces a new external API or third-party integration.
- Modifies RBAC roles or auth token rotation.
- Changes database schemas containing student PHI or consent records.
