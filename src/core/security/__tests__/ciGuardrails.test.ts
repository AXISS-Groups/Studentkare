import { describe, it, expect, beforeEach } from 'vitest';
import { CIGuardrailLinter } from '../ciGuardrailLinter';

describe('P72 — Security Testing in CI & House Guardrails', () => {
  let linter: CIGuardrailLinter;

  beforeEach(() => {
    linter = CIGuardrailLinter.getInstance();
  });

  it('catches catch blocks that return permissive defaults (RULE_FAIL_CLOSED)', () => {
    const code = `
      try {
        verifyConsent();
      } catch (err) {
        return true; // INSECURE FAIL-OPEN!
      }
    `;

    const violations = linter.lintFileContent('src/core/auth/gate.ts', code);
    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('RULE_FAIL_CLOSED');
  });

  it('catches logging of PHI, ABHA IDs, or OTP codes (RULE_PHI_LOGGING)', () => {
    const code = `
      console.log("User signed in with abha_id:", abha_id);
    `;

    const violations = linter.lintFileContent('src/modules/m01-auth/auth.ts', code);
    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('RULE_PHI_LOGGING');
  });

  it('catches Rule L firewall violations when commercial modules import clinical layers (RULE_L_COMMERCE_FIREWALL)', () => {
    const code = `
      import { VaultRepository } from '../../m02-vault/data/vaultRepository';
    `;

    const violations = linter.lintFileContent('src/modules/m20-rewards/view/RewardsView.tsx', code);
    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('RULE_L_COMMERCE_FIREWALL');
  });

  it('catches TypeScript escape hatches like @ts-ignore (RULE_STRICT_TYPESCRIPT)', () => {
    const code = `
      // @ts-ignore
      const data = unsafeAny.getValue();
    `;

    const violations = linter.lintFileContent('src/core/data/repo.ts', code);
    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('RULE_STRICT_TYPESCRIPT');
  });

  it('passes clean compliant code with 0 violations', () => {
    const code = `
      try {
        verifyConsent();
      } catch (err) {
        return false; // Fail closed
      }
    `;

    const violations = linter.lintFileContent('src/core/auth/gate.ts', code);
    expect(violations.length).toBe(0);
  });
});
