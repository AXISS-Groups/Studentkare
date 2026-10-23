import { describe, expect, it, vi } from 'vitest';

/**
 * WP-13: outside a demo build, no doctor clinical screen serves sample rows.
 * The four boards with no API behind them load "not connected"; the wired
 * ones read the API (their sources have no sample at all).
 */
describe('no sample patient outside demo builds', () => {
  it('referrals, renewals, AYUSH and decision support load as not connected', async () => {
    vi.resetModules();
    vi.doMock('@/core/env', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/core/env')>()), demoDataEnabled: () => false }));
    const { sampleInDevelopment } = await import('../shared/consoleTable');
    const { referralsSample } = await import('../referrals/ClinicianReferralsScreen');
    const { renewalsSample } = await import('../renewals/ClinicianRenewalsScreen');
    const { ayushSample } = await import('../ayush/ClinicianAyushScreen');
    const { decisionSupportSample } = await import('../decision-support/ClinicianDecisionSupportScreen');
    for (const sample of [referralsSample, renewalsSample, ayushSample, decisionSupportSample]) {
      await expect(sampleInDevelopment(sample).load()).resolves.toBeNull();
    }
    vi.doUnmock('@/core/env');
  });

  it('the referral commission figure is blank, never "0", even in the demo rows', async () => {
    const { referralsSample } = await import('../referrals/ClinicianReferralsScreen');
    const commission = referralsSample().stats.find((s) => s.label === 'Commission taken');
    expect(commission?.value).toBeNull();
  });
});
