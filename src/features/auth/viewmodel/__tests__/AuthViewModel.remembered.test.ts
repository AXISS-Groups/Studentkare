import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionResponse } from '@/data/workflowTypes';

const api = vi.hoisted(() => ({ apiRequest: vi.fn() }));
const routing = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('@/data/http', async (importActual) => ({ ...(await importActual<typeof import('@/data/http')>()), apiRequest: api.apiRequest }));
vi.mock('@/lib/workflowRouting', async (importActual) => ({ ...(await importActual<typeof import('@/lib/workflowRouting')>()), navigate: routing.navigate }));

import { ApiError } from '@/data/http';
import { AuthViewModel } from '../AuthViewModel';

const HINT = { remembered: true, targetMasked: 'm•••@example.test', channel: 'EMAIL', lastRoute: 'records' };
const signedIn = (role: string): SessionResponse =>
  ({ user: { id: 'a1', fullName: 'Test Member', role }, csrfToken: 'csrf' }) as unknown as SessionResponse;

describe('AuthViewModel — remembered device', () => {
  beforeEach(() => { api.apiRequest.mockReset(); routing.navigate.mockReset(); });

  it('offers nothing when the device is not remembered or the lookup fails', async () => {
    const vm = new AuthViewModel('login', null);
    api.apiRequest.mockResolvedValueOnce({ remembered: false });
    await vm.loadRemembered();
    expect(vm.remembered).toBeNull();
    api.apiRequest.mockRejectedValueOnce(new Error('offline'));
    await vm.loadRemembered();
    expect(vm.remembered).toBeNull();
  });

  it('never looks up a remembered device while creating an account', async () => {
    await new AuthViewModel('signup', null).loadRemembered();
    expect(api.apiRequest).not.toHaveBeenCalled();
  });

  it('continuing sends a code and still asks for it — no session yet', async () => {
    const vm = new AuthViewModel('login', null);
    api.apiRequest.mockResolvedValueOnce(HINT);
    await vm.loadRemembered();
    api.apiRequest.mockResolvedValueOnce({ targetMasked: 'm•••@example.test' });
    await vm.continueRemembered();
    expect(api.apiRequest).toHaveBeenLastCalledWith('/auth/remembered/send', { method: 'POST' });
    expect(vm.step).toBe(3);
    expect(vm.masked).toBe('m•••@example.test');
    expect(routing.navigate).not.toHaveBeenCalled();
  });

  it('returns to the remembered page after the code is verified', async () => {
    const vm = new AuthViewModel('login', null);
    api.apiRequest.mockResolvedValueOnce(HINT);
    await vm.loadRemembered();
    api.apiRequest.mockResolvedValueOnce({ targetMasked: 'm•••@example.test' });
    await vm.continueRemembered();
    vm.setCode('123456');
    api.apiRequest.mockResolvedValueOnce(signedIn('STUDENT'));
    await vm.verify(() => undefined);
    expect(routing.navigate).toHaveBeenCalledWith('records');
  });

  it('ignores a remembered page the signed-in role may not open', async () => {
    const vm = new AuthViewModel('login', null);
    api.apiRequest.mockResolvedValueOnce({ ...HINT, lastRoute: 'admin/accounts' });
    await vm.loadRemembered();
    api.apiRequest.mockResolvedValueOnce({ targetMasked: 'm•••@example.test' });
    await vm.continueRemembered();
    vm.setCode('123456');
    api.apiRequest.mockResolvedValueOnce(signedIn('STUDENT'));
    await vm.verify(() => undefined);
    expect(routing.navigate).toHaveBeenCalledWith('health');
  });

  it('drops the hint when the server no longer remembers the device', async () => {
    const vm = new AuthViewModel('login', null);
    api.apiRequest.mockResolvedValueOnce(HINT);
    await vm.loadRemembered();
    api.apiRequest.mockRejectedValueOnce(new ApiError('This device no longer remembers an account.', 404));
    await vm.continueRemembered();
    expect(vm.remembered).toBeNull();
    expect(vm.step).toBe(1);
    expect(vm.error).toBe('This device no longer remembers an account.');
  });

  it('"Not you?" hides the hint without forgetting; "Forget" tells the server', async () => {
    const vm = new AuthViewModel('login', null);
    api.apiRequest.mockResolvedValueOnce(HINT);
    await vm.loadRemembered();
    vm.useAnotherAccount();
    expect(vm.remembered).toBeNull();
    expect(api.apiRequest).toHaveBeenCalledTimes(1);

    api.apiRequest.mockResolvedValueOnce(HINT);
    await vm.loadRemembered();
    api.apiRequest.mockResolvedValueOnce({ success: true });
    await vm.forgetDevice();
    expect(api.apiRequest).toHaveBeenLastCalledWith('/auth/remembered/forget', { method: 'POST' });
    expect(vm.remembered).toBeNull();
  });
});
