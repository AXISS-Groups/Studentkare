import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/services/http';
import { TwoFactorViewModel } from '../TwoFactorViewModel';
import type { TwoFactorStatus } from '../TwoFactorViewModel';

type Requester = typeof import('@/data/services/http').apiRequest;
const OFF: TwoFactorStatus = { enabled: false, required: false, setupRequired: false };
const SETUP = { success: true, secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://totp/StudentKare:a?secret=JBSWY3DPEHPK3PXP', qrMatrix: ['101', '010', '101'] };

/** A fake server: each path answers from the map, or throws what the map holds. */
function server(routes: Record<string, unknown>) {
  return vi.fn(async (path: string) => {
    const answer = routes[path];
    if (answer instanceof Error) throw answer;
    return typeof answer === 'function' ? (answer as () => unknown)() : answer;
  }) as unknown as Requester & ReturnType<typeof vi.fn>;
}

describe('TwoFactorViewModel', () => {
  it('sets up, refuses a wrong code, then turns on with the right one', async () => {
    let enableCalls = 0;
    const request = server({
      '/auth/2fa/status': { enabled: false, required: true, setupRequired: true },
      '/auth/2fa/setup': SETUP,
      '/auth/2fa/enable': () => {
        enableCalls += 1;
        if (enableCalls === 1) throw new ApiError('Invalid authenticator code', 400);
        return { success: true };
      },
    });
    const onEnabled = vi.fn();
    const vm = new TwoFactorViewModel(request, onEnabled);
    await vm.load();
    expect(vm.status?.setupRequired).toBe(true);

    await vm.startSetup();
    expect(vm.enrolment?.secret).toBe(SETUP.secret);
    expect(vm.enrolment?.qrMatrix).toEqual(SETUP.qrMatrix);

    vm.setCode('12a34');
    expect(vm.code).toBe('1234');
    expect(vm.canEnable).toBe(false);
    vm.setCode('000000');
    await vm.enable();
    expect(vm.error).toBe('sec.twofa.wrongCode');
    expect(vm.code).toBe('');
    expect(vm.enrolment).not.toBeNull();
    expect(onEnabled).not.toHaveBeenCalled();

    vm.setCode('123456');
    await vm.enable();
    expect(request).toHaveBeenLastCalledWith('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ token: '123456' }) });
    expect(vm.enrolment).toBeNull();
    expect(vm.status).toEqual({ enabled: true, required: true, setupRequired: false });
    expect(vm.done).toBe('sec.twofa.enabled');
    expect(onEnabled).toHaveBeenCalledTimes(1);
  });

  it('drops the secret when the screen is left', async () => {
    const vm = new TwoFactorViewModel(server({ '/auth/2fa/status': OFF, '/auth/2fa/setup': SETUP }));
    await vm.load();
    await vm.startSetup();
    vm.setCode('123');
    vm.dispose();
    expect(vm.enrolment).toBeNull();
    expect(vm.code).toBe('');
  });

  it('never writes the secret to browser storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const vm = new TwoFactorViewModel(server({ '/auth/2fa/status': OFF, '/auth/2fa/setup': SETUP }));
    await vm.load();
    await vm.startSetup();
    expect(setItem.mock.calls.some((args) => args.join(' ').includes(SETUP.secret))).toBe(false);
    setItem.mockRestore();
  });

  it('says plainly when the server cannot set 2FA up', async () => {
    const vm = new TwoFactorViewModel(server({ '/auth/2fa/status': OFF, '/auth/2fa/setup': new ApiError('Set TWO_FACTOR_ENCRYPTION_KEY', 503) }));
    await vm.load();
    await vm.startSetup();
    expect(vm.enrolment).toBeNull();
    expect(vm.error).toBe('sec.twofa.unavailable');
  });

  it('turning off needs a code and reports a wrong one or a role that must keep it', async () => {
    let answer: unknown = new ApiError('Invalid authenticator code', 400);
    const request = server({
      '/auth/2fa/status': { enabled: true, required: false, setupRequired: false },
      '/auth/2fa/disable': () => { if (answer instanceof Error) throw answer; return answer; },
    });
    const vm = new TwoFactorViewModel(request);
    await vm.load();
    vm.askToDisable();
    expect(vm.confirmingOff).toBe(true);
    await vm.disable();
    expect(request).not.toHaveBeenCalledWith('/auth/2fa/disable', expect.anything());

    vm.setOffCode('000000');
    await vm.disable();
    expect(vm.error).toBe('sec.twofa.wrongCode');
    expect(vm.status?.enabled).toBe(true);
    expect(vm.confirmingOff).toBe(true);

    answer = new ApiError('Your role needs two-step sign-in', 403);
    vm.setOffCode('111111');
    await vm.disable();
    expect(vm.error).toBe('sec.twofa.requiredOn');

    answer = { success: true };
    vm.setOffCode('222222');
    await vm.disable();
    expect(vm.status?.enabled).toBe(false);
    expect(vm.confirmingOff).toBe(false);
    expect(vm.done).toBe('sec.twofa.disabled');
  });

  it('shows an error, not a form, when status cannot be read', async () => {
    const vm = new TwoFactorViewModel(server({ '/auth/2fa/status': new Error('offline') }));
    await vm.load();
    expect(vm.phase).toBe('failed');
    expect(vm.status).toBeNull();
  });
});
