import { describe, expect, it, vi } from 'vitest';
import { LostPhoneViewModel } from '../LostPhoneViewModel';

type Requester = typeof import('@/data/http').apiRequest;

describe('LostPhoneViewModel', () => {
  it('reports exactly what the server confirmed', async () => {
    const request = vi.fn(async () => ({ sessionsRevoked: 2, passCancelled: true })) as unknown as Requester;
    const vm = new LostPhoneViewModel(request);
    await vm.revokeOthers();
    expect(vm.phase).toBe('done');
    expect(vm.summary).toBe('Signed out of 2 other devices. Your check-in pass was cancelled.');
  });

  it('says so when there was nothing to sign out', async () => {
    const vm = new LostPhoneViewModel((async () => ({ sessionsRevoked: 0, passCancelled: false })) as unknown as Requester);
    await vm.revokeOthers();
    expect(vm.summary).toBe('No other device was signed in.');
  });

  it('never claims success when the request fails', async () => {
    const vm = new LostPhoneViewModel((async () => { throw new Error('offline'); }) as unknown as Requester);
    await vm.revokeOthers();
    expect(vm.phase).toBe('failed');
    expect(vm.result).toBeNull();
    expect(vm.summary).toBe('');
  });
});
