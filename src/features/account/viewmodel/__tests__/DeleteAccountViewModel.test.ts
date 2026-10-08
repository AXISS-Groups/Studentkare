import { describe, expect, it, vi } from 'vitest';
import { DeleteAccountViewModel } from '../DeleteAccountViewModel';
import type { DeletionStatus } from '../DeleteAccountViewModel';

type Requester = typeof import('@/data/http').apiRequest;
const none: DeletionStatus = { status: 'NONE', requestedAt: null, scheduledFor: null, archiveRetentionDays: 30 };
const pending: DeletionStatus = { status: 'PENDING', requestedAt: 1, scheduledFor: 1 + 7 * 86400, archiveRetentionDays: 30 };

describe('DeleteAccountViewModel', () => {
  it('needs the confirm word before it will ask the server', async () => {
    const request = vi.fn(async (_p: string, init?: RequestInit) => (init?.method === 'POST' ? pending : none)) as unknown as Requester;
    const vm = new DeleteAccountViewModel(request);
    await vm.load();
    vm.setConfirmText('delet');
    await vm.confirm();
    expect(vm.scheduled).toBe(false);
    vm.setConfirmText('delete');
    await vm.confirm();
    expect(vm.scheduled).toBe(true);
  });

  it('keeps showing the scheduled deletion when a cancel fails', async () => {
    const request = vi.fn(async (_p: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') throw new Error('offline');
      return pending;
    }) as unknown as Requester;
    const vm = new DeleteAccountViewModel(request);
    await vm.load();
    await vm.cancel();
    expect(vm.scheduled).toBe(true);
    expect(vm.error).toMatch(/still scheduled/);
  });

  it('shows an error, not a form, when status cannot be read', async () => {
    const vm = new DeleteAccountViewModel((async () => { throw new Error('x'); }) as unknown as Requester);
    await vm.load();
    expect(vm.loadFailed).toBe(true);
    expect(vm.state).toBeNull();
  });
});
