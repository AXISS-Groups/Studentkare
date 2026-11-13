import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NativeSessionProvider, isSignedInSession, useNativeSession } from '../session';
import { destinationsFor } from '../homeDestinations';
import { stopPushOnSignOut } from '../hardware/push';
import * as http from '@/data/services/http';
import type { Account, SessionResponse } from '@/data/types/workflowTypes';
import { captureSessionScope, invalidateSessionScope, isCurrentSessionScope, setSessionAccount } from '@/core/session/sessionScope';
import { emergencyStore } from '@/features/emergency/state/EmergencyStore';
import { translate } from '@/i18n';

vi.mock('../hardware/push', () => ({
  stopPushOnSignOut: vi.fn(),
  pushDevice: { start: vi.fn(), stop: vi.fn() },
}));

const student: Account = {
  id: 'a1', fullName: 'Asha Rao', role: 'STUDENT', email: 'a@b.edu', phone: '', dob: '', university: '',
  rollNumber: '', bloodGroup: '', ageVerified: true, isVerifiedStudent: false,
};

type NativeSession = ReturnType<typeof useNativeSession>;

function Probe({ capture }: { capture?: (session: NativeSession) => void }) {
  const session = useNativeSession();
  capture?.(session);
  return <>
    <span data-testid="status">{session.status}</span>
    <span data-testid="user">{session.user?.id ?? ''}</span>
    <span data-testid="problem">{session.problem}</span>
  </>;
}

function renderSession() {
  const sessions: NativeSession[] = [];
  const view = render(<NativeSessionProvider><Probe capture={(session) => sessions.push(session)} /></NativeSessionProvider>);
  return {
    ...view,
    get session(): NativeSession {
      const latest = sessions[sessions.length - 1];
      if (!latest) throw new Error('Session probe has not rendered');
      return latest;
    },
  };
}

function deferred<T>() {
  const controls: { resolve: (value: T) => void; reject: (reason: Error) => void }[] = [];
  const promise = new Promise<T>((resolve, reject) => { controls.push({ resolve, reject }); });
  const control = controls[0];
  if (!control) throw new Error('Deferred promise was not initialized');
  return { promise, ...control };
}

const signedIn = (id = student.id, csrfToken = 'csrf-a'): SessionResponse => ({
  user: { ...student, id, twoFactorSetupRequired: false }, csrfToken,
});

/** Flushes the local state change without waiting for remote revocation. */
function beginSignOut(view: ReturnType<typeof renderSession>): Promise<void> {
  let request = Promise.resolve();
  act(() => { request = view.session.signOut(); });
  return request;
}

function expectLocallySignedOut() {
  expect(screen.getByTestId('status')).toHaveTextContent('signedOut');
  expect(screen.getByTestId('user')).toBeEmptyDOMElement();
  expect(http.getCsrfToken()).toBe('');
  expect(captureSessionScope().accountId).toBeNull();
  expect(emergencyStore.locationNote).toBe('');
}

beforeEach(() => {
  invalidateSessionScope();
  http.setCsrfToken('');
  vi.mocked(stopPushOnSignOut).mockReset();
  vi.mocked(stopPushOnSignOut).mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  invalidateSessionScope();
  http.setCsrfToken('');
  vi.restoreAllMocks();
});

describe('isSignedInSession', () => {
  it('accepts only a complete user with a known role and a CSRF token', () => {
    expect(isSignedInSession({ user: student, csrfToken: 't' })).toBe(true);
    expect(isSignedInSession({ user: student, csrfToken: '' })).toBe(false);
    expect(isSignedInSession({ user: null, csrfToken: 't' })).toBe(false);
    expect(isSignedInSession({ user: { ...student, id: '' }, csrfToken: 't' })).toBe(false);
    expect(isSignedInSession(null)).toBe(false);
  });
});

