import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/data/services/http';
import { LanguageProvider } from '@/i18n';
import { axeViolations, describeViolations } from '@/test/axe';

// Sign-in redesign, remembered sign-in and the student passcode (plan
// tier1-canvas-wp03, amendment 2026-10-22 b). The server decides everything;
// these check what the screens send, show and never keep.

type Remembered = { remembered: false } | { remembered: true; targetMasked: string; channel: 'EMAIL' | 'WHATSAPP'; lastRoute: string; passcode?: boolean };
let remembered: Remembered = { remembered: false };
let passcodeAnswer: () => Promise<unknown> = async () => ({ success: true, user: { id: 'u1', role: 'STUDENT' }, csrfToken: 'c' });
const apiRequest = vi.fn(async (path: string, _init?: RequestInit): Promise<unknown> => {
  if (path === '/auth/options') return { channels: ['EMAIL', 'WHATSAPP'] };
  if (path === '/auth/remembered') return remembered;
  if (path === '/auth/remembered/forget') return { success: true };
  if (path === '/auth/remembered/send' || path === '/auth/otp/send') return { targetMasked: '+91 ••••••5077', expiresInSeconds: 300 };
  if (path === '/auth/passcode/sign-in') return passcodeAnswer();
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
const navigateTo = vi.fn();
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()),
  navigate: (path: string, next?: string) => navigateTo(path, next),
}));
let passcodeSwitch = true;
vi.mock('@/data/services/config', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/services/config')>();
  return { ...real, getSetting: (key: Parameters<typeof real.getSetting>[0]) => (key === 'auth.passcode_login_enabled' ? passcodeSwitch : real.getSetting(key)) };
});
let reduced = false;
vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => reduced,
}));

import { AuthenticatedFlowScreen } from '../../screens/AuthenticatedFlowScreen';
import { AuthHeroSlides, AUTH_SLIDES } from '../AuthHeroSlides';
import { SignInFrame } from '../SignInFrame';

