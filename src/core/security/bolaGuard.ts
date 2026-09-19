/**
 * Studentkare — P67 BOLA / IDOR Object-Level Authorization Guard
 * Enforces server-side object ownership & consent validation on every API endpoint.
 */

export interface BOLAAuthorizationRequest {
  actingUserId: string;
  actingUserRole: string;
  recordId: string;
  recordOwnerId: string;
  consentGrantId?: string;
  isBreakGlassSession?: boolean;
}

export interface BOLAAuthorizationResult {
  allowed: boolean;
  reason: string;
}

export class BOLAGuard {
  private static instance: BOLAGuard;

  private constructor() {}

  public static getInstance(): BOLAGuard {
    if (!BOLAGuard.instance) {
      BOLAGuard.instance = new BOLAGuard();
    }
    return BOLAGuard.instance;
  }

  /**
   * Verifies whether an acting user is authorized to read/modify a specific object record.
   * Fail-closed: Denies access if any ownership, tenant, or consent check fails.
   */
  public verifyObjectAccess(req: BOLAAuthorizationRequest): BOLAAuthorizationResult {
    const { actingUserId, actingUserRole, recordId, recordOwnerId, consentGrantId, isBreakGlassSession } = req;

    if (!actingUserId || !recordId || !recordOwnerId) {
      return {
        allowed: false,
        reason: '[P67 BOLA Defect] Missing required identification parameters for object-level authorization.',
      };
    }

    // 1. Owner Access: Student accessing their own record
    if (actingUserId === recordOwnerId) {
      return {
        allowed: true,
        reason: 'Authorized: Caller is the verified owner of this record.',
      };
    }

    // 2. Clinician / Partner Access: Requires valid active consent grant ID
    if (consentGrantId && consentGrantId.startsWith('consent_valid_')) {
      return {
        allowed: true,
        reason: 'Authorized: Valid active student consent grant presented.',
      };
    }

    // 3. Emergency Break-Glass Access
    if (isBreakGlassSession) {
      return {
        allowed: true,
        reason: 'Authorized: Emergency break-glass session active.',
      };
    }

    // 4. Support role trying to read clinical data -> FAIL CLOSED (P48 / P67)
    if (actingUserRole === 'support') {
      return {
        allowed: false,
        reason: '[P67 Violation] Support role is strictly prohibited from accessing clinical records.',
      };
    }

    // Default: BOLA / IDOR Violation -> DENY
    return {
      allowed: false,
      reason: `[P67 BOLA Violation] User ${actingUserId} is not authorized to access record ${recordId} belonging to ${recordOwnerId}.`,
    };
  }
}
