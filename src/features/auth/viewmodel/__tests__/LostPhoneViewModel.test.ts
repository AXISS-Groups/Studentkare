import { describe, expect, it, vi } from 'vitest';
import { translate } from '@/i18n';
import { LostPhoneViewModel } from '../LostPhoneViewModel';

type Requester = typeof import('@/data/services/http').apiRequest;

/** Asks, then says yes: the only way the panel revokes anything. */
async function confirmAndRevoke(vm: LostPhoneViewModel): Promise<void> {
  vm.askConfirm();
  await vm.revokeOthers();
}

describe('LostPhoneViewModel', () => {
  it('reports exactly what the server confirmed', async () => {
    const request = vi.fn(async () => ({ sessionsRevoked: 2, passCancelled: true })) as unknown as Requester;
    const vm = new LostPhoneViewModel(request);
    await confirmAndRevoke(vm);
    expect(vm.phase).toBe('done');
    expect(vm.summary.map((p) => translate('en', p.key, p.vars)).join(' ')).toBe('Signed out of 2 other devices. Your check-in pass was cancelled.');
  });

  it('pluralises one device', async () => {
    const vm = new LostPhoneViewModel((async () => ({ sessionsRevoked: 1, passCancelled: false })) as unknown as Requester);
    await confirmAndRevoke(vm);
    expect(vm.summary.map((p) => translate('en', p.key, p.vars)).join(' ')).toBe('Signed out of 1 other device.');
  });

  it('says so when there was nothing to sign out', async () => {
    const vm = new LostPhoneViewModel((async () => ({ sessionsRevoked: 0, passCancelled: false })) as unknown as Requester);
    await confirmAndRevoke(vm);
    expect(vm.summary.map((p) => translate('en', p.key, p.vars)).join(' ')).toBe('No other device was signed in.');
  });

  it('never claims success when the request fails', async () => {
    const vm = new LostPhoneViewModel((async () => { throw new Error('offline'); }) as unknown as Requester);
    await confirmAndRevoke(vm);
    expect(vm.phase).toBe('failed');
    expect(vm.result).toBeNull();
    expect(vm.summary).toEqual([]);
  });

  it('revokes nothing without the confirm step', async () => {
    const request = vi.fn(async () => ({ sessionsRevoked: 3, passCancelled: true })) as unknown as Requester;
    const vm = new LostPhoneViewModel(request);
    await vm.revokeOthers();
    expect(request).not.toHaveBeenCalled();
    expect(vm.phase).toBe('ready');
    vm.askConfirm();
    vm.cancelConfirm();
    await vm.revokeOthers();
    expect(request).not.toHaveBeenCalled();
  });
});
