import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Auth401CircuitBreaker, TokenInterceptorManager } from '../tokenInterceptor';
import { SessionManager } from '../sessionManager';

describe('CIR-2 — JWT Token Auto-Refresh & 401 Interceptor Circuit Breaker Test Suite', () => {
  let circuitBreaker: Auth401CircuitBreaker;
  let interceptor: TokenInterceptorManager;
  let sessionMgr: SessionManager;

  beforeEach(() => {
    circuitBreaker = new Auth401CircuitBreaker({ maxConsecutive401Failures: 3 });
    interceptor = new TokenInterceptorManager({ maxConsecutive401Failures: 3 });
    sessionMgr = SessionManager.getInstance();

    interceptor.resetForTesting();
    sessionMgr.resetForTesting();
    vi.restoreAllMocks();
  });

  describe('Auth401CircuitBreaker State Machine', () => {
    it('starts in CLOSED state with 0 failure count', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.isTripped()).toBe(false);
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });

    it('transitions to HALF_OPEN when refreshing', () => {
      circuitBreaker.setRefreshing();
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
    });

    it('trips to OPEN state when max consecutive 401 failures threshold is met', () => {
      expect(circuitBreaker.recordFailure()).toBe('CLOSED'); // 1
      expect(circuitBreaker.recordFailure()).toBe('CLOSED'); // 2
      expect(circuitBreaker.recordFailure()).toBe('OPEN');   // 3 (tripped!)

      expect(circuitBreaker.isTripped()).toBe(true);
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('resets back to CLOSED on successful authentication', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      expect(circuitBreaker.getFailureCount()).toBe(2);

      circuitBreaker.recordSuccess();
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });

    it('invokes onTripCallback when circuit trips OPEN', () => {
      const tripSpy = vi.fn();
      const cbWithSpy = new Auth401CircuitBreaker({ maxConsecutive401Failures: 2, onCircuitTrip: tripSpy });

      cbWithSpy.recordFailure('Auth service error 1');
      expect(tripSpy).not.toHaveBeenCalled();

      cbWithSpy.recordFailure('Auth service error 2');
      expect(tripSpy).toHaveBeenCalledOnce();
      expect(tripSpy.mock.calls[0][0]).toContain('CIR-2 Circuit Breaker OPEN');
    });
  });

  describe('TokenInterceptorManager Auto-Refresh & Queueing', () => {
    it('automatically refreshes tokens on 401 error and retries request successfully', async () => {
      const initialSession = sessionMgr.createSession('user_101', 'dev_abc', 'MacBook', '127.0.0.1');
      interceptor.setTokens(initialSession.accessToken, initialSession.refreshToken);

      let attempts = 0;
      const mockFetch = vi.fn().mockImplementation((_url, options) => {
        attempts++;
        const authHeader = options?.headers?.get?.('Authorization') || options?.headers?.['Authorization'];
        if (attempts === 1) {
          // First attempt returns 401 Unauthorized
          return Promise.resolve(new Response(JSON.stringify({ detail: 'Token expired' }), { status: 401 }));
        }
        // Second attempt with rotated token returns 200 OK
        expect(authHeader).toContain('at_');
        return Promise.resolve(new Response(JSON.stringify({ data: 'Protected clinical record' }), { status: 200 }));
      });

      vi.stubGlobal('fetch', mockFetch);

      const response = await interceptor.interceptedFetch('https://api.studentkare.in/v1/health/records');
      expect(response.status).toBe(200);
      expect(attempts).toBe(2);
      expect(interceptor.getCircuitBreakerState()).toBe('CLOSED');
    });

    it('queues concurrent requests while token refresh is in progress and resolves all', async () => {
      const session = sessionMgr.createSession('user_102', 'dev_xyz', 'iPhone', '192.168.1.10');
      interceptor.setTokens(session.accessToken, session.refreshToken);

      let refreshCalls = 0;
      interceptor.setRefreshApiHandler(async (oldRefresh) => {
        refreshCalls++;
        await new Promise((r) => setTimeout(r, 50)); // simulate latency
        const rot = sessionMgr.rotateRefreshToken(oldRefresh);
        return {
          success: rot.valid,
          accessToken: rot.session?.accessToken,
          refreshToken: rot.session?.refreshToken,
        };
      });

      let mockFetchCallCount = 0;
      const mockFetch = vi.fn().mockImplementation((_url) => {
        mockFetchCallCount++;
        if (mockFetchCallCount <= 1) {
          return Promise.resolve(new Response('Unauthorized', { status: 401 }));
        }
        return Promise.resolve(new Response('Success', { status: 200 }));
      });

      vi.stubGlobal('fetch', mockFetch);

      // Issue 3 simultaneous requests
      const p1 = interceptor.interceptedFetch('https://api.studentkare.in/v1/records/1');
      const p2 = interceptor.interceptedFetch('https://api.studentkare.in/v1/records/2');
      const p3 = interceptor.interceptedFetch('https://api.studentkare.in/v1/records/3');

      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
      expect(r3.status).toBe(200);
      expect(refreshCalls).toBe(1); // Only 1 refresh API call made for all queued requests!
    });

    it('trips circuit breaker OPEN and flushes queue when refresh token is invalid or revoked', async () => {
      interceptor.setTokens('invalid_access', 'invalid_refresh');

      const mockFetch = vi.fn().mockImplementation(() => {
        return Promise.resolve(new Response('Unauthorized', { status: 401 }));
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(
        interceptor.interceptedFetch('https://api.studentkare.in/v1/health/profile')
      ).rejects.toThrow('CIR-2 401 Interceptor');

      expect(interceptor.getCircuitBreakerState()).toBe('OPEN');
      expect(interceptor.getAccessToken()).toBeNull();
      expect(interceptor.getRefreshToken()).toBeNull();

      // Subsequent fetch requests while OPEN are rejected immediately without calling network
      await expect(
        interceptor.interceptedFetch('https://api.studentkare.in/v1/health/profile')
      ).rejects.toThrow('[CIR-2 Circuit Breaker OPEN]');
    });
  });
});
