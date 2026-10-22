import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// Expo sign-in: the device remembers the last sign-in (email or phone, masked),
// "Use my passcode" sits beside the code, and the logo goes to the public home.
let remembered: Record<string, unknown> = { remembered: false };
const apiRequest = vi.fn(async (path: string, _init?: RequestInit): Promise<unknown> => {
  if (path === '/auth/options') return { channels: ['EMAIL', 'WHATSAPP'] };
  if (path === '/auth/remembered') return remembered;
  if (path === '/auth/passcode/sign-in') return { success: true, user: { id: 'u1', role: 'STUDENT' }, csrfToken: 'c' };
  return {};
});
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));

import { AuthViewModel } from '../../viewmodel/AuthViewModel';
import { SignInNativeView } from '../SignInNativeView';

beforeEach(() => {
  apiRequest.mockClear();
  remembered = { remembered: false };
});

const view = () => {
  const vm = new AuthViewModel('login', null, () => undefined);
  const onSuccess = vi.fn();
  const onHome = vi.fn();
  render(<SignInNativeView vm={vm} onSuccess={onSuccess} onHome={onHome} />);
  return { vm, onSuccess, onHome };
};

describe('Expo: remembered sign-in and passcode', () => {
  it('offers a remembered email, masked', async () => {
    remembered = { remembered: true, targetMasked: 'a•••@vnrvjiet.in', channel: 'EMAIL', lastRoute: '', passcode: false };
    view();
    expect(await screen.findByRole('button', { name: 'Continue as a•••@vnrvjiet.in' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Use my passcode' })).toBeNull();
  });

  it('a remembered phone with a passcode signs in with it, sending no identifier', async () => {
    remembered = { remembered: true, targetMasked: '+91 ••••••5077', channel: 'WHATSAPP', lastRoute: '', passcode: true };
    const { onSuccess } = view();
    await screen.findByRole('button', { name: 'Continue as +91 ••••••5077' });
    fireEvent.click(screen.getByRole('button', { name: 'Use my passcode' }));
    fireEvent.change(screen.getByLabelText('Passcode'), { target: { value: 'k7#Qm2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const call = apiRequest.mock.calls.find(([path]) => path === '/auth/passcode/sign-in');
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ passcode: 'k7#Qm2' });
  });

  it('the logo goes to the public home (the landing screen without a site URL)', async () => {
    const { onHome } = view();
    fireEvent.click(await screen.findByRole('link', { name: 'Student Kare home' }));
    expect(onHome).toHaveBeenCalled();
  });
});
