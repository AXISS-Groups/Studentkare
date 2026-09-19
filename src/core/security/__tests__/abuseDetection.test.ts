import { describe, it, expect, beforeEach } from 'vitest';
import { AbuseDetectionEngine } from '../abuseDetectionEngine';

describe('AbuseDetectionEngine (P80)', () => {
  let engine: AbuseDetectionEngine;

  beforeEach(() => {
    engine = new AbuseDetectionEngine();
  });

  it('detects ATO risk on excessive failed password attempts', () => {
    const userId = 'USER-TARGET-1';
    const now = new Date().toISOString();

    for (let i = 0; i < 4; i++) {
      expect(
        engine.evaluateAtoRisk({
          userId,
          ipAddress: '192.168.1.1',
          deviceFingerprint: 'DEV-1',
          timestamp: now,
          success: false
        })
      ).toBeNull();
    }

    // 5th failure triggers high ATO alert
    const alert = engine.evaluateAtoRisk({
      userId,
      ipAddress: '192.168.1.1',
      deviceFingerprint: 'DEV-1',
      timestamp: now,
      success: false
    });

    expect(alert).not.toBeNull();
    expect(alert?.riskScore).toBe(90);
    expect(alert?.reason).toContain('Excessive failed login attempts');
  });

  it('detects rapid multi-IP geographical jump', () => {
    const userId = 'USER-TARGET-2';
    const now = new Date().toISOString();

    engine.evaluateAtoRisk({ userId, ipAddress: '10.0.0.1', deviceFingerprint: 'DEV-1', timestamp: now, success: true });
    engine.evaluateAtoRisk({ userId, ipAddress: '10.0.0.2', deviceFingerprint: 'DEV-1', timestamp: now, success: true });
    engine.evaluateAtoRisk({ userId, ipAddress: '10.0.0.3', deviceFingerprint: 'DEV-1', timestamp: now, success: true });

    const alert = engine.evaluateAtoRisk({
      userId,
      ipAddress: '10.0.0.4',
      deviceFingerprint: 'DEV-1',
      timestamp: now,
      success: true
    });

    expect(alert).not.toBeNull();
    expect(alert?.riskScore).toBe(85);
    expect(alert?.reason).toContain('multi-IP');
  });

  it('verifies valid clinician registration numbers', () => {
    const res = engine.verifyClinicianRegistration('NMC-98765', 'Delhi Medical Council');
    expect(res.verified).toBe(true);
    expect(res.practitionerName).toBe('Dr. Verified Practitioner');

    const invalid = engine.verifyClinicianRegistration('FAKE-123', 'Delhi Medical Council');
    expect(invalid.verified).toBe(false);
  });

  it('triggers silent alert and safe profile display when distress PIN is entered', () => {
    const duressResult = engine.evaluateDuressPin('9999', '9999');
    expect(duressResult.isDuressTriggered).toBe(true);
    expect(duressResult.displaySafeProfile).toBe(true);
    expect(duressResult.silentAlertTriggered).toBe(true);

    const normalResult = engine.evaluateDuressPin('1234', '9999');
    expect(normalResult.isDuressTriggered).toBe(false);
    expect(normalResult.displaySafeProfile).toBe(false);
  });
});
