import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '../rateLimiter';

describe('RateLimiter (P53)', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  it('allows requests within tier limit for PUBLIC clients', () => {
    const clientId = 'PUB-IP-123';
    const now = Date.now();

    for (let i = 0; i < 60; i++) {
      const decision = limiter.evaluateRequest(clientId, 'PUBLIC', now);
      expect(decision.allowed).toBe(true);
    }

    // 61st request in same minute gets rate limited
    const overflow = limiter.evaluateRequest(clientId, 'PUBLIC', now);
    expect(overflow.allowed).toBe(false);
    expect(overflow.remaining).toBe(0);
  });

  it('allows higher rate limit volume for CLINICIAN tier', () => {
    const clientId = 'CLINICIAN-DOC-1';
    const now = Date.now();

    for (let i = 0; i < 600; i++) {
      expect(limiter.evaluateRequest(clientId, 'CLINICIAN', now).allowed).toBe(true);
    }

    expect(limiter.evaluateRequest(clientId, 'CLINICIAN', now).allowed).toBe(false);
  });
});
