import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AbortController as NativeAbortController } from 'abort-controller';

let http: typeof import('../http');
const fetchMock = vi.fn();

function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Deferred promise is not initialized'); };
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

function response(status = 200): Response {
  return new Response(JSON.stringify({ success: true }), { status });
}

beforeEach(async () => {
  vi.resetModules();
  http = await import('../http');
  fetchMock.mockReset().mockImplementation(async () => response());
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('authentication ordering around cookie revocation', () => {
  it('waits for the logout response before making a new authentication request', async () => {
    const remote = deferred<Response>();
    fetchMock.mockReturnValueOnce(remote.promise);
    const logout = http.apiRequest('/auth/logout', { method: 'POST' });
    const session = http.apiRequest('/auth/session');
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledOnce();

    remote.resolve(response());
    await Promise.all([logout, session]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/auth\/session$/);
  });

  it('also waits for device cleanup and then sends a queued request with the current token', async () => {
    const remote = deferred<Response>();
    const device = deferred<void>();
    http.setCsrfToken('synthetic-old-token');
    fetchMock.mockReturnValueOnce(remote.promise);
    const logout = http.apiRequest('/auth/logout', { method: 'POST' });
    http.holdAuthenticationUntil(Promise.allSettled([device.promise, logout]));
    const next = http.apiRequest('/auth/otp/verify', { method: 'POST' });
    http.setCsrfToken('synthetic-current-token');
    remote.resolve(response());
    await logout;
    expect(fetchMock).toHaveBeenCalledOnce();

    device.resolve(undefined);
    await next;
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('X-CSRF-Token')).toBe('synthetic-old-token');
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get('X-CSRF-Token')).toBe('synthetic-current-token');
  });

  it('releases queued authentication after a failed logout without retaining an unhandled rejection', async () => {
    const remote = deferred<Response>();
    fetchMock.mockReturnValueOnce(remote.promise);
    const logout = http.apiRequest('/auth/logout', { method: 'POST' }).catch((error: unknown) => error);
    const session = http.apiRequest('/auth/session');
    expect(fetchMock).toHaveBeenCalledOnce();
    remote.resolve(response(503));
    expect(await logout).toBeInstanceOf(http.ApiError);
    await session;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not send a queued session check that was aborted during logout', async () => {
    const remote = deferred<Response>();
    fetchMock.mockReturnValueOnce(remote.promise);
    const logout = http.apiRequest('/auth/logout', { method: 'POST' });
    const controller = new AbortController();
    const session = http.apiRequest('/auth/session', { signal: controller.signal }).catch((error: unknown) => error);
    controller.abort();
    remote.resolve(response());
    await Promise.all([logout, session]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('holds authentication for all pending logout operations without blocking public safety requests', async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const logoutA = http.apiRequest('/auth/logout', { method: 'POST' });
    const logoutB = http.apiRequest('/auth/logout', { method: 'POST' });
    const session = http.apiRequest('/auth/session');
    await http.apiRequest('/public/config');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    second.resolve(response());
    await logoutB;
    expect(fetchMock).toHaveBeenCalledTimes(3);
    first.resolve(response());
    await Promise.all([logoutA, session]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('supports the native AbortController without throwIfAborted or an abort reason', async () => {
    vi.stubGlobal('AbortController', NativeAbortController);
    const controller = new AbortController();
    await http.apiRequest('/auth/session', { signal: controller.signal });
    expect(fetchMock).toHaveBeenCalledOnce();
    controller.abort();
    await expect(http.apiRequest('/auth/session', { signal: controller.signal })).rejects.toBeInstanceOf(Error);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
