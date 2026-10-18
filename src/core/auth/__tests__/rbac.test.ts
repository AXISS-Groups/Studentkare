import { describe, it, expect } from 'vitest';
import { RBACManager } from '../rbac';

describe('RBACManager (P48)', () => {
  const rbac = RBACManager.getInstance();

  it('denies clinical read permission to support role (P48 Rule)', () => {
    expect(rbac.hasPermission('support', 'read:operational_metadata')).toBe(true);
    expect(rbac.hasPermission('support', 'read:consented_clinical')).toBe(false);
    expect(rbac.hasPermission('support', 'read:own_clinical')).toBe(false);
  });

  it('denies direct clinical access to super admin (P48 Rule)', () => {
    expect(rbac.hasPermission('super_admin', 'read:operational_metadata')).toBe(true);
    expect(rbac.hasPermission('super_admin', 'read:consented_clinical')).toBe(false);
  });

  it('holds no client-side break-glass sessions (audit TD-37)', () => {
    expect('invokeBreakGlass' in rbac).toBe(false);
  });
});
