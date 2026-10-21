import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/data/services/http';
import { LanguageProvider } from '@/i18n';

// Sign in → code (SignIn, WebSignIn, OtpVerify; Tier 1). A refused, expired or
// rate-limited code never opens a session; copy follows the server, not the board.

let channels = ['EMAIL', 'WHATSAPP'];
let verifyAnswer: () => Promise<unknown> = async () => ({ success: true, user: { id: 'u1', role: 'STUDENT' }, csrfToken: 'c' });
const apiRequest = vi.fn(async (path: string, _init?: RequestInit): Promise<unknown> => {
  if (path === '/auth/options') return { channels };
  if (path === '/auth/remembered') return { remembered: false };
  if (path === '/auth/otp/send') return { targetMasked: 'k•••••@vnrvjiet.in', expiresInSeconds: 300 };
  if (path === '/auth/otp/verify') return verifyAnswer();
  return {};
});
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));
const acceptSession = vi.fn();
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ acceptSession, status: 'anonymous', user: null }) }));
vi.mock('@/core/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/navigation')>()),
  useLocation: () => ({ pathname: '/login', search: '' }),
}));
let dev = false;
vi.mock('@/core/env', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/core/env')>()), isDev: () => dev }));

import { AuthenticatedFlowScreen } from '../../screens/AuthenticatedFlowScreen';
import { expiryCopy, clock } from '../OtpVerifyView';

function at(width: 'phone' | 'web') {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: width === 'phone' && query.includes('max-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function renderSignIn() {
  return render(<LanguageProvider><AuthenticatedFlowScreen mode="login" next={null} /></LanguageProvider>);
}

async function toCode() {
  const view = renderSignIn();
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/auth/options', undefined));
  fireEvent.click(screen.getByRole('button', { name: 'Email' }));
  fireEvent.change(screen.getByLabelText('Campus email address'), { target: { value: 'k@vnrvjiet.in' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
  await screen.findByRole('heading', { name: 'Enter your code' });
  return view;
}

beforeEach(() => {
  window.localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  apiRequest.mockClear();
  acceptSession.mockClear();
  channels = ['EMAIL', 'WHATSAPP'];
  dev = false;
  verifyAnswer = async () => ({ success: true, user: { id: 'u1', role: 'STUDENT' }, csrfToken: 'c' });
});
afterEach(() => vi.unstubAllGlobals());

describe.each(['phone', 'web'] as const)('Sign in (%s board)', { timeout: 20_000 }, (width) => {
  beforeEach(() => at(width));

  it('draws the brief’s icons and the brand mark, with no stepper', async () => {
    const { container } = renderSignIn();
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/auth/options', undefined));
    const icons = ['chevron-right', 'graduation-cap', 'mail-2', 'message-circle-3', ...(width === 'phone' ? ['arrow-left'] : ['check'])];
    for (const icon of icons) expect(container.querySelector(`[data-icon="${icon}"]`)).not.toBeNull();
    expect(container.querySelector('[data-icon="brand:studentkare-logo"]')).not.toBeNull();
    expect(screen.queryByText(/Step 1 of 3/)).toBeNull();
    expect(container.textContent).not.toContain('→');
  });

  it('keeps crisis help and the lost-phone link on the signed-out screen', async () => {
    renderSignIn();
    expect(screen.getByRole('button', { name: /call 112/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lost your phone\? Secure your account/ })).toHaveAttribute('href', '/lost-phone');
  });

  it('draws campus ID switched off, with the reason', async () => {
    renderSignIn();
    const sso = screen.getByRole('button', { name: /Continue with campus ID/ });
    expect(sso).toBeDisabled();
    expect(screen.getByText('Not available for your campus yet')).toBeInTheDocument();
  });

  it('switches the language for the whole screen', async () => {
    renderSignIn();
    fireEvent.click(screen.getByRole('button', { name: 'తెలుగు' }));
    expect(await screen.findByRole('button', { name: 'ధృవీకరణ కోడ్ పంపండి' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(await screen.findByRole('button', { name: 'Send verification code' })).toBeInTheDocument();
  });

  it('draws only the channels /auth/options returned: one channel, no switcher', async () => {
    channels = ['EMAIL'];
    renderSignIn();
    expect(await screen.findByLabelText('Campus email address')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'WhatsApp' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'How we send your code' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Send verification code' })).toBeEnabled();
  });

  it('shows no demo logins outside development builds', async () => {
    renderSignIn();
    expect(screen.queryByText(/demo logins/i)).toBeNull();
  });

  it('says the code’s expiry from the server, not the board', async () => {
    await toCode();
    expect(screen.getByText('We sent a 6-digit code. It expires in 5 minutes.')).toBeInTheDocument();
    expect(screen.queryByText(/10 minutes/)).toBeNull();
    expect(screen.getByText('k•••••@vnrvjiet.in')).toBeInTheDocument();
  });

  it('opens no session for a wrong code and says so', async () => {
    verifyAnswer = async () => { throw new ApiError('Invalid or expired verification code. Request a new code if needed.', 401); };
    const { container } = await toCode();
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    expect(await screen.findByText('That code didn’t work')).toBeInTheDocument();
    expect(acceptSession).not.toHaveBeenCalled();
    expect(container.querySelector('[data-icon="alert-circle-4"]')).not.toBeNull();
  });

  it('holds the student back after too many tries, with no session', async () => {
    verifyAnswer = async () => { throw new ApiError('Too many attempts. Please wait before trying again.', 429); };
    await toCode();
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    expect(await screen.findByText('Too many tries')).toBeInTheDocument();
    expect(acceptSession).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });
    expect(screen.getByRole('button', { name: 'Verify and continue' })).toBeDisabled();
  });

  it('accepts the session only from a verified code', async () => {
    await toCode();
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '482913' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    await waitFor(() => expect(acceptSession).toHaveBeenCalledTimes(1));
  });

  it('Edit goes back to the form with the address kept', async () => {
    await toCode();
    fireEvent.click(screen.getByRole('button', { name: 'Edit where the code goes' }));
    expect(await screen.findByLabelText('Campus email address')).toHaveValue('k@vnrvjiet.in');
  });
});

describe('code copy', () => {
  it('follows the server seconds', () => {
    expect(expiryCopy(300)).toEqual({ key: 'ident.otp.lead', vars: { minutes: 5 } });
    expect(expiryCopy(60)).toEqual({ key: 'ident.otp.leadOne' });
    expect(expiryCopy(45)).toEqual({ key: 'ident.otp.leadSeconds', vars: { seconds: 45 } });
    expect(expiryCopy(0)).toEqual({ key: 'ident.otp.leadUnknown' });
  });
  it('shows the resend wait as a clock', () => {
    expect(clock(29)).toBe('00:29');
    expect(clock(75)).toBe('01:15');
  });
});
