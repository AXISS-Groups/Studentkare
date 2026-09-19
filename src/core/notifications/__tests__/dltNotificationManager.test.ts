import { describe, it, expect } from 'vitest';
import { DltNotificationManager } from '../dltNotificationManager';

describe('DltNotificationManager (P50)', () => {
  it('validates TRAI approved DLT template IDs', () => {
    expect(DltNotificationManager.validateDltTemplate('1007123456789012345')).toBe(true);
    expect(DltNotificationManager.validateDltTemplate('INVALID_TEMPLATE_ID')).toBe(false);
  });

  it('scrubs PHI keywords from notification payload before SMS dispatch', () => {
    const message = 'Your consultation regarding therapy and blood test result is scheduled';
    const result = DltNotificationManager.processNotificationPayload('1007987654321098765', message);

    expect(result.validDlt).toBe(true);
    expect(result.scrubbed).toBe(true);
    expect(result.safeText).not.toContain('therapy');
    expect(result.safeText).not.toContain('blood test result');
    expect(result.safeText).toContain('[CONFIDENTIAL]');
  });
});
