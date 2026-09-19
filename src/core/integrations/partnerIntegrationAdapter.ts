/**
 * Partner Integration Adapter Standard — P54 Partner API Standard
 * 
 * Provides base adapter for third-party lab & campus ERP integrations, HMAC signature
 * validation, and partner-scoped kill switches.
 */

import crypto from 'crypto';

export interface PartnerApiRequest {
  partnerId: string;
  signature: string;
  timestamp: string; // ISO
  rawPayload: string;
}

export class PartnerIntegrationAdapter {
  private partnerKeys: Map<string, string> = new Map();

  public registerPartner(partnerId: string, hmacSecret: string): void {
    this.partnerKeys.set(partnerId, hmacSecret);
  }

  /**
   * Validates HMAC-SHA256 signature of incoming partner webhook payload
   */
  public verifyPartnerSignature(request: PartnerApiRequest): boolean {
    const secret = this.partnerKeys.get(request.partnerId);
    if (!secret) return false;

    // Reject requests older than 5 minutes to prevent replay attacks
    const reqTime = new Date(request.timestamp).getTime();
    if (Math.abs(Date.now() - reqTime) > 5 * 60 * 1000) {
      return false;
    }

    const expectedHmac = crypto
      .createHmac('sha256', secret)
      .update(`${request.timestamp}.${request.rawPayload}`)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(request.signature, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    );
  }
}
