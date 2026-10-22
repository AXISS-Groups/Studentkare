import { describe, expect, it } from 'vitest';
import { canAccessRoute, homeForRole, routePaths } from '../utils/workflowRouting';
import type { AccountRole } from '../../data/types/workflowTypes';


describe('Authenticated workspace routing', () => {
  it('allows public catalog access but requires login for private information', () => {
    expect(canAccessRoute('shop', null)).toBe(true);
    expect(canAccessRoute('care', null)).toBe(true);
    for (const path of ['health', 'records', 'insurance', 'orders', 'checkout', 'movement', 'admin', 'vendor', 'clinician'] as const) {
      expect(canAccessRoute(path, null)).toBe(false);
    }
  });

  it('opens partner consoles to partners and the super admin only, as the route registry does', () => {
    for (const path of ['dispensing', 'rx-review'] as const) {
      expect(canAccessRoute(path, 'VENDOR')).toBe(true);
      expect(canAccessRoute(path, 'SUPER_ADMIN')).toBe(true);
      for (const role of [null, 'STUDENT', 'CAMPUS_ADMIN', 'COUNSELLOR', 'NMC_DOCTOR'] as const) expect(canAccessRoute(path, role), `${path} ${role}`).toBe(false);
    }
  });

  it('opens leaving campus, account deletion and the student requests to students only', () => {
    for (const path of ['leave-campus', 'delete-account', 'my-requests', 'return-request', 'hostel-visit', 'refill-request'] as const) {
      expect(canAccessRoute(path, 'STUDENT'), path).toBe(true);
      for (const role of [null, 'SUPER_ADMIN', 'CAMPUS_ADMIN', 'COUNSELLOR', 'VENDOR', 'NMC_DOCTOR'] as const) expect(canAccessRoute(path, role), `${path} ${role}`).toBe(false);
    }
  });

  it('opens the MEO console to campus admins, doctors and the super admin only', () => {
    for (const role of ['CAMPUS_ADMIN', 'NMC_DOCTOR', 'SUPER_ADMIN'] as const) expect(canAccessRoute('meo', role), role).toBe(true);
    for (const role of [null, 'STUDENT', 'COUNSELLOR', 'VENDOR'] as const) expect(canAccessRoute('meo', role), `${role}`).toBe(false);
  });

  it('does not grant administrative access through a client-side role switch', () => {
    const roles: AccountRole[] = ['STUDENT', 'VENDOR', 'NMC_DOCTOR', 'CAMPUS_ADMIN', 'COUNSELLOR'];
    for (const role of roles) {
      for (const route of routePaths.filter(path => path.startsWith('admin'))) expect(canAccessRoute(route, role)).toBe(false);
    }
    expect(canAccessRoute('admin/accounts', 'SUPER_ADMIN')).toBe(true);
  });

  it('routes each server-assigned role to its own permitted workspace', () => {
    const roles: AccountRole[] = ['STUDENT', 'VENDOR', 'NMC_DOCTOR', 'CAMPUS_ADMIN', 'COUNSELLOR', 'SUPER_ADMIN'];
    expect(new Set(routePaths).size).toBe(routePaths.length);
    for (const role of roles) expect(canAccessRoute(homeForRole(role), role)).toBe(true);
    expect(homeForRole('VENDOR')).toBe('vendor');
    expect(homeForRole('NMC_DOCTOR')).toBe('clinician');
    expect(canAccessRoute('vendor', 'STUDENT')).toBe(false);
    expect(canAccessRoute('clinician', 'VENDOR')).toBe(false);
    for (const path of ['campus', 'campus/students', 'campus/water', 'campus-access-requests', 'campus-break-glass'] as const) expect(canAccessRoute(path, 'STUDENT')).toBe(false);
    // A campus administrator signs in to the campus console's Overview.
    expect(homeForRole('CAMPUS_ADMIN')).toBe('campus');
  });

  it('sends a lab collector to the staff app\'s Collect board, and keeps it out of the partner console (live-run audit #6)', () => {
    expect(homeForRole('LAB_COLLECTOR')).toBe('staff-collect');
    for (const route of ['staff-collect', 'staff-verify', 'staff-handover'] as const) expect(canAccessRoute(route, 'LAB_COLLECTOR'), route).toBe(true);
    for (const route of ['vendor', 'staff', 'run-sheet', 'admin', 'clinician', 'health/trends'] as const) expect(canAccessRoute(route, 'LAB_COLLECTOR'), route).toBe(false);
  });

  it('sends a counsellor to the crisis queue, and keeps that queue from every campus admin', () => {
    expect(homeForRole('COUNSELLOR')).toBe('counsellor');
    expect(canAccessRoute('counsellor', 'COUNSELLOR')).toBe(true);
    expect(canAccessRoute('counsellor', 'SUPER_ADMIN')).toBe(true);
    for (const role of ['STUDENT', 'VENDOR', 'NMC_DOCTOR', 'CAMPUS_ADMIN'] as const) expect(canAccessRoute('counsellor', role)).toBe(false);
    expect(canAccessRoute('counsellor', null)).toBe(false);
    // A counsellor is not a campus administrator: no campus hub, access requests or break-glass.
    for (const path of ['campus', 'campus/counsellor', 'campus/insights', 'campus-access-requests', 'campus-break-glass', 'campus-wellness'] as const) expect(canAccessRoute(path, 'COUNSELLOR')).toBe(false);
  });

  it('keeps every clinician console page doctor-only', () => {
    const clinicianPages = routePaths.filter(path => path === 'clinician' || path.startsWith('clinician/'));
    expect(clinicianPages).toContain('clinician/queue');
    for (const route of clinicianPages) {
      expect(canAccessRoute(route, 'NMC_DOCTOR')).toBe(true);
      for (const role of [null, 'STUDENT', 'VENDOR', 'CAMPUS_ADMIN', 'SUPER_ADMIN'] as const) expect(canAccessRoute(route, role)).toBe(false);
    }
  });
});
