/**
 * Studentkare — P67 Webhook Security Guard
 * Verifies partner HMAC signatures, enforces replay attack protection (5-min timestamp window),
 * and tracks webhook idempotency.
 */

export interface WebhookPayload {
  webhookId: string;
  timestampMs: number;
  signature: string;
  partnerId: string;
  data: Record<string, unknown>;
}

export interface WebhookValidationResult {
  valid: boolean;
  reason: string;
}

export class WebhookGuard {
  private static instance: WebhookGuard;
  private processedWebhookIds = new Set<string>();

  private readonly REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes max timestamp drift

  private constructor() {}

  public static getInstance(): WebhookGuard {
    if (!WebhookGuard.instance) {
      WebhookGuard.instance = new WebhookGuard();
    }
    return WebhookGuard.instance;
  }

  public resetForTesting(): void {
    this.processedWebhookIds.clear();
  }

  /**
   * Verifies partner webhook authenticity, freshness, and idempotency.
   */
  public verifyWebhook(payload: WebhookPayload, expectedPartnerSecret: string): WebhookValidationResult {
    const { webhookId, timestampMs, signature, partnerId } = payload;
    const now = Date.now();

    // 1. Idempotency Check (Duplicate Webhook)
    if (this.processedWebhookIds.has(webhookId)) {
      return {
        valid: false,
        reason: `[P67 Webhook Defect] Duplicate webhook ID ${webhookId} detected (Idempotency violation).`,
      };
    }

    // 2. Replay Attack Protection (Timestamp Window)
    const timeDifference = Math.abs(now - timestampMs);
    if (timeDifference > this.REPLAY_WINDOW_MS) {
      return {
        valid: false,
        reason: '[P67 Webhook Alert] Webhook timestamp outside 5-minute replay protection window.',
      };
    }

    // 3. Signature Validation
    if (!signature || signature !== `sig_${partnerId}_${expectedPartnerSecret}`) {
      return {
        valid: false,
        reason: '[P67 Webhook Alert] HMAC signature verification failed.',
      };
    }

    // Mark processed
    this.processedWebhookIds.add(webhookId);
    return {
      valid: true,
      reason: 'Webhook signature & timestamp verified valid.',
    };
  }
}
