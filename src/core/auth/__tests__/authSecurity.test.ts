import { describe, it, expect, beforeEach } from 'vitest';
import { OTPManager } from '../otpManager';
import { SessionManager } from '../sessionManager';
import { StepUpAuthManager } from '../stepUpAuth';

describe('P66 — Authentication & Session Security', () => {
  let otpMgr: OTPManager;
  let sessMgr: SessionManager;
  let stepUpMgr: StepUpAuthManager;

  beforeEach(() => {
    otpMgr = OTPManager.getInstance();
    sessMgr = SessionManager.getInstance();
    stepUpMgr = StepUpAuthManager.getInstance();

    otpMgr.resetForTesting();
    sessMgr.resetForTesting();
    stepUpMgr.resetForTesting();
  });

  describe('OTP Security & Denial Paths', () => {
    it('denies session grant on rejected OTP and enforces lockouts after 3 failed attempts', async () => {
      const phone = '+919876543210';
      const ip = '192.168.1.1';

      await otpMgr.requestOTP(phone, ip);

      // Attempt 1: Wrong code
      const v1 = await otpMgr.verifyOTP(phone, '000000');
      expect(v1.success).toBe(false);

      // Attempt 2: Wrong code
      const v2 = await otpMgr.verifyOTP(phone, '111111');
      expect(v2.success).toBe(false);

      // Attempt 3: Wrong code -> triggers lockout!
      const v3 = await otpMgr.verifyOTP(phone, '222222');
      expect(v3.success).toBe(false);
      expect(v3.isLockedOut).toBe(true);

      // Subsequent attempt while locked out is rejected immediately
      const reqAfterLockout = await otpMgr.requestOTP(phone, ip);
      expect(reqAfterLockout.success).toBe(false);
      expect(reqAfterLockout.message).toContain('locked out');
    });

    it('enforces maximum 3 OTP requests per hour rate limit per phone number', async () => {
      const phone = '+919999999999';
      const ip = '10.0.0.1';

      expect((await otpMgr.requestOTP(phone, ip)).success).toBe(true);
      expect((await otpMgr.requestOTP(phone, ip)).success).toBe(true);
      expect((await otpMgr.requestOTP(phone, ip)).success).toBe(true);

      // 4th request must fail rate limit
      const r4 = await otpMgr.requestOTP(phone, ip);
      expect(r4.success).toBe(false);
      expect(r4.message).toContain('[P66 Rate Limit]');
    });
  });

  describe('Session Lifecycle, Device Binding & Token Rotation', () => {
    it('creates device-bound session and supports token rotation', () => {
      const session = sessMgr.createSession(
        'student_user_1',
        'device_uuid_abc',
        'iPhone 15 Pro',
        '203.0.113.5'
      );

      expect(session.userId).toBe('student_user_1');
      expect(session.deviceId).toBe('device_uuid_abc');
      expect(session.accessToken).toContain('at_');
      expect(session.refreshToken).toContain('rt_');

      // Rotate token
      const rotated = sessMgr.rotateRefreshToken(session.refreshToken);
      expect(rotated.valid).toBe(true);
      expect(rotated.session?.refreshToken).not.toBe(session.refreshToken);
    });

    it('detects refresh token reuse, revokes family, and flags security alert (P66)', () => {
      const session = sessMgr.createSession(
        'student_user_1',
        'device_uuid_abc',
        'iPhone 15 Pro',
        '203.0.113.5'
      );

      const firstRotation = sessMgr.rotateRefreshToken(session.refreshToken);
      expect(firstRotation.valid).toBe(true);

      // Attacker attempts to REUSE old session.refreshToken -> Reuse Alert!
      const reusedAttempt = sessMgr.rotateRefreshToken(session.refreshToken);
      expect(reusedAttempt.valid).toBe(false);
      expect(reusedAttempt.isReuseAlert).toBe(true);

      // Verify token family is revoked
      sessMgr.revokeTokenFamily(session.familyId);
      const active = sessMgr.getActiveSessionsForUser('student_user_1');
      expect(active.length).toBe(0);
    });

    it('supports student-initiated "Logout Everywhere" revoking all active sessions', () => {
      sessMgr.createSession('student_101', 'dev_1', 'MacBook Air', '1.1.1.1');
      sessMgr.createSession('student_101', 'dev_2', 'Pixel 8', '2.2.2.2');
      sessMgr.createSession('student_999', 'dev_3', 'iPad Pro', '3.3.3.3');

      expect(sessMgr.getActiveSessionsForUser('student_101').length).toBe(2);

      const revokedCount = sessMgr.logoutEverywhere('student_101');
      expect(revokedCount).toBe(2);
      expect(sessMgr.getActiveSessionsForUser('student_101').length).toBe(0);
      expect(sessMgr.getActiveSessionsForUser('student_999').length).toBe(1);
    });
  });

  describe('Step-Up Authentication', () => {
    it('issues single-use step-up token and consumes it for sensitive action', () => {
      const token = stepUpMgr.issueStepUpToken('user_123', 'EXPORT_CLINICAL_DATA');
      expect(token.tokenId).toContain('stepup_');

      const isFirstVerify = stepUpMgr.verifyAndConsumeToken(
        'user_123',
        token.tokenId,
        'EXPORT_CLINICAL_DATA'
      );
      expect(isFirstVerify).toBe(true);

      // Re-using single-use token fails
      const isSecondVerify = stepUpMgr.verifyAndConsumeToken(
        'user_123',
        token.tokenId,
        'EXPORT_CLINICAL_DATA'
      );
      expect(isSecondVerify).toBe(false);
    });

    it('rejects step-up token for mismatched action or user', () => {
      const token = stepUpMgr.issueStepUpToken('user_123', 'EXPORT_CLINICAL_DATA');

      expect(
        stepUpMgr.verifyAndConsumeToken('user_123', token.tokenId, 'CHANGE_RECOVERY_METHOD')
      ).toBe(false);

      expect(
        stepUpMgr.verifyAndConsumeToken('user_attacker', token.tokenId, 'EXPORT_CLINICAL_DATA')
      ).toBe(false);
    });
  });
});
