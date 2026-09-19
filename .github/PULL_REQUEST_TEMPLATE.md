## Pull Request Description

### Summary of Changes
- 

---

### Mandatory P0 House Constitution Checklist

- [ ] **Fail Closed**: Security and auth checks fail closed on errors.
- [ ] **No Auth Fallback**: Rejected or expired OTPs/tokens never grant a session.
- [ ] **Rule L Firewall**: Clinical data strictly separated from commercial surfaces.
- [ ] **No Hardcoded Compliance**: Compliance states are computed from evidence.
- [ ] **Accessibility**: Interactive elements carry accessible roles and hit targets ≥ 44x44.
- [ ] **Anti-PHI Logging**: Zero PHI, tokens, or ABHA identifiers in logs.
- [ ] **Strict TypeScript**: Zero `any`, `@ts-ignore`, or non-null `!` assertions across boundaries.

---

### Verification
- [ ] `npx tsc --noEmit` passed cleanly.
- [ ] `npm run test` passed 100%.
