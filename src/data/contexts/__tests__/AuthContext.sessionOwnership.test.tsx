import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, SessionResponse } from '@/data/types/workflowTypes';
import { apiRequest, getCsrfToken, setCsrfToken } from '@/data/services/http';
import { captureSessionScope, invalidateSessionScope, isCurrentSessionScope } from '@/core/session/sessionScope';
import { LanguageProvider, translate } from '@/i18n';
import type { Lang } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { stopWebPushOnSignOut } from '@/lib/webPush';
import { AuthProvider, useAuth } from '../AuthContext';

vi.mock('@/lib/utils/workflowRouting', () => ({ navigate: vi.fn() }));
vi.mock('@/lib/webPush', () => ({ stopWebPushOnSignOut: vi.fn() }));

const accountA: Account = {
  id: 'account-a', fullName: 'Synthetic Adult A', role: 'STUDENT', email: '', phone: '', dob: '',
  university: '', rollNumber: '', bloodGroup: '', ageVerified: true, isVerifiedStudent: true,
  twoFactorSetupRequired: false,
};
const accountB: Account = { ...accountA, id: 'account-b', fullName: 'Synthetic Adult B' };
const sessionA: SessionResponse = { user: accountA, csrfToken: 'synthetic-csrf-a' };
const sessionB: SessionResponse = { user: accountB, csrfToken: 'synthetic-csrf-b' };

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Deferred promise is not initialized'); };
  let reject: (reason: Error) => void = () => { throw new Error('Deferred promise is not initialized'); };
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

let handle: ReturnType<typeof useAuth> | undefined;
const sessionResponses: Array<Response | Promise<Response>> = [];
let logoutResponse: Response | Promise<Response>;
let privateResponse: Response | Promise<Response>;
const request = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

function auth(): ReturnType<typeof useAuth> {
  if (!handle) throw new Error('Auth probe is not mounted');
  return handle;
}

function Probe() {
  handle = useAuth();
  return (
    <div>
      <p data-testid="status">{handle.status}</p>
      <p data-testid="account">{handle.user?.id ?? ''}</p>
      <p data-testid="error">{handle.error}</p>
    </div>
  );
}

async function mount(session: SessionResponse = sessionA, lang: Lang = 'en') {
  sessionResponses.push(response(session));
  const view = render(<LanguageProvider initial={lang}><AuthProvider><Probe /></AuthProvider></LanguageProvider>);
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
  return view;
}

function expectAnonymous() {
  expect(auth().user).toBeNull();
  expect(auth().status).toBe('anonymous');
  expect(getCsrfToken()).toBe('');
  expect(captureSessionScope().accountId).toBeNull();
}

beforeEach(() => {
  handle = undefined;
  invalidateSessionScope();
  setCsrfToken('');
  sessionResponses.splice(0);
  logoutResponse = response({ success: true });
  privateResponse = response({ success: true });
  vi.mocked(navigate).mockReset();
  vi.mocked(stopWebPushOnSignOut).mockReset().mockResolvedValue(undefined);
  request.mockReset().mockImplementation(async (input) => {
    const path = String(input);
    if (path.endsWith('/auth/session')) {
      const next = sessionResponses.shift();
      if (!next) throw new Error('Unexpected session check');
      return next;
    }
    if (path.endsWith('/auth/logout')) return logoutResponse;
    if (path.endsWith('/ownership/probe')) return privateResponse;
    throw new Error('Unexpected test request');
  });
  // The transport is real; deferred fetches deliberately ignore abort to prove stale-result guards.
  vi.stubGlobal('fetch', request);
});

afterEach(() => {
  cleanup();
  invalidateSessionScope();
  setCsrfToken('');
  vi.unstubAllGlobals();
});

