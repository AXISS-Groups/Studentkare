import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@/data/services/http';
import { LanguageProvider } from '@/i18n';

// A channel that can't deliver never traps a student (WhatsApp session down,
// or no channel at all). Only what /auth/options returns is drawn; a failed
// send keeps what was typed and offers email in one tap; with no channel the
// screen says so honestly and crisis help stays one tap away.

let channels: string[] = ['EMAIL', 'WHATSAPP'];
let sendAnswer: (init?: RequestInit) => Promise<unknown> = async () => ({ targetMasked: 'k•••••@vnrvjiet.in', expiresInSeconds: 300 });
let optionsAnswer: () => Promise<unknown> = async () => ({ channels });
const apiRequest = vi.fn(async (path: string, init?: RequestInit): Promise<unknown> => {
  if (path === '/auth/options') return optionsAnswer();
  if (path === '/auth/remembered') return { remembered: false };
  if (path === '/auth/otp/send') return sendAnswer(init);
  return {};
});
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ acceptSession: vi.fn(), status: 'anonymous', user: null }) }));
vi.mock('@/core/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/navigation')>()),
  useLocation: () => ({ pathname: '/signup', search: '' }),
}));
const navigateSpy = vi.fn();
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()),
  navigate: (...args: unknown[]) => navigateSpy(...args),
}));

import { AuthenticatedFlowScreen } from '../../screens/AuthenticatedFlowScreen';

const whatsappDown = () => {
  throw new ApiError('We couldn’t send your code that way just now.', 503,
    { code: 'CHANNEL_UNAVAILABLE', channel: 'WHATSAPP', channels: ['EMAIL'], message: 'We couldn’t send your code that way just now.' });
};

function at(width: 'phone' | 'web') {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: width === 'phone' && query.includes('max-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function draw(mode: 'login' | 'signup') {
  return render(<LanguageProvider><AuthenticatedFlowScreen mode={mode} next={null} /></LanguageProvider>);
}

async function toContactStep() {
  const view = draw('signup');
  fireEvent.click(await screen.findByRole('button', { name: /Create my account/ }));
  await screen.findByRole('heading', { name: 'Create your account' });
  return view;
}

beforeEach(() => {
  window.localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  apiRequest.mockClear();
  navigateSpy.mockClear();
  channels = ['EMAIL', 'WHATSAPP'];
  optionsAnswer = async () => ({ channels });
  sendAnswer = async () => ({ targetMasked: 'k•••••@vnrvjiet.in', expiresInSeconds: 300 });
});
afterEach(() => vi.unstubAllGlobals());

describe.each(['phone', 'web'] as const)('Create account when WhatsApp fails (%s)', { timeout: 20_000 }, (width) => {
  beforeEach(() => at(width));

  it('keeps the typed name and offers email in one tap, focused', async () => {
    sendAnswer = async () => whatsappDown();
    await toContactStep();
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Krishna Chintakayala' } });
    fireEvent.click(screen.getByRole('button', { name: 'WhatsApp' }));
    fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '9121495077' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t send your code on WhatsApp');
    expect(document.body.textContent).not.toMatch(/administrator/i);
    // The note sits by the field and the field points at it.
    const number = screen.getByLabelText('WhatsApp number');
    expect(number.getAttribute('aria-describedby')).toContain(alert.id);
    expect(screen.getByLabelText('Full name')).toHaveValue('Krishna Chintakayala');
    // WhatsApp is no longer offered: one channel left, so no switcher.
    expect(screen.queryByRole('group', { name: 'How we send your code' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Send the code by email instead' }));
    const email = await screen.findByLabelText('Campus email address');
    await waitFor(() => expect(email).toHaveFocus());
    expect(screen.getByLabelText('Full name')).toHaveValue('Krishna Chintakayala');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says honestly when no channel can send a code, with crisis help in reach', async () => {
    channels = [];
    await toContactStep();
    expect(await screen.findByRole('heading', { name: 'Sign-in codes can’t be sent right now' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send verification code' })).toBeNull();
    expect(screen.getByRole('button', { name: /call 112/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tele-MANAS/i })).toBeInTheDocument();
    channels = ['EMAIL'];
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByLabelText('Campus email address')).toBeInTheDocument();
  });
});

describe.each(['phone', 'web'] as const)('Sign in when a channel fails (%s)', { timeout: 20_000 }, (width) => {
  beforeEach(() => at(width));

  it('offers email after a WhatsApp 503, never "contact the administrator"', async () => {
    sendAnswer = async () => whatsappDown();
    draw('login');
    fireEvent.click(await screen.findByRole('button', { name: 'WhatsApp' }));
    fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '9121495077' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    expect(await screen.findByText('We couldn’t send your code on WhatsApp')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/administrator/i);
    fireEvent.click(screen.getByRole('button', { name: 'Send the code by email instead' }));
    await waitFor(() => expect(screen.getByLabelText('Campus email address')).toHaveFocus());
  });

  it('draws the no-channel state instead of a dead form', async () => {
    channels = [];
    draw('login');
    expect(await screen.findByText('Sign-in codes can’t be sent right now')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: /call 112/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lost your phone\? Secure your account/ })).toBeInTheDocument();
  });

  it('keeps the form usable when the options cannot be read', async () => {
    optionsAnswer = async () => { throw new ApiError('offline', 0); };
    draw('login');
    expect(await screen.findByText('We couldn’t check how codes are sent right now. You can still try.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'WhatsApp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send verification code' })).toBeEnabled();
  });

  it('turns "no active account" into a next step: create one', async () => {
    sendAnswer = async () => { throw new ApiError('No active account was found. Create an account to continue.', 404); };
    draw('login');
    fireEvent.click(await screen.findByRole('button', { name: 'Email' }));
    fireEvent.change(screen.getByLabelText('Campus email address'), { target: { value: 'k@vnrvjiet.in' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No account uses this yet');
    fireEvent.click(within(alert).getByRole('button', { name: 'Create an account' }));
    expect(navigateSpy).toHaveBeenCalledWith('signup', undefined);
  });
});