describe('NativeSessionProvider fails closed', () => {
  it('is signed out when the server cannot be reached', async () => {
    vi.spyOn(http, 'apiRequest').mockRejectedValue(new Error('offline'));
    render(<NativeSessionProvider><Probe /></NativeSessionProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
  });

  it('is signed out on a malformed session', async () => {
    vi.spyOn(http, 'apiRequest').mockResolvedValue({ user: { ...student, role: 'ROOT' }, csrfToken: 't' });
    render(<NativeSessionProvider><Probe /></NativeSessionProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
  });

  it('is signed in only on a well-formed session that is not held to two-step set-up', async () => {
    vi.spyOn(http, 'apiRequest').mockResolvedValue({ user: { ...student, twoFactorSetupRequired: false }, csrfToken: 't' });
    render(<NativeSessionProvider><Probe /></NativeSessionProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedIn'));
  });

  it.each([
    ['held by the server', { twoFactorSetupRequired: true }],
    ['silent about the hold', {}],
  ])('is held to two-step set-up, never signed in, when the session is %s', async (_name, extra) => {
    setSessionAccount('previous-account');
    emergencyStore.setLocationNote('Previous account location');
    vi.spyOn(http, 'apiRequest').mockResolvedValue({ user: { ...student, role: 'SUPER_ADMIN', ...extra }, csrfToken: 't' });
    render(<NativeSessionProvider><Probe /></NativeSessionProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('twoFactorSetup'));
    expect(captureSessionScope().accountId).toBeNull();
    expect(emergencyStore.locationNote).toBe('');
  });
});

describe('NativeSessionProvider owns local account state', () => {
  it('clears local access immediately while logout and push revocation are still pending', async () => {
    const logout = deferred<unknown>();
    const push = deferred<void>();
    const tokenAtLogout: string[] = [];
    vi.spyOn(http, 'apiRequest')
      .mockResolvedValueOnce(signedIn())
      .mockImplementationOnce(() => {
        tokenAtLogout.push(http.getCsrfToken());
        return logout.promise;
      });
    vi.mocked(stopPushOnSignOut).mockReturnValueOnce(push.promise);
    const view = renderSession();
    await waitFor(() => expect(view.session.status).toBe('signedIn'));
    const owner = captureSessionScope();
    emergencyStore.setLocationNote('Account A location');

    const request = beginSignOut(view);
    expect(tokenAtLogout).toEqual(['csrf-a']);
    expectLocallySignedOut();
    expect(isCurrentSessionScope(owner)).toBe(false);
    expect(view.session.problem).toBe('');

    await act(async () => {
      logout.resolve({});
      push.resolve(undefined);
      await expect(request).resolves.toBeUndefined();
    });
    expectLocallySignedOut();
  });

  it('resolves failed remote signout and keeps the translated warning without restoring local access', async () => {
    vi.spyOn(http, 'apiRequest')
      .mockResolvedValueOnce(signedIn())
      .mockRejectedValueOnce(new Error('Remote logout failed'));
    vi.mocked(stopPushOnSignOut).mockRejectedValueOnce(new Error('Push revocation failed'));
    const view = renderSession();
    await waitFor(() => expect(view.session.status).toBe('signedIn'));
    emergencyStore.setLocationNote('Account A location');

    await act(async () => { await expect(view.session.signOut()).resolves.toBeUndefined(); });

    expectLocallySignedOut();
    expect(view.session.problem).toBe(translate('en', 'launch.signout.remoteUnconfirmed'));
    expect(screen.getByTestId('problem')).toHaveTextContent(translate('en', 'launch.signout.remoteUnconfirmed'));
  });

  it.each(['resolved', 'rejected'] as const)('ignores a session check that is %s after local signout', async (outcome) => {
    const check = deferred<SessionResponse>();
    const logout = deferred<unknown>();
    const api = vi.spyOn(http, 'apiRequest')
      .mockReturnValueOnce(check.promise)
      .mockReturnValueOnce(logout.promise);
    const view = renderSession();
    expect(view.session.status).toBe('checking');
    const signal = api.mock.calls[0]?.[1]?.signal;

    const request = beginSignOut(view);
    expectLocallySignedOut();
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      if (outcome === 'resolved') check.resolve(signedIn());
      else check.reject(new Error('Old session check failed'));
      logout.resolve({});
      await request;
    });

    expectLocallySignedOut();
    expect(view.session.problem).toBe('');
  });

  it.each(['resolved', 'rejected'] as const)('keeps account B when the old logout is %s after a new refresh', async (outcome) => {
    const logout = deferred<unknown>();
    vi.spyOn(http, 'apiRequest')
      .mockResolvedValueOnce(signedIn())
      .mockReturnValueOnce(logout.promise)
      .mockResolvedValueOnce(signedIn('account-b', 'csrf-b'));
    const view = renderSession();
    await waitFor(() => expect(view.session.status).toBe('signedIn'));

    const request = beginSignOut(view);
    expectLocallySignedOut();
    act(() => view.session.refresh());
    await waitFor(() => expect(view.session.user?.id).toBe('account-b'));
    const owner = captureSessionScope();
    emergencyStore.setLocationNote('Account B location');
    await act(async () => {
      if (outcome === 'resolved') logout.resolve({});
      else logout.reject(new Error('Old logout failed'));
      await expect(request).resolves.toBeUndefined();
    });

    expect(view.session.status).toBe('signedIn');
    expect(view.session.user?.id).toBe('account-b');
    expect(view.session.problem).toBe('');
    expect(http.getCsrfToken()).toBe('csrf-b');
    expect(captureSessionScope()).toBe(owner);
    expect(isCurrentSessionScope(owner)).toBe(true);
    expect(emergencyStore.locationNote).toBe('Account B location');
  });

  it('clears the current account scope, token and feature state when its session expires', async () => {
    const listeners: (() => void)[] = [];
    const unsubscribe = vi.fn();
    vi.spyOn(http, 'onSessionExpired').mockImplementation((listener) => {
      listeners.push(listener);
      return unsubscribe;
    });
    vi.spyOn(http, 'apiRequest').mockResolvedValueOnce(signedIn());
    const view = renderSession();
    await waitFor(() => expect(view.session.status).toBe('signedIn'));
    const owner = captureSessionScope();
    emergencyStore.setLocationNote('Account A location');
    const expire = listeners[0];
    if (!expire) throw new Error('Session expiry listener was not registered');

    act(expire);

    expectLocallySignedOut();
    expect(isCurrentSessionScope(owner)).toBe(false);
    expect(view.session.problem).not.toBe('');
    view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('clears scope on unmount and ignores a refresh that completes after unmount', async () => {
    const check = deferred<SessionResponse>();
    const api = vi.spyOn(http, 'apiRequest')
      .mockResolvedValueOnce(signedIn())
      .mockReturnValueOnce(check.promise);
    const view = renderSession();
    await waitFor(() => expect(view.session.status).toBe('signedIn'));
    const owner = captureSessionScope();
    emergencyStore.setLocationNote('Account A location');
    act(() => view.session.refresh());
    const signal = api.mock.calls[1]?.[1]?.signal;

    view.unmount();
    expect(signal?.aborted).toBe(true);
    expect(captureSessionScope().accountId).toBeNull();
    expect(http.getCsrfToken()).toBe('');
    expect(isCurrentSessionScope(owner)).toBe(false);
    expect(emergencyStore.locationNote).toBe('');
    await act(async () => { check.resolve(signedIn('account-b', 'csrf-b')); });
    expect(captureSessionScope().accountId).toBeNull();
    expect(http.getCsrfToken()).toBe('');
  });

  it('preserves the same account scope and feature state when its session refresh succeeds', async () => {
    const check = deferred<SessionResponse>();
    vi.spyOn(http, 'apiRequest')
      .mockResolvedValueOnce(signedIn())
      .mockReturnValueOnce(check.promise);
    const view = renderSession();
    await waitFor(() => expect(view.session.status).toBe('signedIn'));
    const owner = captureSessionScope();
    emergencyStore.setLocationNote('Account A location');

    act(() => view.session.refresh());
    expect(view.session.status).toBe('checking');
    expect(captureSessionScope()).toBe(owner);
    await act(async () => { check.resolve(signedIn(student.id, 'csrf-refreshed')); });

    expect(view.session.status).toBe('signedIn');
    expect(http.getCsrfToken()).toBe('csrf-refreshed');
    expect(captureSessionScope()).toBe(owner);
    expect(emergencyStore.locationNote).toBe('Account A location');
  });
});

describe('home destinations', () => {
  it('gives the clinician console to doctors only, and staff consoles stay on the web', () => {
    expect(destinationsFor('STUDENT').map((d) => d.route)).not.toContain('ClinicianConsole');
    expect(destinationsFor('NMC_DOCTOR').map((d) => d.route)).toContain('ClinicianConsole');
    expect(destinationsFor('SUPER_ADMIN')).toHaveLength(0);
    expect(destinationsFor('VENDOR')).toHaveLength(0);
  });
});
