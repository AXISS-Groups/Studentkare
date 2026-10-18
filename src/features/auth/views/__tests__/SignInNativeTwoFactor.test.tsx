import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/data/services/http';

// Native sign-in for an account with two-step sign-in on: the OTP alone opens
// nothing, the authenticator code is asked for, and a wrong one starts over.
const apiRequest = vi.fn(async (path: string, _init?: RequestInit): Promise<unknown> => {
  if (path === '/auth/otp/send') return { targetMasked: 'r***@example.test' };
  if (path === '/auth/otp/verify') return { success: true, requires2FA: true, tempToken: 'pending-1', user: null };
  return {};
});
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));

import { AuthViewModel } from '../../viewmodel/AuthViewModel';
import { SignInNativeView } from '../SignInNativeView';

beforeEach(() => apiRequest.mockClear());

async function toTwoStep() {
  const go = vi.fn();
  const vm = new AuthViewModel('login', null, go);
  vm.channels = ['EMAIL', 'WHATSAPP'];
  vm.setChannel('EMAIL');
  vm.setIdentifier('root@example.test');
  const onSuccess = vi.fn();
  render(<SignInNativeView vm={vm} onSuccess={onSuccess} />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue to verification code' }));
  await waitFor(() => expect(vm.step).toBe(3));
  vm.setCode('123456');
  fireEvent.click(await screen.findByRole('button', { name: 'Verify and sign in' }));
  await screen.findByText('Two-factor check.');
  return { vm, onSuccess, go };
}

// Several renders and awaited requests: give it room when the whole suite runs at once.
describe('Native sign-in, two-step', { timeout: 20_000 }, () => {
  it('asks for the authenticator code after the OTP, and signs in only on the right one', async () => {
    const { vm, onSuccess, go } = await toTwoStep();
    expect(onSuccess).not.toHaveBeenCalled();
    const submit = screen.getByRole('button', { name: 'Verify and sign in' });
    expect(submit).toBeDisabled();

    apiRequest.mockImplementationOnce(async () => ({ user: { id: 'a1', fullName: 'Root', role: 'SUPER_ADMIN', twoFactorSetupRequired: false }, csrfToken: 'csrf' }));
    fireEvent.change(screen.getByLabelText('Authenticator code'), { target: { value: '65 43 21' } });
    expect(vm.twoFaCode).toBe('654321');
    fireEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(apiRequest).toHaveBeenLastCalledWith('/auth/2fa/challenge', expect.objectContaining({ body: JSON.stringify({ tempToken: 'pending-1', token: '654321' }) }));
    // Native routing follows the session, not a URL.
    expect(go).toHaveBeenCalledWith('admin');
  });

  it('a wrong code opens nothing and starts sign-in again, saying why', async () => {
    const { vm, onSuccess } = await toTwoStep();
    apiRequest.mockImplementationOnce(async () => { throw new ApiError('Invalid authenticator code', 400); });
    fireEvent.change(screen.getByLabelText('Authenticator code'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));
    expect(await screen.findByTestId('twofa-restart')).toHaveTextContent("That code didn't match");
    expect(onSuccess).not.toHaveBeenCalled();
    expect(vm.step).toBe(1);
    expect(vm.tempToken).toBe('');
    expect(screen.queryByText('Two-factor check.')).toBeNull();
  });
});