describe('web session ownership at the provider and HTTP boundary', () => {
  it('clears local access immediately while push and remote logout are still pending', async () => {
    await mount();
    const owner = captureSessionScope();
    const push = deferred<void>();
    const remote = deferred<Response>();
    vi.mocked(stopWebPushOnSignOut).mockReturnValueOnce(push.promise);
    logoutResponse = remote.promise;
    let logout = Promise.resolve();

    act(() => { logout = auth().logout(); });

    expectAnonymous();
    expect(isCurrentSessionScope(owner)).toBe(false);
    expect(stopWebPushOnSignOut).toHaveBeenCalledOnce();
    const logoutCall = request.mock.calls.find(([input]) => String(input).endsWith('/auth/logout'));
    expect(logoutCall).toBeDefined();
    expect(new Headers(logoutCall?.[1]?.headers).get('X-CSRF-Token')).toBe(sessionA.csrfToken);
    expect(navigate).not.toHaveBeenCalled();

    await act(async () => {
      push.resolve(undefined);
      remote.resolve(response({ success: true }));
      await logout;
    });
    expectAnonymous();
    expect(navigate).toHaveBeenCalledWith('logged-out');
  });

  it.each(['en', 'te', 'hi'] as const)('keeps a translated warning in %s and routes to sign-in when remote logout cannot be confirmed', async (lang) => {
    await mount(sessionA, lang);
    logoutResponse = response({ detail: 'Synthetic logout unavailable' }, 503);
    await act(async () => { await auth().logout(); });

    expect(auth().user).toBeNull();
    expect(auth().status).toBe('error');
    expect(auth().error).toBe(translate(lang, 'launch.signout.remoteUnconfirmed'));
    expect(getCsrfToken()).toBe('');
    expect(captureSessionScope().accountId).toBeNull();
    expect(navigate).toHaveBeenCalledWith('login');
    expect(navigate).not.toHaveBeenCalledWith('logged-out');
  });

  it('preserves the same account ownership across a successful session refresh', async () => {
    await mount();
    const owner = captureSessionScope();
    sessionResponses.push(response({ ...sessionA, csrfToken: 'synthetic-refreshed-csrf' }));
    act(() => { auth().refresh(); });
    await waitFor(() => expect(getCsrfToken()).toBe('synthetic-refreshed-csrf'));

    expect(auth().status).toBe('authenticated');
    expect(auth().user?.id).toBe(accountA.id);
    expect(captureSessionScope()).toBe(owner);
  });

  it('allows a delayed same-account user update across a successful refresh without identity loss', async () => {
    await mount();
    const oldUpdate = auth().updateUser;
    const owner = captureSessionScope();
    sessionResponses.push(response({ ...sessionA, csrfToken: 'synthetic-refreshed-csrf' }));
    act(() => { auth().refresh(); });
    await waitFor(() => expect(getCsrfToken()).toBe('synthetic-refreshed-csrf'));

    act(() => { oldUpdate({ ...accountA, fullName: 'Synthetic updated adult' }); });

    expect(auth().user?.fullName).toBe('Synthetic updated adult');
    expect(captureSessionScope()).toBe(owner);
  });

  it.each(['success', 'failure'] as const)('discards an old account session-check %s after accepting account B', async (outcome) => {
    await mount();
    const pending = deferred<Response>();
    sessionResponses.push(pending.promise);
    act(() => { auth().refresh(); });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    act(() => { auth().acceptSession(sessionB); });
    const ownerB = captureSessionScope();

    await act(async () => {
      if (outcome === 'success') pending.resolve(response(sessionA));
      else pending.reject(new Error('Synthetic old check failed'));
      await pending.promise.catch(() => undefined);
    });

    expect(auth().status).toBe('authenticated');
    expect(auth().user?.id).toBe(accountB.id);
    expect(auth().error).toBe('');
    expect(getCsrfToken()).toBe(sessionB.csrfToken);
    expect(captureSessionScope()).toBe(ownerB);
  });

  it.each(['success', 'failure'] as const)('does not clear or redirect account B when old logout finishes with %s', async (outcome) => {
    await mount();
    const pending = deferred<Response>();
    logoutResponse = pending.promise;
    let logout = Promise.resolve();
    act(() => { logout = auth().logout(); });
    expectAnonymous();
    act(() => { auth().acceptSession(sessionB); });
    const ownerB = captureSessionScope();

    await act(async () => {
      pending.resolve(outcome === 'success'
        ? response({ success: true })
        : response({ detail: 'Synthetic old logout failed' }, 503));
      await logout;
    });

    expect(auth().status).toBe('authenticated');
    expect(auth().user?.id).toBe(accountB.id);
    expect(auth().error).toBe('');
    expect(getCsrfToken()).toBe(sessionB.csrfToken);
    expect(captureSessionScope()).toBe(ownerB);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ignores an actual old-account HTTP 401 after account B is accepted', async () => {
    await mount();
    const pending = deferred<Response>();
    privateResponse = pending.promise;
    const operation = apiRequest('/ownership/probe').catch((reason: unknown) => reason);
    act(() => { auth().acceptSession(sessionB); });
    const ownerB = captureSessionScope();

    await act(async () => {
      pending.resolve(response({ detail: 'Synthetic old session expired' }, 401));
      await operation;
    });

    expect(auth().status).toBe('authenticated');
    expect(auth().user?.id).toBe(accountB.id);
    expect(getCsrfToken()).toBe(sessionB.csrfToken);
    expect(captureSessionScope()).toBe(ownerB);
  });

  it('clears the current owner on an actual current-session HTTP 401', async () => {
    await mount(sessionB);
    const owner = captureSessionScope();
    privateResponse = response({ detail: 'Synthetic current session expired' }, 401);
    await act(async () => { await apiRequest('/ownership/probe').catch(() => undefined); });

    expectAnonymous();
    expect(isCurrentSessionScope(owner)).toBe(false);
  });

  it('clears ownership on expiry and discards a pending session success', async () => {
    await mount();
    const owner = captureSessionScope();
    const pending = deferred<Response>();
    sessionResponses.push(pending.promise);
    act(() => { auth().refresh(); });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    act(() => { window.dispatchEvent(new Event('care:session-expired')); });
    expectAnonymous();
    expect(isCurrentSessionScope(owner)).toBe(false);

    await act(async () => {
      pending.resolve(response(sessionA));
      await pending.promise;
    });
    expectAnonymous();
  });

  it('clears private ownership when a refresh returns a malformed session', async () => {
    await mount();
    const owner = captureSessionScope();
    sessionResponses.push(response({ ...sessionA, user: { ...accountA, id: '' } }));
    act(() => { auth().refresh(); });
    await waitFor(() => expect(auth().status).toBe('error'));

    expect(auth().user).toBeNull();
    expect(getCsrfToken()).toBe('');
    expect(captureSessionScope().accountId).toBeNull();
    expect(isCurrentSessionScope(owner)).toBe(false);
  });

  it('fails closed when an explicitly accepted session is malformed', async () => {
    await mount();
    const owner = captureSessionScope();
    act(() => {
      expect(() => auth().acceptSession({ ...sessionA, user: { ...accountA, fullName: '' } })).toThrow('Invalid authenticated session.');
    });
    expectAnonymous();
    expect(isCurrentSessionScope(owner)).toBe(false);
  });

  it('keeps a held two-factor session outside private feature ownership', async () => {
    await mount({ user: { ...accountA, role: 'SUPER_ADMIN', twoFactorSetupRequired: true }, csrfToken: 'synthetic-setup-csrf' });

    expect(auth().user?.twoFactorSetupRequired).toBe(true);
    expect(captureSessionScope().accountId).toBeNull();
    expect(getCsrfToken()).toBe('synthetic-setup-csrf');
  });

  it.each(['session', 'user update'] as const)('denies private ownership when a %s omits the two-factor gate', async (source) => {
    await mount();
    const owner = captureSessionScope();
    const unknownGate: Account = { ...accountA };
    delete unknownGate.twoFactorSetupRequired;

    act(() => {
      if (source === 'session') auth().acceptSession({ user: unknownGate, csrfToken: sessionA.csrfToken });
      else auth().updateUser(unknownGate);
    });

    expect(captureSessionScope().accountId).toBeNull();
    expect(isCurrentSessionScope(owner)).toBe(false);
    expect(getCsrfToken()).toBe(sessionA.csrfToken);
  });

  it('assigns private ownership when the current held session is released by a verified user update', async () => {
    const held: Account = { ...accountA, role: 'SUPER_ADMIN', twoFactorSetupRequired: true };
    await mount({ user: held, csrfToken: 'synthetic-setup-csrf' });
    expect(captureSessionScope().accountId).toBeNull();

    act(() => { auth().updateUser({ ...held, twoFactorSetupRequired: false }); });

    expect(auth().user?.twoFactorSetupRequired).toBe(false);
    expect(auth().status).toBe('authenticated');
    expect(captureSessionScope().accountId).toBe(held.id);
    expect(isCurrentSessionScope(captureSessionScope())).toBe(true);
    expect(getCsrfToken()).toBe('synthetic-setup-csrf');
  });

  it('clears private ownership when the current user update holds the session to two-factor setup', async () => {
    await mount();
    const owner = captureSessionScope();

    act(() => { auth().updateUser({ ...accountA, twoFactorSetupRequired: true }); });

    expect(auth().user?.twoFactorSetupRequired).toBe(true);
    expect(captureSessionScope().accountId).toBeNull();
    expect(isCurrentSessionScope(owner)).toBe(false);
    expect(getCsrfToken()).toBe(sessionA.csrfToken);
  });

  it('ignores an old-account user update after accepting account B', async () => {
    await mount();
    const oldUpdate = auth().updateUser;
    act(() => { auth().acceptSession(sessionB); });
    const ownerB = captureSessionScope();

    act(() => { oldUpdate({ ...accountA, fullName: 'Synthetic old update', twoFactorSetupRequired: true }); });

    expect(auth().user?.id).toBe(accountB.id);
    expect(auth().user?.fullName).toBe(accountB.fullName);
    expect(auth().user?.twoFactorSetupRequired).toBe(false);
    expect(captureSessionScope()).toBe(ownerB);
    expect(getCsrfToken()).toBe(sessionB.csrfToken);
  });

  it.each(['hold current session', 'sign in again'] as const)('rejects a delayed user update when the same account is held to two-factor setup after %s', async (transition) => {
    const admin: Account = { ...accountA, role: 'SUPER_ADMIN' };
    await mount({ ...sessionA, user: admin });
    const oldUpdate = auth().updateUser;
    if (transition === 'sign in again') {
      await act(async () => { await auth().logout(); });
    }
    act(() => { auth().acceptSession({ user: { ...admin, twoFactorSetupRequired: true }, csrfToken: 'synthetic-new-setup-csrf' }); });

    act(() => { oldUpdate(admin); });

    expect(auth().user?.twoFactorSetupRequired).toBe(true);
    expect(captureSessionScope().accountId).toBeNull();
    expect(getCsrfToken()).toBe('synthetic-new-setup-csrf');
  });

  it('invalidates global ownership when the provider unmounts', async () => {
    const view = await mount();
    const owner = captureSessionScope();
    view.unmount();

    expect(captureSessionScope().accountId).toBeNull();
    expect(isCurrentSessionScope(owner)).toBe(false);
    expect(getCsrfToken()).toBe('');
  });
});
