/**
 * Studentkare — P66 Session Lifecycle & Device Binding Manager
 * Implements token rotation, token family reuse detection, device binding,
 * revocation stores, and "Logout Everywhere" functionality.
 */

export interface ActiveDeviceSession {
  sessionId: string;
  familyId: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  accessToken: string;
  refreshToken: string;
  createdAt: Date;
  expiresAt: Date;
  lastActiveAt: Date;
  isRevoked: boolean;
}

export interface SessionVerificationResult {
  valid: boolean;
  session?: ActiveDeviceSession;
  reason?: string;
  isReuseAlert?: boolean;
}

export class SessionManager {
  private static instance: SessionManager;

  private sessions = new Map<string, ActiveDeviceSession>(); // sessionId -> session
  private revokedTokenFamilies = new Set<string>(); // familyId set
  private revokedTokens = new Set<string>(); // individual token set

  private readonly ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
  private readonly REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public resetForTesting(): void {
    this.sessions.clear();
    this.revokedTokenFamilies.clear();
    this.revokedTokens.clear();
  }

  /**
   * Creates a new authenticated session bound to a device.
   * P0 #2: Never creates a session without explicit server verification.
   */
  public createSession(
    userId: string,
    deviceId: string,
    deviceName: string,
    ipAddress: string
  ): ActiveDeviceSession {
    if (!userId || !deviceId) {
      throw new Error('[P66 Security Defect] Session creation requires verified userId and deviceId.');
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const familyId = `fam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const accessToken = `at_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const refreshToken = `rt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const now = new Date();
    const session: ActiveDeviceSession = {
      sessionId,
      familyId,
      userId,
      deviceId,
      deviceName,
      ipAddress,
      accessToken,
      refreshToken,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.REFRESH_TOKEN_TTL_MS),
      lastActiveAt: now,
      isRevoked: false,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Rotates a refresh token.
   * If a revoked/already-used refresh token is presented, DETECTS REUSE,
   * revokes the ENTIRE token family, and triggers an security alert (P66).
   */
  public rotateRefreshToken(oldRefreshToken: string): SessionVerificationResult {
    // Find session matching refresh token
    let targetSession: ActiveDeviceSession | undefined;
    for (const session of this.sessions.values()) {
      if (session.refreshToken === oldRefreshToken) {
        targetSession = session;
        break;
      }
    }

    // Check if token family was already revoked due to previous theft/reuse
    if (!targetSession) {
      // Check if token is in revoked set -> REUSE ATTACK DETECTED!
      if (this.revokedTokens.has(oldRefreshToken)) {
        return {
          valid: false,
          reason: '[P66 Security Alert] Refresh token reuse detected! Invalidate all family sessions.',
          isReuseAlert: true,
        };
      }
      return {
        valid: false,
        reason: '[P66 Auth Failure] Invalid or non-existent refresh token.',
      };
    }

    // Check if token or family is already revoked -> REUSE ATTACK DETECTED!
    if (this.revokedTokenFamilies.has(targetSession.familyId) || targetSession.isRevoked) {
      // P66 Security Rule: Reuse of a revoked token automatically revokes the entire token family
      this.revokeTokenFamily(targetSession.familyId);
      return {
        valid: false,
        reason: '[P66 Security Alert] Revoked refresh token reuse detected! Revoked entire token family.',
        isReuseAlert: true,
      };
    }

    // Mark old token as revoked (used once)
    this.revokedTokens.add(oldRefreshToken);
    targetSession.isRevoked = true;

    // Issue new session in the same token family
    const newSession = this.createSession(
      targetSession.userId,
      targetSession.deviceId,
      targetSession.deviceName,
      targetSession.ipAddress
    );
    newSession.familyId = targetSession.familyId; // preserve family ID for rotation tracking

    return {
      valid: true,
      session: newSession,
    };
  }

  /**
   * Revokes the entire token family when token reuse / theft is detected.
   */
  public revokeTokenFamily(familyId: string): void {
    this.revokedTokenFamilies.add(familyId);
    for (const session of this.sessions.values()) {
      if (session.familyId === familyId) {
        session.isRevoked = true;
      }
    }
  }

  /**
   * Student-initiated revocation of a specific device or "Logout Everywhere" (P66).
   */
  public revokeDeviceSession(userId: string, targetSessionId: string): boolean {
    const session = this.sessions.get(targetSessionId);
    if (!session || session.userId !== userId) {
      return false;
    }
    session.isRevoked = true;
    this.revokedTokens.add(session.refreshToken);
    this.revokedTokens.add(session.accessToken);
    return true;
  }

  public logoutEverywhere(userId: string): number {
    let revokedCount = 0;
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.isRevoked) {
        session.isRevoked = true;
        this.revokedTokenFamilies.add(session.familyId);
        this.revokedTokens.add(session.refreshToken);
        this.revokedTokens.add(session.accessToken);
        revokedCount++;
      }
    }
    return revokedCount;
  }

  public getActiveSessionsForUser(userId: string): ActiveDeviceSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.userId === userId && !s.isRevoked && !this.revokedTokenFamilies.has(s.familyId)
    );
  }
}
