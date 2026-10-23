import { describe, expect, it, vi } from 'vitest';
import { intakeRepository, type IntakeRepository } from '../../model/intakeRepository';
import type { IntakeQueue, IntakeQueueItem } from '../../model/types';
import { IntakeViewModel } from '../IntakeViewModel';

const intake = (id: string, kind: string, status: string): IntakeQueueItem => ({ id, kind, status, createdAt: 1_760_000_000, processedAt: null });
const queue: IntakeQueue = { items: [intake('int_1', 'LAB', 'DRAFT'), intake('int_2', 'PRESCRIPTION', 'FAILED'), intake('int_3', 'OTHER', 'QUEUED')] };
const settle = async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); };

function repository(overrides: Partial<IntakeRepository> = {}) {
  return {
    reviewQueue: vi.fn<(signal?: AbortSignal) => Promise<IntakeQueue>>().mockResolvedValue(queue),
    ...overrides,
  };
}

describe('IntakeViewModel', () => {
  it('is loading before the first load, then holds the queue as the server sent it', async () => {
    const repo = repository();
    const vm = new IntakeViewModel(repo);
    expect(vm.loading).toBe(true);
    await vm.load();
    expect(repo.reviewQueue).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(vm.loading).toBe(false);
    expect(vm.items.map(item => [item.id, item.kind, item.status])).toEqual([
      ['int_1', 'LAB', 'DRAFT'], ['int_2', 'PRESCRIPTION', 'FAILED'], ['int_3', 'OTHER', 'QUEUED'],
    ]);
  });

  it('has no way to read or decide on a document’s extracted fields', () => {
    const vm = new IntakeViewModel(repository());
    expect('decide' in vm).toBe(false);
    expect('fieldValue' in vm).toBe(false);
    expect(Object.keys(intakeRepository)).toEqual(['reviewQueue']);
  });

  it('shows the queue request’s own error and reloads on request', async () => {
    const reviewQueue = vi.fn<(signal?: AbortSignal) => Promise<IntakeQueue>>().mockRejectedValueOnce(new Error('Network error')).mockResolvedValue(queue);
    const vm = new IntakeViewModel(repository({ reviewQueue }));
    await vm.load();
    expect(vm.error).toBe('Network error');
    expect(vm.queue).toBeNull();
    vm.reload();
    expect(vm.loading).toBe(true);
    expect(vm.error).toBe('');
    await settle();
    expect(vm.items).toHaveLength(3);
  });

  it('ignores a stale queue response and cancels its request', async () => {
    const pending: { signal?: AbortSignal; resolve: (value: IntakeQueue) => void }[] = [];
    const reviewQueue = vi.fn((signal?: AbortSignal) => new Promise<IntakeQueue>(resolve => { pending.push({ signal, resolve }); }));
    const vm = new IntakeViewModel(repository({ reviewQueue }));
    void vm.load();
    vm.reload();
    expect(pending[0].signal?.aborted).toBe(true);
    pending[1].resolve({ items: [queue.items[2]] });
    await settle();
    pending[0].resolve(queue);
    await settle();
    expect(vm.items.map(item => item.id)).toEqual(['int_3']);
  });

  it('changes nothing after dispose, and a later load works again', async () => {
    let release!: (value: IntakeQueue) => void;
    const reviewQueue = vi.fn<(signal?: AbortSignal) => Promise<IntakeQueue>>()
      .mockImplementationOnce(() => new Promise<IntakeQueue>(resolve => { release = resolve; }))
      .mockResolvedValue(queue);
    const vm = new IntakeViewModel(repository({ reviewQueue }));
    const first = vm.load();
    vm.dispose();
    release(queue);
    await first;
    expect(vm.queue).toBeNull();
    await vm.load();
    expect(reviewQueue).toHaveBeenCalledTimes(2);
    expect(vm.items).toHaveLength(3);
  });
});
