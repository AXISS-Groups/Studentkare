/**
 * Studentkare — P66 Step-Up Authentication Manager
 * Enforces step-up re-verification for high-sensitivity actions.
 */

export type SensitiveAction =
  | 'EXPORT_CLINICAL_DATA'
  | 'GRANT_CONSENT_ACCESS'
  | 'REVOKE_CONSENT_ACCESS'
  | 'CHANGE_RECOVERY_METHOD'
  | 'REVOKE_ALL_DEVICES';

export interface StepUpToken {
  tokenId: string;
  userId: string;
  action: SensitiveAction;
  expiresAt: Date;
  isUsed: boolean;
}

export class StepUpAuthManager {
  private static instance: StepUpAuthManager;
  private activeTokens = new Map<string, StepUpToken>(); // tokenId -> StepUpToken

  private readonly STEP_UP_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes validity

  private constructor() {}

  public static getInstance(): StepUpAuthManager {
    if (!StepUpAuthManager.instance) {
      StepUpAuthManager.instance = new StepUpAuthManager();
    }
    return StepUpAuthManager.instance;
  }

  public resetForTesting(): void {
    this.activeTokens.clear();
  }

  /**
   * Issues a single-use step-up verification token after successful primary re-authentication.
   */
  public issueStepUpToken(userId: string, action: SensitiveAction): StepUpToken {
    const tokenId = `stepup_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = new Date(Date.now() + this.STEP_UP_TOKEN_TTL_MS);

    const token: StepUpToken = {
      tokenId,
      userId,
      action,
      expiresAt,
      isUsed: false,
    };

    this.activeTokens.set(tokenId, token);
    return token;
  }

  /**
   * Verifies and consumes a step-up token for a sensitive action.
   */
  public verifyAndConsumeToken(userId: string, tokenId: string, action: SensitiveAction): boolean {
    const token = this.activeTokens.get(tokenId);
    if (!token) return false;

    if (token.userId !== userId || token.action !== action || token.isUsed) {
      return false;
    }

    if (new Date() > token.expiresAt) {
      this.activeTokens.delete(tokenId);
      return false;
    }

    // Single use consumption
    token.isUsed = true;
    this.activeTokens.delete(tokenId);
    return true;
  }
}
