/**
 * Roles, Permissions & Break-Glass Protocol (P48)
 * Implements RBAC least privilege, support role restriction, and break-glass emergency access.
 */

import { AuditLogger } from '../audit/auditLogger';

export type UserRole =
  | 'student'
  | 'parent'
  | 'campus_admin'
  | 'campus_clinician'
  | 'external_clinician'
  | 'support'
  | 'super_admin'
  | 'service_account';

export type Permission =
  | 'read:own_profile'
  | 'read:own_clinical'
  | 'write:own_clinical'
  | 'read:consented_clinical'
  | 'write:consented_clinical'
  | 'read:operational_metadata'
  | 'manage:tenant_roster';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  student: ['read:own_profile', 'read:own_clinical', 'write:own_clinical'],
  parent: ['read:own_profile'],
  campus_admin: ['read:own_profile', 'read:operational_metadata', 'manage:tenant_roster'],
  campus_clinician: ['read:own_profile', 'read:consented_clinical', 'write:consented_clinical'],
  external_clinician: ['read:own_profile', 'read:consented_clinical', 'write:consented_clinical'],
  support: ['read:own_profile', 'read:operational_metadata'], // NO clinical read permission! (P48)
  super_admin: ['read:own_profile', 'read:operational_metadata', 'manage:tenant_roster'], // NO direct clinical access without break-glass!
  service_account: ['read:operational_metadata'],
};

export interface BreakGlassSession {
  sessionId: string;
  actingUserId: string;
  targetUserId: string;
  reason: string;
  expiresAt: Date;
}

export class RBACManager {
  private static instance: RBACManager;
  private activeBreakGlassSessions = new Map<string, BreakGlassSession>();

  private constructor() {}

  public static getInstance(): RBACManager {
    if (!RBACManager.instance) {
      RBACManager.instance = new RBACManager();
    }
    return RBACManager.instance;
  }

  /** Reset break glass state (for testing) */
  public resetForTesting(): void {
    this.activeBreakGlassSessions.clear();
  }

  /**
   * Checks whether a role has a specific permission.
   */
  public hasPermission(role: UserRole, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  /**
   * Invokes Break-Glass Emergency Access (P48).
   * Generates loud audit entry, real-time alert, and auto-expires.
   */
  public async invokeBreakGlass(
    actingUserId: string,
    targetUserId: string,
    reason: string,
    durationMinutes: number = 30
  ): Promise<BreakGlassSession> {
    if (!reason || reason.trim().length < 10) {
      throw new Error('[P48 Violation] Break-glass invocation requires a detailed clinical emergency reason (min 10 chars).');
    }

    const sessionId = `bg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const session: BreakGlassSession = {
      sessionId,
      actingUserId,
      targetUserId,
      reason,
      expiresAt,
    };

    this.activeBreakGlassSessions.set(sessionId, session);

    // P48 Requirement: Log loud audit entry for break-glass
    await AuditLogger.getInstance().logAccess({
      actingUserId,
      targetUserId,
      action: 'BREAK_GLASS',
      resource: `emergency_break_glass:${sessionId}`,
      consentId: `emergency_reason:${reason}`,
    });

    return session;
  }

  /**
   * Checks if an active, unexpired break-glass session exists.
   */
  public isBreakGlassActive(sessionId: string): boolean {
    const session = this.activeBreakGlassSessions.get(sessionId);
    if (!session) return false;

    if (new Date() > session.expiresAt) {
      this.activeBreakGlassSessions.delete(sessionId);
      return false;
    }

    return true;
  }
}
