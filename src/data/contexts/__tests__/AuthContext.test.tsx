import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

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
});
