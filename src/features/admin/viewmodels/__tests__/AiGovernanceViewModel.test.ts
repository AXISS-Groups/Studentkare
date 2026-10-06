import { describe, expect, it, vi } from 'vitest';
import type { AiGovernanceRepository } from '../../model/aiGovernanceRepository';
import type { AyushQuality } from '../../model/types';
import { AiGovernanceViewModel } from '../AiGovernanceViewModel';

const quality = (overrides: Partial<AyushQuality> = {}): AyushQuality => ({
  turns: 120, groundedRate: 0.82, answerRate: 0.64, refusalBreakdown: { ANSWERED: 77, CRISIS: 3, SOMETHING_NEW: 2 }, avgLatencyMs: 842.4, avgTopScore: 0.41, ...overrides,
});
const noTurns = quality({ turns: 0, groundedRate: 0, answerRate: 0, refusalBreakdown: {}, avgLatencyMs: 0, avgTopScore: 0 });

/** A repository whose answers the test releases one at a time. */
function deferredRepository() {
  const pending: { signal?: AbortSignal; resolve: (value: AyushQuality) => void; reject: (error: Error) => void }[] = [];
  const repository: AiGovernanceRepository = {
    ayushQuality: vi.fn((signal?: AbortSignal) => new Promise<AyushQuality>((resolve, reject) => { pending.push({ signal, resolve, reject }); })),
  };
  return { repository, pending };
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

describe('AiGovernanceViewModel', () => {
  it('loads Agent Ayush usage', async () => {
    const repository: AiGovernanceRepository = { ayushQuality: vi.fn().mockResolvedValue(quality()) };
    const vm = new AiGovernanceViewModel(repository);
    await vm.load();
    expect(repository.ayushQuality).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(vm.quality).toEqual(quality());
    expect(vm.error).toBe('');
    expect(vm.loading).toBe(false);
  });

  it('is loading before the first load and while a request is in flight', () => {
    const { repository } = deferredRepository();
    const vm = new AiGovernanceViewModel(repository);
    expect(vm.loading).toBe(true);
    void vm.load();
    expect(vm.loading).toBe(true);
    expect(vm.quality).toBeNull();
  });

  it('is empty when no turns are recorded, so 0% rates are never shown', async () => {
    const vm = new AiGovernanceViewModel({ ayushQuality: vi.fn().mockResolvedValue(noTurns) });
    await vm.load();
    expect(vm.isEmpty).toBe(true);
    expect(vm.outcomes).toEqual([]);
  });

  it('lists where the pipeline stops, in server order, with labels', async () => {
    const vm = new AiGovernanceViewModel({ ayushQuality: vi.fn().mockResolvedValue(quality()) });
    await vm.load();
    expect(vm.isEmpty).toBe(false);
    expect(vm.outcomes).toEqual([
      { outcome: 'ANSWERED', label: 'Answered', count: 77 },
      { outcome: 'CRISIS', label: 'Routed to crisis support', count: 3 },
      { outcome: 'SOMETHING_NEW', label: 'Something new', count: 2 },
    ]);
  });

  it('shows the request’s own error message, with no data', async () => {
    const vm = new AiGovernanceViewModel({ ayushQuality: vi.fn().mockRejectedValue(new Error('Network error')) });
    await vm.load();
    expect(vm.error).toBe('Network error');
    expect(vm.quality).toBeNull();
    expect(vm.loading).toBe(false);
  });

  it('reloads, clearing the error', async () => {
    const ayushQuality = vi.fn().mockRejectedValueOnce(new Error('Network error')).mockResolvedValue(quality());
    const vm = new AiGovernanceViewModel({ ayushQuality });
    await vm.load();
    vm.reload();
    expect(vm.error).toBe('');
    expect(vm.loading).toBe(true);
    await settle();
    expect(ayushQuality).toHaveBeenCalledTimes(2);
    expect(vm.quality).toEqual(quality());
  });

  it('ignores a stale response and cancels its request', async () => {
    const { repository, pending } = deferredRepository();
    const vm = new AiGovernanceViewModel(repository);
    void vm.load();
    vm.reload();
    expect(pending[0].signal?.aborted).toBe(true);
    pending[1].resolve(quality({ turns: 7 }));
    await settle();
    pending[0].resolve(quality({ turns: 1 }));
    await settle();
    expect(vm.quality?.turns).toBe(7);
    expect(vm.loading).toBe(false);
  });

  it('stops the request in flight on dispose, and can load again after', async () => {
    const { repository, pending } = deferredRepository();
    const vm = new AiGovernanceViewModel(repository);
    void vm.load();
    vm.dispose();
    expect(pending[0].signal?.aborted).toBe(true);
    pending[0].reject(new Error('aborted'));
    await settle();
    expect(vm.error).toBe('');
    void vm.load();
    pending[1].resolve(quality());
    await settle();
    expect(vm.quality).toEqual(quality());
  });
});
