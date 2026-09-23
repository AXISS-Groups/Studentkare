import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { PartnerIntegrationAdapter } from '../partnerIntegrationAdapter';

describe('PartnerIntegrationAdapter (P54)', () => {
  let adapter: PartnerIntegrationAdapter;
  const partnerId = 'PARTNER-LAB-1';
  const secret = 'test-hmac-shared-key';

  beforeEach(() => {
    adapter = new PartnerIntegrationAdapter();
    adapter.registerPartner(partnerId, secret);
  });

  it('verifies valid HMAC-SHA256 partner webhook signatures', () => {
    const timestamp = new Date().toISOString();
    const rawPayload = JSON.stringify({ event: 'LAB_RESULT_READY', patientId: 'P100' });
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${rawPayload}`)
      .digest('hex');

    const isValid = adapter.verifyPartnerSignature({
      partnerId,
      signature,
      timestamp,
      rawPayload
    });

    expect(isValid).toBe(true);
  });

  it('rejects replayed webhook requests older than 5 minutes', () => {
    const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const rawPayload = JSON.stringify({ event: 'REPLAY_TEST' });
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${oldTimestamp}.${rawPayload}`)
      .digest('hex');

    const isValid = adapter.verifyPartnerSignature({
      partnerId,
      signature,
      timestamp: oldTimestamp,
      rawPayload
    });

    expect(isValid).toBe(false);
  });
});
