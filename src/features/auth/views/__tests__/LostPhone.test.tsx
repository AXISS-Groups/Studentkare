import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

// Lost your phone (LostPhone / WebLostPhone, Tier 1). Signed out it asks for a
// code first; signed in nothing is revoked without the confirm; failure says
// failed; crisis numbers are on screen either way.

let revoke: () => Promise<unknown> = async () => ({ sessionsRevoked: 2, passCancelled: true });
const apiRequest = vi.fn(async (path: string) => (path === '/auth/sessions/revoke-others' ? revoke() : {}));
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string) => apiRequest(path),
}));
let auth: { status: string; user: null | { fullName: string; role: string; university: string; isVerifiedStudent: boolean; email: string; phone: string } } = { status: 'anonymous', user: null };
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ ...auth, logout: vi.fn(), acceptSession: vi.fn() }) }));
vi.mock('@/data/contexts/LiveCartContext', () => ({ useLiveCartCount: () => 0 }));
vi.mock('@/components/health/NotificationCenterModal', () => ({ NotificationCenterModal: () => null }));
const navigate = vi.fn();
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()),
  navigate: (...args: unknown[]) => navigate(...args),
}));

import { LostPhoneView } from '../LostPhoneView';

const STUDENT = { fullName: 'Krishna Chintakayala', role: 'STUDENT', university: 'VNR VJIET', isVerifiedStudent: true, email: 'k@vnrvjiet.in', phone: '' };

function at(width: 'phone' | 'web') {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: width === 'phone' && query.includes('max-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => {
  apiRequest.mockClear();
  navigate.mockClear();
  revoke = async () => ({ sessionsRevoked: 2, passCancelled: true });
  auth = { status: 'anonymous', user: null };
});
afterEach(() => vi.unstubAllGlobals());

describe('Lost phone, signed out (a friend’s phone)', () => {
  beforeEach(() => at('phone'));

  it('asks for a code first and revokes nothing', () => {
    render(<LostPhoneView />);
    expect(screen.getByText(/Using a friend’s phone is fine/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('lost-sign-in'));
    expect(navigate).toHaveBeenCalledWith('login', 'lost-phone');
    expect(screen.queryByTestId('lost-secure')).toBeNull();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('keeps 112 and Tele-MANAS on screen, and never asks for the code by phone', () => {
    render(<LostPhoneView />);
    const crisis = screen.getByTestId('lost-crisis');
    expect(within(crisis).getByRole('link', { name: /Call 112/ })).toBeInTheDocument();
    expect(within(crisis).getByRole('link', { name: /Tele-MANAS/ })).toBeInTheDocument();
    within(crisis).getAllByRole('link').forEach((link) => expect(link.tabIndex).toBeGreaterThanOrEqual(0));
    expect(screen.getByText('We never ask for your code by phone call.')).toBeInTheDocument();
  });
});

describe.each(['phone', 'web'] as const)('Lost phone, signed in (%s)', (width) => {
  beforeEach(() => { at(width); auth = { status: 'authenticated', user: STUDENT }; });

  it('asks before signing anything out', async () => {
    render(<LostPhoneView />);
    fireEvent.click(screen.getByTestId('lost-secure'));
    expect(apiRequest).not.toHaveBeenCalled();
    expect(await screen.findByText('Sign out every other device?')).toBeInTheDocument();
  });

  it('reports only what the server confirmed', async () => {
    const { container } = render(<LostPhoneView />);
    fireEvent.click(screen.getByTestId('lost-secure'));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, secure it' }));
    expect(await screen.findByText('Signed out of 2 other devices.')).toBeInTheDocument();
    expect(screen.getByText('Your check-in pass was cancelled.')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-icon="check"]')).not.toBeNull();
    expect(container.querySelector('[data-icon="arrow-right"]')).not.toBeNull();
  });

  it('says it failed when it failed, never done', async () => {
    revoke = async () => { throw new Error('offline'); };
    render(<LostPhoneView />);
    fireEvent.click(screen.getByTestId('lost-secure'));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, secure it' }));
    expect(await screen.findByText('Nothing was signed out')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('lost-result')).toBeNull());
  });

  it('does not list devices it cannot know', () => {
    render(<LostPhoneView />);
    expect(screen.getByText(/We can’t list your devices yet/)).toBeInTheDocument();
    expect(screen.queryByText(/iPhone|Redmi|Chrome on Windows/)).toBeNull();
  });
});

describe('Lost phone, web board', () => {
  beforeEach(() => { at('web'); auth = { status: 'authenticated', user: STUDENT }; });

  it('sits in the student web shell and keeps only true claims', () => {
    const { container } = render(<LostPhoneView />);
    expect(screen.getByRole('heading', { level: 1, name: 'Lost your phone?' })).toBeInTheDocument();
    expect(container.querySelector('[data-icon="brand:studentkare-logo"]')).not.toBeNull();
    expect(screen.queryByText(/face or PIN|live photo match|within 2 hours/i)).toBeNull();
  });
});
