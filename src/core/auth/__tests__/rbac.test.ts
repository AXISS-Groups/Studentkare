import { describe, it, expect, beforeEach } from 'vitest';
import { RBACManager } from '../rbac';

describe('RBACManager (P48)', () => {
  let rbac: RBACManager;

  beforeEach(() => {
    rbac = RBACManager.getInstance();
    rbac.resetForTesting();
  });

  it('denies clinical read permission to support role (P48 Rule)', () => {
    expect(rbac.hasPermission('support', 'read:operational_metadata')).toBe(true);
    expect(rbac.hasPermission('support', 'read:consented_clinical')).toBe(false);
    expect(rbac.hasPermission('support', 'read:own_clinical')).toBe(false);
  });

  it('denies direct clinical access to super admin without break-glass (P48 Rule)', () => {
    expect(rbac.hasPermission('super_admin', 'read:operational_metadata')).toBe(true);
    expect(rbac.hasPermission('super_admin', 'read:consented_clinical')).toBe(false);
  });

  it('invokes break-glass emergency access and logs loud audit trail (P48)', async () => {
    const session = await rbac.invokeBreakGlass(
      'doc_emergency_99',
      'student_icu_101',
      'Acute trauma emergency in SNIST health center requiring immediate vitals access',
      15
    );

    expect(session.sessionId).toContain('bg_');
    expect(rbac.isBreakGlassActive(session.sessionId)).toBe(true);
  });

  it('rejects break-glass invocation without detailed clinical reason', async () => {
    await expect(
      rbac.invokeBreakGlass('doc_1', 'student_1', 'too short')
    ).rejects.toThrow(/\[P48 Violation\]/);
  });
});
