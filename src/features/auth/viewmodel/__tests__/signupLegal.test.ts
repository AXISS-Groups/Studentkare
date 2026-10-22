import { describe, expect, it } from 'vitest';
import { SignupConsentState } from '../signupConsent';

describe('sign-up consent records the legal versions shown (audit H2)', () => {
  it('sends nothing about the notice until it is known', () => {
    const consent = new SignupConsentState();
    consent.toggle('RECORDS_STORAGE'); consent.toggle('CAMPUS_ENROLMENT'); consent.toggle('ADULT_18_PLUS');
    expect(consent.payload('en')).not.toHaveProperty('noticeVersion');
  });

  it('sends the versions shown, "unpublished" included', () => {
    const consent = new SignupConsentState();
    consent.toggle('RECORDS_STORAGE'); consent.toggle('CAMPUS_ENROLMENT'); consent.toggle('ADULT_18_PLUS');
    consent.setLegal('unpublished', '2026-11-01');
    expect(consent.payload('te')).toMatchObject({ noticeVersion: 'unpublished', termsVersion: '2026-11-01', language: 'te' });
  });
});
