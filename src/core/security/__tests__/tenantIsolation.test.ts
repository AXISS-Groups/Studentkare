import { describe, it, expect, beforeEach } from 'vitest';
import { TenantIsolationGuard, TenantContext, ConsentRecord } from '../tenantIsolationGuard';

describe('TenantIsolationGuard (P47)', () => {
  let guard: TenantIsolationGuard;

  beforeEach(() => {
    guard = new TenantIsolationGuard();
  });

  it('allows students to access their own health records', () => {
    const studentContext: TenantContext = {
      tenantId: 'IIT-DELHI-CAMPUS',
      studentId: 'STUDENT-101',
      role: 'student'
    };

    const result = guard.evaluateAccess(studentContext, 'STUDENT-101', 'full_phi');
    expect(result.allowed).toBe(true);
    expect(result.rlsPolicyApplied).toBe('RLS_STUDENT_SELF_OWNERSHIP');
  });

  it('denies cross-student data access by default', () => {
    const studentContext: TenantContext = {
      tenantId: 'IIT-DELHI-CAMPUS',
      studentId: 'STUDENT-101',
      role: 'student'
    };

    const result = guard.evaluateAccess(studentContext, 'STUDENT-202', 'vital_signs');
    expect(result.allowed).toBe(false);
    expect(result.rlsPolicyApplied).toBe('RLS_DENY_CROSS_STUDENT_ACCESS');
  });

  it('denies campus officer access without active unexpired consent', () => {
    const officerContext: TenantContext = {
      tenantId: 'IIT-DELHI-CAMPUS',
      studentId: 'OFFICER-99',
      role: 'campus_health_officer'
    };

    const result = guard.evaluateAccess(officerContext, 'STUDENT-101', 'vaccine_records');
    expect(result.allowed).toBe(false);
    expect(result.rlsPolicyApplied).toBe('RLS_DENY_MISSING_TENANT_CONSENT');
  });

  it('grants campus officer access when valid active consent exists', () => {
    const consent: ConsentRecord = {
      consentId: 'CONSENT-10001',
      studentId: 'STUDENT-101',
      tenantId: 'IIT-DELHI-CAMPUS',
      scope: ['vaccine_records'],
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };
    guard.grantConsent(consent);

    const officerContext: TenantContext = {
      tenantId: 'IIT-DELHI-CAMPUS',
      studentId: 'OFFICER-99',
      role: 'campus_health_officer'
    };

    const result = guard.evaluateAccess(officerContext, 'STUDENT-101', 'vaccine_records');
    expect(result.allowed).toBe(true);
    expect(result.rlsPolicyApplied).toBe('RLS_GRANT_CONSENTED_INSTITUTION_ACCESS');
  });

  it('revokes institutional consent automatically upon graduation', () => {
    const consent: ConsentRecord = {
      consentId: 'CONSENT-GRAD-1',
      studentId: 'STUDENT-GRADUATING',
      tenantId: 'IIT-DELHI-CAMPUS',
      scope: ['full_phi'],
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };
    guard.grantConsent(consent);

    const sim = guard.simulateGraduation('STUDENT-GRADUATING');
    expect(sim.revokedCount).toBe(1);

    const officerContext: TenantContext = {
      tenantId: 'IIT-DELHI-CAMPUS',
      studentId: 'OFFICER-99',
      role: 'campus_health_officer'
    };

    const result = guard.evaluateAccess(officerContext, 'STUDENT-GRADUATING', 'full_phi');
    expect(result.allowed).toBe(false);
    expect(result.rlsPolicyApplied).toBe('RLS_DENY_MISSING_TENANT_CONSENT');
  });
});
