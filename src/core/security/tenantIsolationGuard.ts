/**
 * Tenant Isolation Guard — P47 Multi-Tenancy & Institution Isolation
 * 
 * Enforces student ownership of health data. Campus institutions get access ONLY
 * with explicit, active, non-expired consent. Implements RLS policy checks,
 * cross-tenant data leakage prevention, and automatic access expiration upon graduation.
 */

export interface TenantContext {
  tenantId: string; // Campus / institution ID
  studentId: string; // Student owner ID
  role: 'student' | 'campus_health_officer' | 'system_admin';
}

export interface ConsentRecord {
  consentId: string;
  studentId: string;
  tenantId: string;
  scope: Array<'vital_signs' | 'vaccine_records' | 'consultations' | 'full_phi'>;
  expiresAt: string; // ISO Timestamp
  revokedAt?: string;
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  rlsPolicyApplied: string;
}

export class TenantIsolationGuard {
  private activeConsents: Map<string, ConsentRecord> = new Map();

  /**
   * Registers a student consent grant for an institution
   */
  public grantConsent(consent: ConsentRecord): void {
    if (new Date(consent.expiresAt).getTime() <= Date.now()) {
      throw new Error('Cannot register an expired consent record');
    }
    this.activeConsents.set(consent.consentId, consent);
  }

  /**
   * Revokes student consent for an institution
   */
  public revokeConsent(consentId: string): boolean {
    const consent = this.activeConsents.get(consentId);
    if (!consent) return false;
    consent.revokedAt = new Date().toISOString();
    this.activeConsents.set(consentId, consent);
    return true;
  }

  /**
   * Evaluates query access against RLS policy fail-closed rules
   */
  public evaluateAccess(
    context: TenantContext,
    targetStudentId: string,
    requestedScope: 'vital_signs' | 'vaccine_records' | 'consultations' | 'full_phi'
  ): AccessDecision {
    // 1. Student accessing own data -> ALWAYS ALLOWED (Student ownership model)
    if (context.role === 'student' && context.studentId === targetStudentId) {
      return {
        allowed: true,
        reason: 'Student possesses absolute ownership over personal health records',
        rlsPolicyApplied: 'RLS_STUDENT_SELF_OWNERSHIP'
      };
    }

    // 2. Cross-student access attempted by student -> DENY
    if (context.role === 'student' && context.studentId !== targetStudentId) {
      return {
        allowed: false,
        reason: 'Cross-student data access is strictly forbidden by RLS firewall',
        rlsPolicyApplied: 'RLS_DENY_CROSS_STUDENT_ACCESS'
      };
    }

    // 3. Campus officer accessing student data -> Requires active unexpired consent for that tenant
    if (context.role === 'campus_health_officer') {
      const validConsent = Array.from(this.activeConsents.values()).find(
        (c) =>
          c.studentId === targetStudentId &&
          c.tenantId === context.tenantId &&
          !c.revokedAt &&
          new Date(c.expiresAt).getTime() > Date.now() &&
          (c.scope.includes(requestedScope) || c.scope.includes('full_phi'))
      );

      if (!validConsent) {
        return {
          allowed: false,
          reason: 'No active, unexpired consent grant found for campus health officer access',
          rlsPolicyApplied: 'RLS_DENY_MISSING_TENANT_CONSENT'
        };
      }

      return {
        allowed: true,
        reason: `Campus officer access granted under consent ID ${validConsent.consentId}`,
        rlsPolicyApplied: 'RLS_GRANT_CONSENTED_INSTITUTION_ACCESS'
      };
    }

    // 4. System Admin -> Deny PHI access unless explicit break-glass (handled separately)
    return {
      allowed: false,
      reason: 'System administration role denied unconsented PHI access',
      rlsPolicyApplied: 'RLS_DENY_DEFAULT'
    };
  }

  /**
   * Graduation Simulator — Automatically revokes all institutional consent grants
   * for a graduating student while maintaining their personal account access.
   */
  public simulateGraduation(studentId: string): { revokedCount: number } {
    let count = 0;
    for (const [consentId, consent] of this.activeConsents.entries()) {
      if (consent.studentId === studentId && !consent.revokedAt) {
        consent.revokedAt = new Date().toISOString();
        this.activeConsents.set(consentId, consent);
        count++;
      }
    }
    return { revokedCount: count };
  }
}
