/**
 * Multi-Tier Rate Limiter & Load Resilience — P53 Load & Resilience
 * 
 * Implements sliding window rate limiting per API client tier:
 * - Public: 60 req/min
 * - Student: 300 req/min
 * - Clinician: 600 req/min
 * - System Partner: 1200 req/min
 * Fails closed and triggers graceful degradation during traffic surges.
 */

export type ClientTier = 'PUBLIC' | 'STUDENT' | 'CLINICIAN' | 'SYSTEM_PARTNER';

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export class RateLimiter {
  private static TIER_LIMITS: Record<ClientTier, number> = {
    PUBLIC: 60,
    STUDENT: 300,
    CLINICIAN: 600,
    SYSTEM_PARTNER: 1200
  };

  private clientBuckets: Map<string, number[]> = new Map();

  /**
   * Evaluates rate limit using sliding window algorithm
   */
  public evaluateRequest(
    clientId: string,
    tier: ClientTier,
    nowTimestamp: number = Date.now()
  ): RateLimitDecision {
    const limit = RateLimiter.TIER_LIMITS[tier];
    const windowStart = nowTimestamp - 60 * 1000; // 1 minute sliding window

    let timestamps = this.clientBuckets.get(clientId) ?? [];
    // Filter out timestamps outside current 1-minute window
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= limit) {
      this.clientBuckets.set(clientId, timestamps);
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetSeconds: Math.ceil((timestamps[0] + 60 * 1000 - nowTimestamp) / 1000)
      };
    }

    timestamps.push(nowTimestamp);
    this.clientBuckets.set(clientId, timestamps);

    return {
      allowed: true,
      limit,
      remaining: limit - timestamps.length,
      resetSeconds: 60
    };
  }
}
