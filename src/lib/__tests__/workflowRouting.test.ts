import { describe, expect, it } from 'vitest';
import { canAccessRoute, homeForRole, routePaths } from '../workflowRouting';
import type { AccountRole } from '../../data/workflowTypes';


describe('Authenticated workspace routing', () => {
  it('allows public catalog access but requires login for private information', () => {
    expect(canAccessRoute('shop', null)).toBe(true);
    expect(canAccessRoute('care', null)).toBe(true);
    for (const path of ['health', 'records', 'insurance', 'orders', 'checkout', 'movement', 'admin', 'vendor', 'clinician'] as const) {
      expect(canAccessRoute(path, null)).toBe(false);
    }
  });

  it('does not grant administrative access through a client-side role switch', () => {
    const roles: AccountRole[] = ['STUDENT', 'VENDOR', 'NMC_DOCTOR', 'CAMPUS_ADMIN'];
    for (const role of roles) {
      for (const route of routePaths.filter(path => path.startsWith('admin'))) expect(canAccessRoute(route, role)).toBe(false);
    }
    expect(canAccessRoute('admin/accounts', 'SUPER_ADMIN')).toBe(true);
  });

  it('routes each server-assigned role to its own permitted workspace', () => {
    const roles: AccountRole[] = ['STUDENT', 'VENDOR', 'NMC_DOCTOR', 'CAMPUS_ADMIN', 'SUPER_ADMIN'];
    expect(new Set(routePaths).size).toBe(routePaths.length);
    for (const role of roles) expect(canAccessRoute(homeForRole(role), role)).toBe(true);
    expect(homeForRole('VENDOR')).toBe('vendor');
    expect(homeForRole('NMC_DOCTOR')).toBe('clinician');
    expect(canAccessRoute('vendor', 'STUDENT')).toBe(false);
    expect(canAccessRoute('clinician', 'VENDOR')).toBe(false);
  });
});
