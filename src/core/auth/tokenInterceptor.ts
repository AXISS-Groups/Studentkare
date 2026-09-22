/**
 * Studentkare — CIR-2: JWT Token Auto-Refresh & 401 Interceptor Circuit Breaker
 *
 * Implements low-latency token refresh intercepting, request queueing, 401 error handling,
 * and circuit breaker fault isolation to prevent infinite retry loops.
 */

import { SessionManager } from './sessionManager';

export type CircuitBreakerState = 'CLOSED' | 'HALF_OPEN' | 'OPEN';

export interface InterceptorOptions {
  maxConsecutive401Failures?: number;
  refreshTimeoutMs?: number;
  onCircuitTrip?: (reason: string) => void;
}

export interface QueuedRequest {
  resolve: (value: Response | PromiseLike<Response>) => void;
  reject: (reason?: any) => void;
  requestFn: () => Promise<Response>;
}

export class Auth401CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount: number = 0;
  private readonly maxFailures: number;
  private onTripCallback?: (reason: string) => void;

  constructor(options?: InterceptorOptions) {
    this.maxFailures = options?.maxConsecutive401Failures ?? 3;
    this.onTripCallback = options?.onCircuitTrip;
  }

  public getState(): CircuitBreakerState {
    return this.state;
  }

  public isTripped(): boolean {
    return this.state === 'OPEN';
  }

  public getFailureCount(): number {
    return this.failureCount;
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(reason: string = '401 Unauthorized'): CircuitBreakerState {
    this.failureCount += 1;
    if (this.failureCount >= this.maxFailures || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      if (this.onTripCallback) {
        this.onTripCallback(`[CIR-2 Circuit Breaker OPEN] ${reason} (Failures: ${this.failureCount}/${this.maxFailures})`);
      }
    }
    return this.state;
  }

  public setRefreshing(): void {
    if (this.state !== 'OPEN') {
      this.state = 'HALF_OPEN';
    }
  }

  public reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
}

export class TokenInterceptorManager {
  private static instance: TokenInterceptorManager;
  private circuitBreaker: Auth401CircuitBreaker;
  private refreshQueue: QueuedRequest[] = [];
  private isRefreshing: boolean = false;
  private activeAccessToken: string | null = null;
  private activeRefreshToken: string | null = null;
  private refreshApiHandler?: (refreshToken: string) => Promise<{ success: boolean; accessToken?: string; refreshToken?: string }>;

  constructor(options?: InterceptorOptions) {
    this.circuitBreaker = new Auth401CircuitBreaker(options);
  }

  public static getInstance(options?: InterceptorOptions): TokenInterceptorManager {
    if (!TokenInterceptorManager.instance) {
      TokenInterceptorManager.instance = new TokenInterceptorManager(options);
    }
    return TokenInterceptorManager.instance;
  }

  public resetForTesting(): void {
    this.circuitBreaker.reset();
    this.refreshQueue = [];
    this.isRefreshing = false;
    this.activeAccessToken = null;
    this.activeRefreshToken = null;
    this.refreshApiHandler = undefined;
  }

  public setTokens(accessToken: string | null, refreshToken: string | null): void {
    this.activeAccessToken = accessToken;
    this.activeRefreshToken = refreshToken;
    if (accessToken && refreshToken) {
      this.circuitBreaker.reset();
    }
  }

  public getAccessToken(): string | null {
    return this.activeAccessToken;
  }

  public getRefreshToken(): string | null {
    return this.activeRefreshToken;
  }

  public setRefreshApiHandler(
    handler: (refreshToken: string) => Promise<{ success: boolean; accessToken?: string; refreshToken?: string }>
  ): void {
    this.refreshApiHandler = handler;
  }

  public getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreaker.getState();
  }

  public getQueueLength(): number {
    return this.refreshQueue.length;
  }

  /**
   * Main fetch wrapper intercepting requests and managing 401 retry circuit breaking.
   */
  public async interceptedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    if (this.circuitBreaker.isTripped()) {
      throw new Error('[CIR-2 Circuit Breaker OPEN] 401 Interceptor tripped. Re-authentication required.');
    }

    const prepareRequest = () => {
      const headers = new Headers(options.headers || {});
      if (this.activeAccessToken) {
        headers.set('Authorization', `Bearer ${this.activeAccessToken}`);
      }
      return fetch(url, { ...options, headers });
    };

    if (this.isRefreshing) {
      return new Promise<Response>((resolve, reject) => {
        this.refreshQueue.push({
          resolve,
          reject,
          requestFn: prepareRequest,
        });
      });
    }

    let response = await prepareRequest();

    if (response.status === 401) {
      return this.handle401Error(prepareRequest);
    }

    if (response.ok) {
      this.circuitBreaker.recordSuccess();
    }

    return response;
  }

  private async handle401Error(originalRequestFn: () => Promise<Response>): Promise<Response> {
    if (this.circuitBreaker.isTripped()) {
      throw new Error('[CIR-2 Circuit Breaker OPEN] 401 Interceptor tripped. Re-authentication required.');
    }

    this.isRefreshing = true;
    this.circuitBreaker.setRefreshing();

    try {
      let refreshSuccess = false;
      let newAccessToken: string | undefined;
      let newRefreshToken: string | undefined;

      if (this.refreshApiHandler && this.activeRefreshToken) {
        const res = await this.refreshApiHandler(this.activeRefreshToken);
        refreshSuccess = res.success;
        newAccessToken = res.accessToken;
        newRefreshToken = res.refreshToken;
      } else if (this.activeRefreshToken) {
        const sessionMgr = SessionManager.getInstance();
        const rotResult = sessionMgr.rotateRefreshToken(this.activeRefreshToken);
        if (rotResult.valid && rotResult.session) {
          refreshSuccess = true;
          newAccessToken = rotResult.session.accessToken;
          newRefreshToken = rotResult.session.refreshToken;
        }
      }

      if (refreshSuccess && newAccessToken && newRefreshToken) {
        this.setTokens(newAccessToken, newRefreshToken);
        this.circuitBreaker.recordSuccess();
        this.isRefreshing = false;

        const queueToProcess = [...this.refreshQueue];
        this.refreshQueue = [];

        queueToProcess.forEach(({ resolve, reject, requestFn }) => {
          requestFn().then(resolve).catch(reject);
        });

        return await originalRequestFn();
      } else {
        throw new Error('Refresh token rejected or invalid');
      }
    } catch (error) {
      this.isRefreshing = false;
      const newState = this.circuitBreaker.recordFailure(
        error instanceof Error ? error.message : String(error)
      );

      const failedQueue = [...this.refreshQueue];
      this.refreshQueue = [];
      failedQueue.forEach(({ reject }) => {
        reject(new Error('[CIR-2 Circuit Breaker OPEN] Token refresh failed. Forced logout initiated.'));
      });

      if (newState === 'OPEN') {
        this.activeAccessToken = null;
        this.activeRefreshToken = null;
      }

      throw new Error(`[CIR-2 401 Interceptor] ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
