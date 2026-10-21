import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/data/services/http';

// Staff sign-in (AdminSignIn, Tier 1). The page asks the server for STAFF only;
// the server's refusal is shown as it is (it never says a student account exists);
// the authenticator step can't be skipped; the server's lock message is shown.

const STAFF_NOT_FOUND = 'No staff account uses this email. Staff accounts are created by an administrator.';
let sendAnswer: () => Promise<unknown> = async () => ({ targetMasked: 'p•••@vnrvjiet.in', expiresInSeconds: 300 });
let verifyAnswer: () => Promise<unknown> = async () => ({ success: true, requires2FA: true, tempToken: 't1', user: null });
const apiRequest = vi.fn(async (path: string, _init?: RequestInit): Promise<unknown> => {
  if (path === '/auth/otp/send') return sendAnswer();
  if (path === '/auth/otp/verify') return verifyAnswer();
  if (path === '/auth/2fa/challenge') return { success: true, user: { id: 'a1', role: 'CAMPUS_ADMIN' }, csrfToken: 'c' };
  return {};
});
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));
const acceptSession = vi.fn();
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ acceptSession, status: 'anonymous', user: null }) }));
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()),
  navigate: vi.fn(),
}));

import { AdminSignInScreen } from '../AdminSignInView';

async function sendFor(email: string) {
  const view = render(<AdminSignInScreen />);
  fireEvent.change(screen.getByLabelText('Work email'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Email me a code' }));
  return view;
}

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  apiRequest.mockClear();
  acceptSession.mockClear();
  sendAnswer = async () => ({ targetMasked: 'p•••@vnrvjiet.in', expiresInSeconds: 300 });
  verifyAnswer = async () => ({ success: true, requires2FA: true, tempToken: 't1', user: null });
});

describe('Staff sign-in', { timeout: 20_000 }, () => {
  it('has its own frame: brand, staff badge, no sign-up', () => {
    const { container } = render(<AdminSignInScreen />);
    expect(container.querySelector('[data-icon="brand:studentkare-logo"]')).not.toBeNull();
    expect(screen.getByText('STAFF & ADMIN')).toBeInTheDocument();
    expect(screen.queryByText(/Create an account/)).toBeNull();
    expect(screen.queryByText(/demo/i)).toBeNull();
  });

  it('asks the server for a staff code by email', async () => {
    await sendFor('priya.rao@vnrvjiet.in');
    await screen.findByRole('heading', { name: 'Enter your code' });
    const [path, init] = apiRequest.mock.calls[0];
    expect(path).toBe('/auth/otp/send');
    expect(JSON.parse(String(init?.body))).toMatchObject({ identifier: 'priya.rao@vnrvjiet.in', channel: 'EMAIL', intent: 'LOGIN', audience: 'STAFF' });
    expect(screen.getByText('We sent a 6-digit code. It expires in 5 minutes.')).toBeInTheDocument();
    expect(screen.queryByText(/Use WhatsApp instead/)).toBeNull();
  });

  it('shows the server’s one answer for a student or unknown email, and sends no code', async () => {
    sendAnswer = async () => { throw new ApiError(STAFF_NOT_FOUND, 404); };
    await sendFor('student@vnrvjiet.in');
    expect(await screen.findByText(STAFF_NOT_FOUND)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Enter your code' })).toBeNull();
    expect(acceptSession).not.toHaveBeenCalled();
  });

  it('cannot skip the authenticator step', async () => {
    await sendFor('priya.rao@vnrvjiet.in');
    fireEvent.change(await screen.findByLabelText('Verification code'), { target: { value: '482913' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    expect(await screen.findByText('Two-factor check.')).toBeInTheDocument();
    expect(acceptSession).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Authenticator code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));
    await waitFor(() => expect(acceptSession).toHaveBeenCalledTimes(1));
  });

  it('shows the server’s lock message, not the board’s numbers', async () => {
    sendAnswer = async () => { throw new ApiError('Too many attempts. Please wait before trying again.', 429); };
    await sendFor('priya.rao@vnrvjiet.in');
    expect(await screen.findByText('Too many attempts. Please wait before trying again.')).toBeInTheDocument();
    expect(screen.queryByText(/15 minutes|8 hours|tries left/)).toBeNull();
  });
});
