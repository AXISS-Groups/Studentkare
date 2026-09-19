import { describe, it, expect, beforeEach } from 'vitest';
import { AbdmConsentManager } from '../abdmConsentManager';

describe('AbdmConsentManager (P46)', () => {
  let manager: AbdmConsentManager;

  beforeEach(() => {
    manager = new AbdmConsentManager();
  });

  it('registers valid signed ABDM consent artifacts', () => {
    const registered = manager.registerConsentArtifact({
      consentId: 'ABDM-CONSENT-001',
      consentRequestId: 'REQ-100',
      signature: 'valid_base64_hmac_rsa_signature_string',
      status: 'GRANTED',
      grantedAt: new Date().toISOString()
    });

    expect(registered).toBe(true);
    expect(manager.isConsentValid('ABDM-CONSENT-001')).toBe(true);
  });

  it('rejects artifacts missing cryptographic signatures', () => {
    expect(() =>
      manager.registerConsentArtifact({
        consentId: 'INVALID',
        consentRequestId: 'REQ-101',
        signature: '',
        status: 'GRANTED',
        grantedAt: new Date().toISOString()
      })
    ).toThrow(/Missing valid cryptographic signature/);
  });

  it('provides manual non-ABHA fallback id generation', () => {
    const fallback = manager.registerNonAbhaFallback('STUDENT-CARD-99');
    expect(fallback.fallbackId).toBe('NON-ABHA-STUDENT-CARD-99');
    expect(fallback.abdmLinked).toBe(false);
  });
});