function at(width: 'phone' | 'web') {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: (width === 'phone' && query.includes('max-width')) || (reduced && query.includes('reduce')),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

const renderSignIn = () => render(<LanguageProvider><AuthenticatedFlowScreen mode="login" next={null} /></LanguageProvider>);
const renderSignUp = () => render(<LanguageProvider><AuthenticatedFlowScreen mode="signup" next={null} /></LanguageProvider>);
/** Waits for the remembered card (it loads after the typed form), then opens the passcode panel. */
async function openRememberedPasscode() {
  await screen.findByRole('button', { name: /Continue as/ });
  fireEvent.click(screen.getByRole('button', { name: 'Use my passcode' }));
}
const posted = (path: string) => apiRequest.mock.calls.filter(([p]) => p === path).map(([, init]) => JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  apiRequest.mockClear();
  acceptSession.mockClear();
  navigateTo.mockClear();
  remembered = { remembered: false };
  passcodeSwitch = true;
  reduced = false;
  passcodeAnswer = async () => ({ success: true, user: { id: 'u1', role: 'STUDENT' }, csrfToken: 'c' });
  at('web');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('the logo', () => {
  it.each(['web', 'phone'] as const)('goes to the public home page on sign-in (%s)', async (width) => {
    at(width);
    const { container } = renderSignIn();
    const link = await screen.findByRole('link', { name: /Student Kare home/ });
    expect(link.getAttribute('href')).toBe('/');
    expect(link.querySelector('[data-icon="brand:studentkare-logo"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-testid="auth-logo-home"]')).toHaveLength(1);
  });

  it('goes to the public home page on create account too', async () => {
    renderSignUp();
    expect((await screen.findByRole('link', { name: /Student Kare home/ })).getAttribute('href')).toBe('/');
  });
});

describe('Sign in / Create account tabs', () => {
  it('highlights the page in view and links to the other', async () => {
    renderSignIn();
    const tabs = await screen.findByRole('navigation', { name: 'Sign in or create an account' });
    const signIn = screen.getByRole('link', { name: 'Sign in' });
    expect(tabs.contains(signIn)).toBe(true);
    expect(signIn.getAttribute('aria-current')).toBe('page');
    const create = screen.getByRole('link', { name: 'Create account' });
    expect(create.getAttribute('aria-current')).toBeNull();
    fireEvent.click(create);
    expect(navigateTo).toHaveBeenCalledWith('signup', undefined);
  });

  it('marks Create account on the sign-up page', async () => {
    renderSignUp();
    expect((await screen.findByRole('link', { name: 'Create account' })).getAttribute('aria-current')).toBe('page');
  });
});

describe('the device remembers the last sign-in', () => {
  it('offers a remembered email, masked, with the mail icon', async () => {
    remembered = { remembered: true, targetMasked: 'a•••@vnrvjiet.in', channel: 'EMAIL', lastRoute: '', passcode: false };
    const { container } = renderSignIn();
    expect(await screen.findByRole('button', { name: 'Continue as a•••@vnrvjiet.in' })).toBeTruthy();
    const card = container.querySelector('[data-testid="remembered-account"]');
    expect(card?.textContent).toContain('a•••@vnrvjiet.in');
    expect(card?.querySelector('[data-icon="mail-2"]')).not.toBeNull();
    // No passcode on this account: no passcode option.
    expect(screen.queryByRole('button', { name: 'Use my passcode' })).toBeNull();
  });

  it('offers a remembered phone, masked, and the passcode beside the code when the account has one', async () => {
    remembered = { remembered: true, targetMasked: '+91 ••••••5077', channel: 'WHATSAPP', lastRoute: '', passcode: true };
    const { container } = renderSignIn();
    expect(await screen.findByRole('button', { name: 'Continue as +91 ••••••5077' })).toBeTruthy();
    expect(container.querySelector('[data-testid="remembered-account"] [data-icon="message-circle-3"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Use my passcode' })).toBeTruthy();
    expect(container.textContent).not.toMatch(/\d{10}/);
  });

  it('"Not you?" hides it for this visit; "Forget this device" asks the server to forget it', async () => {
    remembered = { remembered: true, targetMasked: '+91 ••••••5077', channel: 'WHATSAPP', lastRoute: '', passcode: true };
    renderSignIn();
    fireEvent.click(await screen.findByRole('button', { name: 'Not you? Use another account' }));
    expect(screen.queryByRole('button', { name: /Continue as/ })).toBeNull();
    expect(apiRequest).not.toHaveBeenCalledWith('/auth/remembered/forget', expect.anything());
  });

  it('forget this device clears it', async () => {
    remembered = { remembered: true, targetMasked: 'a•••@vnrvjiet.in', channel: 'EMAIL', lastRoute: '' };
    renderSignIn();
    fireEvent.click(await screen.findByRole('button', { name: 'Forget this device' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/auth/remembered/forget', { method: 'POST' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Continue as/ })).toBeNull());
  });

  it('never writes the identifier, a code or a passcode to browser storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    remembered = { remembered: true, targetMasked: '+91 ••••••5077', channel: 'WHATSAPP', lastRoute: '', passcode: true };
    renderSignIn();
    await openRememberedPasscode();
    fireEvent.change(screen.getByLabelText('Passcode'), { target: { value: 'k7#Qm2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(acceptSession).toHaveBeenCalled());
    const written = setItem.mock.calls.map(([, value]) => String(value)).join(' ');
    expect(written).not.toContain('k7#Qm2');
    expect(written).not.toContain('5077');
    setItem.mockRestore();
  });
});

describe('passcode sign-in', () => {
  it('on "Continue as" sends only the passcode (the device is the account) and opens the session', async () => {
    remembered = { remembered: true, targetMasked: '+91 ••••••5077', channel: 'WHATSAPP', lastRoute: '', passcode: true };
    renderSignIn();
    await openRememberedPasscode();
    const field = screen.getByLabelText('Passcode') as HTMLInputElement;
    expect(field.type).toBe('password');
    expect(field.getAttribute('autocomplete')).toBe('current-password');
    const submit = screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement;
    fireEvent.change(field, { target: { value: 'k7#Qm' } });            // 5: not a passcode length
    expect(submit.disabled).toBe(true);
    fireEvent.change(field, { target: { value: 'k7#Qm2' } });
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    await waitFor(() => expect(acceptSession).toHaveBeenCalled());
    expect(posted('/auth/passcode/sign-in')).toEqual([{ passcode: 'k7#Qm2' }]);
  });

  it('from the typed form, needs the email or number first, then sends it', async () => {
    renderSignIn();
    fireEvent.click(await screen.findByRole('button', { name: 'Use my passcode' }));
    expect(screen.getByText(/Type your email or number first/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '9876505077' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use my passcode' }));
    fireEvent.change(screen.getByLabelText('Passcode'), { target: { value: 'Rv8!tq3Z' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(acceptSession).toHaveBeenCalled());
    expect(posted('/auth/passcode/sign-in')).toEqual([{ passcode: 'Rv8!tq3Z', identifier: '9876505077' }]);
  });

  it('a new device is told to use a code first, with the action, and gets no session', async () => {
    passcodeAnswer = async () => { throw new ApiError('On this device, sign in with a code first.', 403, { code: 'PASSCODE_NEW_DEVICE' }); };
    renderSignIn();
    fireEvent.change(await screen.findByLabelText('WhatsApp number'), { target: { value: '9876505077' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use my passcode' }));
    fireEvent.change(screen.getByLabelText('Passcode'), { target: { value: 'k7#Qm2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Use a code on this device first')).toBeTruthy();
    expect(acceptSession).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Passcode') as HTMLInputElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Send me a code' }));
    await screen.findByRole('heading', { name: 'Enter your code' });
  });

  it('a refused passcode shows the server’s one answer and no session', async () => {
    passcodeAnswer = async () => { throw new ApiError('That passcode didn’t work, or it is locked for now.', 401, { code: 'PASSCODE_FAILED' }); };
    remembered = { remembered: true, targetMasked: '+91 ••••••5077', channel: 'WHATSAPP', lastRoute: '', passcode: true };
    renderSignIn();
    await openRememberedPasscode();
    fireEvent.change(screen.getByLabelText('Passcode'), { target: { value: 'k7#Qm2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText(/locked for now/)).toBeTruthy();
    expect(acceptSession).not.toHaveBeenCalled();
  });

  it('forgot passcode signs in with a code and then goes to set a new one', async () => {
    remembered = { remembered: true, targetMasked: '+91 ••••••5077', channel: 'WHATSAPP', lastRoute: '', passcode: true };
    renderSignIn();
    await openRememberedPasscode();
    fireEvent.click(screen.getByRole('button', { name: 'Forgot your passcode? Sign in with a code' }));
    await screen.findByRole('heading', { name: 'Enter your code' });
    expect(apiRequest).toHaveBeenCalledWith('/auth/remembered/send', { method: 'POST' });
  });

  it('with the switch off there is no passcode option anywhere', async () => {
    passcodeSwitch = false;
    remembered = { remembered: true, targetMasked: '+91 ••••••5077', channel: 'WHATSAPP', lastRoute: '', passcode: true };
    renderSignIn();
    await screen.findByRole('button', { name: /Continue as/ });
    expect(screen.queryByRole('button', { name: 'Use my passcode' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Not you? Use another account' }));
    expect(screen.queryByRole('button', { name: 'Use my passcode' })).toBeNull();
  });
});

describe('hero slides', () => {
  const renderSlides = () => render(<LanguageProvider><SignInFrame web><p>form</p></SignInFrame></LanguageProvider>);
  const active = (container: HTMLElement) => container.querySelector('.sk-slide[data-active="true"]')?.getAttribute('data-testid');

  it('shows four true slides, one at a time, and advances by itself', () => {
    vi.useFakeTimers();
    const { container } = renderSlides();
    expect(container.querySelectorAll('.sk-slide')).toHaveLength(AUTH_SLIDES.length);
    expect(AUTH_SLIDES.map((s) => s.id)).toEqual(['records', 'care', 'meds', 'crisis']);
    expect(active(container)).toBe('auth-slide-records');
    act(() => { vi.advanceTimersByTime(4200); });
    expect(active(container)).toBe('auth-slide-care');
    // Inactive slides are hidden from screen readers.
    expect(container.querySelector('[data-testid="auth-slide-records"]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('holds on hover and on focus, and a dot (keyboard) stops it for good', () => {
    vi.useFakeTimers();
    const { container } = renderSlides();
    const carousel = screen.getByRole('region', { name: 'What Student Kare does' });
    fireEvent.mouseEnter(carousel);
    act(() => { vi.advanceTimersByTime(9000); });
    expect(active(container)).toBe('auth-slide-records');
    fireEvent.mouseLeave(carousel);
    const third = screen.getByRole('button', { name: 'Show slide 3: Medicines and lab tests' });
    fireEvent.focus(third);
    act(() => { vi.advanceTimersByTime(9000); });
    expect(active(container)).toBe('auth-slide-records');
    fireEvent.click(third);
    expect(active(container)).toBe('auth-slide-meds');
    expect(third.getAttribute('aria-current')).toBe('true');
    fireEvent.blur(third);
    act(() => { vi.advanceTimersByTime(9000); });
    expect(active(container)).toBe('auth-slide-meds');
  });

  it('has one icon button that pauses and plays the slides', () => {
    vi.useFakeTimers();
    const { container } = renderSlides();
    const pause = screen.getByRole('button', { name: 'Pause slides' });
    expect(pause.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('pause');
    fireEvent.click(pause);
    act(() => { vi.advanceTimersByTime(9000); });
    expect(active(container)).toBe('auth-slide-records');
    expect(screen.queryByRole('button', { name: 'Pause slides' })).toBeNull();
    const play = screen.getByRole('button', { name: 'Play slides' });
    expect(play.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('play');
    fireEvent.click(play);
    act(() => { vi.advanceTimersByTime(4200); });
    expect(active(container)).toBe('auth-slide-care');
    expect(screen.getByRole('button', { name: 'Pause slides' })).toBeTruthy();
  });

  it('a dot stops the slides and the button then offers play', () => {
    renderSlides();
    fireEvent.click(screen.getByRole('button', { name: 'Show slide 2: A doctor when you need one' }));
    expect(screen.getByRole('button', { name: 'Play slides' })).toBeTruthy();
  });

  it('under reduced motion never advances and offers no pause (nothing moves)', () => {
    reduced = true;
    at('web');
    vi.useFakeTimers();
    const { container } = render(<LanguageProvider><AuthHeroSlides /></LanguageProvider>);
    act(() => { vi.advanceTimersByTime(20000); });
    expect(active(container)).toBe('auth-slide-records');
    expect(screen.queryByRole('button', { name: 'Pause slides' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Play slides' })).toBeNull();
    expect(container.querySelector('.sk-slides')?.getAttribute('data-running')).toBe('false');
  });

  it('draws only kit art (Illustration, Icon3d), never raw svg in the view', () => {
    const { container } = renderSlides();
    const art = container.querySelectorAll('.sk-slide-art [data-icon]');
    const kinds = new Set(Array.from(art).map((node) => node.getAttribute('data-icon')?.split(':')[0]));
    expect([...kinds].sort()).toEqual(['3d', 'illustration']);
  });
});

describe('axe', () => {
  it.each([
    ['sign in (web)', 'web', { remembered: false }],
    ['remembered with passcode (phone)', 'phone', { remembered: true, targetMasked: '+91 ••••••5077', channel: 'WHATSAPP', lastRoute: '', passcode: true }],
  ] as const)('%s has no violations', async (_name, width, device) => {
    at(width);
    remembered = device as Remembered;
    const { container } = renderSignIn();
    await screen.findByRole('link', { name: /Student Kare home/ });
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/auth/remembered', undefined));
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('the passcode panel has no violations', async () => {
    remembered = { remembered: true, targetMasked: '+91 ••••••5077', channel: 'WHATSAPP', lastRoute: '', passcode: true };
    const { container } = renderSignIn();
    await openRememberedPasscode();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
