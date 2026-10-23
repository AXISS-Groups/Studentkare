import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionResponse } from '@/data/types/workflowTypes';

const api = vi.hoisted(() => ({ apiRequest: vi.fn() }));
const routing = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('@/data/services/http', async (importActual) => ({ ...(await importActual<typeof import('@/data/services/http')>()), apiRequest: api.apiRequest }));
vi.mock('@/lib/utils/workflowRouting', async (importActual) => ({ ...(await importActual<typeof import('@/lib/utils/workflowRouting')>()), navigate: routing.navigate }));

import { ApiError } from '@/data/services/http';
import { translate } from '@/i18n';
import { AuthViewModel } from '../AuthViewModel';

const session = (role: string, twoFactorSetupRequired = false): SessionResponse =>
  ({ user: { id: 'a1', fullName: 'Test Admin', role, twoFactorSetupRequired }, csrfToken: 'csrf' }) as unknown as SessionResponse;

/** A login that has passed the OTP and is waiting on the authenticator code. */
async function atTwoStep(): Promise<AuthViewModel> {
  const vm = new AuthViewModel('login', null);
  vm.setChannel('EMAIL');
  vm.setIdentifier('admin@example.test');
  vm.setCode('123456');
  api.apiRequest.mockResolvedValueOnce({ success: true, requires2FA: true, tempToken: 'pending-1', user: null });
  await vm.verify(() => undefined);
  expect(vm.step).toBe(7);
  return vm;
}

describe('AuthViewModel — two-step sign-in', () => {
  beforeEach(() => { api.apiRequest.mockReset(); routing.navigate.mockReset(); });

  it('a wrong authenticator code closes the attempt and starts sign-in again, keeping the contact', async () => {
    const vm = await atTwoStep();
    vm.setTwoFaCode('000000');
    api.apiRequest.mockRejectedValueOnce(new ApiError('Invalid authenticator code', 400));
    const accept = vi.fn();
    await vm.verify2FA(accept);

    expect(accept).not.toHaveBeenCalled();
    expect(routing.navigate).not.toHaveBeenCalled();
    // Not left on step 7 with a spent token: a retry there could only say "expired".
    expect(vm.step).toBe(1);
    expect(vm.tempToken).toBe('');
    expect(vm.twoFaCode).toBe('');
    expect(vm.code).toBe('');
    expect(vm.identifier).toBe('admin@example.test');
    expect(vm.twoFaRestart).toBe('auth.twofa.restart');
    expect(translate('en', 'auth.twofa.restart')).toMatch(/Sign in again/);

    // Moving on clears the explanation.
    vm.advance(2);
    expect(vm.twoFaRestart).toBe('');
  });

  it('any other failure also closes the attempt, with its own explanation and no session', async () => {
    const vm = await atTwoStep();
    vm.setTwoFaCode('123456');
    api.apiRequest.mockRejectedValueOnce(new ApiError('Cannot connect', 0));
    const accept = vi.fn();
    await vm.verify2FA(accept);
    expect(accept).not.toHaveBeenCalled();
    expect(vm.step).toBe(1);
    expect(vm.tempToken).toBe('');
    expect(vm.twoFaRestart).toBe('auth.twofa.restartOther');
  });

  it('the right code signs in and goes to the role home', async () => {
    const vm = await atTwoStep();
    vm.setTwoFaCode('123456');
    api.apiRequest.mockResolvedValueOnce(session('SUPER_ADMIN'));
    const accept = vi.fn();
    await vm.verify2FA(accept);
    expect(api.apiRequest).toHaveBeenLastCalledWith('/auth/2fa/challenge', expect.objectContaining({
      body: JSON.stringify({ tempToken: 'pending-1', token: '123456' }),
    }));
    expect(accept).toHaveBeenCalledTimes(1);
    expect(routing.navigate).toHaveBeenCalledWith('admin');
  });

  it('a session held to 2FA set-up lands on Sign-in & security, not the console', async () => {
    const vm = new AuthViewModel('login', 'admin/integrations');
    vm.setCode('123456');
    api.apiRequest.mockResolvedValueOnce({ ...session('SUPER_ADMIN', true), requiresSignup: false });
    await vm.verify(() => undefined);
    expect(routing.navigate).toHaveBeenCalledWith('security');
    expect(routing.navigate).toHaveBeenCalledTimes(1);
  });

  it('native: routes through what the app passes in, never the web URL router', async () => {
    const go = vi.fn();
    const vm = new AuthViewModel('login', null, go);
    vm.setCode('123456');
    api.apiRequest.mockResolvedValueOnce({ success: true, requires2FA: true, tempToken: 'pending-2', user: null });
    await vm.verify(() => undefined);
    expect(vm.step).toBe(7);
    vm.setTwoFaCode('123456');
    api.apiRequest.mockResolvedValueOnce(session('SUPER_ADMIN', true));
    const accept = vi.fn();
    await vm.verify2FA(accept);
    expect(accept).toHaveBeenCalledTimes(1);
    expect(go).toHaveBeenCalledWith('security');
    expect(routing.navigate).not.toHaveBeenCalled();
  });
});
