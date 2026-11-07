import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

const navigation = vi.hoisted(() => ({ go: vi.fn() }));
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()),
  navigate: navigation.go,
}));

function Probe() {
  const auth = useAuth();
  return <p data-testid="probe">{`${auth.status}|${auth.errorStatus}|${auth.error}`}</p>;
}

function respond(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })));
}

afterEach(() => vi.unstubAllGlobals());

describe('the session check', () => {
  it('keeps the 429 status when the server rate-limits it, so the app can ask for a moment', async () => {
    respond(429, { detail: 'Too many requests. Please try again shortly.' });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('error|429|Too many requests. Please try again shortly.'));
  });

  it('never treats a rate-limited check as signed in', async () => {
    respond(429, { detail: 'Too many requests. Please try again shortly.' });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toMatch(/^error\|/));
    expect(screen.getByTestId('probe').textContent).not.toMatch(/^authenticated/);
  });

  it('does not restore an unsigned local demo profile when the server session check fails', async () => {
    sessionStorage.setItem('care_demo_session', JSON.stringify({ id: 'demo-student', fullName: 'Demo Student', role: 'STUDENT' }));
    respond(503, { detail: 'Session unavailable.' });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('error|503|Session unavailable.'));
  });

  it('accepts a lab collector’s session (live-run audit #6), and still refuses a role it does not know', async () => {
    respond(200, { user: { id: 'c1', fullName: 'Demo Collector', role: 'LAB_COLLECTOR' }, csrfToken: 'csrf' });
    const { unmount } = render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('authenticated|0|'));
    unmount();
    respond(200, { user: { id: 'x1', fullName: 'Someone', role: 'ROOT' }, csrfToken: 'csrf' });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('error|0|Invalid authenticated session.'));
  });

  it('clears the status once a check succeeds', async () => {
    respond(200, { user: null, csrfToken: '' });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('anonymous|0|'));
  });

  it('returns to the site homepage after the server confirms logout', async () => {
    respond(200, { user: null, csrfToken: '' });
    let logout!: ReturnType<typeof useAuth>['logout'];
    function LogoutProbe() {
      logout = useAuth().logout;
      return null;
    }
    render(<AuthProvider><LogoutProbe /></AuthProvider>);
    await waitFor(() => expect(logout).toBeTypeOf('function'));

    await act(async () => { await logout(); });

    expect(navigation.go).toHaveBeenCalledWith('');
    expect(navigation.go).not.toHaveBeenCalledWith('logged-out');
  });

  it('clears the local session and returns home even if the logout request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail: 'Already signed out.' }), { status: 401, headers: { 'Content-Type': 'application/json' } })));
    let logout!: ReturnType<typeof useAuth>['logout'];
    function LogoutProbe() {
      logout = useAuth().logout;
      return null;
    }
    render(<AuthProvider><LogoutProbe /></AuthProvider>);
    await waitFor(() => expect(logout).toBeTypeOf('function'));

    await expect(act(async () => { await logout(); })).rejects.toThrow('Already signed out.');

    expect(navigation.go).toHaveBeenCalledWith('');
  });
});
