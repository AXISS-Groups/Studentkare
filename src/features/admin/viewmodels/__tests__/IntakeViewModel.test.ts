import { describe, expect, it, vi } from 'vitest';
import type { IntakeRepository } from '../../model/intakeRepository';
import type { FieldDecision, IntakeQueue, ReviewItem } from '../../model/types';
import { IntakeViewModel } from '../IntakeViewModel';

const field = (id: string, intakeId: string, name: string, value: string, confidence: number): ReviewItem => ({ id, intakeId, field: name, value, confidence, documentId: `doc-${intakeId}-0000` });
const queue: IntakeQueue = { items: [field('f1', 'i1', 'report_date', '22/09/2026', 0.98), field('f2', 'i1', 'wbc_count', '11,900', 0.68), field('f3', 'i2', 'patient_name', 'sample', 0.64)] };
const settle = async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); };

function repository(overrides: Partial<IntakeRepository> = {}) {
  const repo = {
    reviewQueue: vi.fn<(signal?: AbortSignal) => Promise<IntakeQueue>>().mockResolvedValue(queue),
    decideField: vi.fn<(fieldId: string, decision: FieldDecision) => Promise<unknown>>().mockResolvedValue({}),
    ...overrides,
  };
  return repo;
}

describe('IntakeViewModel', () => {
  it('is loading before the first load, then groups the queue by document', async () => {
    const repo = repository();
    const vm = new IntakeViewModel(repo);
    expect(vm.loading).toBe(true);
    await vm.load();
    expect(repo.reviewQueue).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(vm.loading).toBe(false);
    expect(vm.items).toHaveLength(3);
    expect(vm.documents.map(document => [document.intakeId, document.documentId, document.fields.map(item => item.id), document.lowest])).toEqual([
      ['i1', 'doc-i1-0000', ['f1', 'f2'], 0.68],
      ['i2', 'doc-i2-0000', ['f3'], 0.64],
    ]);
  });

  it('selects the first document by default, and choosing another discards edits', async () => {
    const vm = new IntakeViewModel(repository());
    await vm.load();
    expect(vm.selected?.intakeId).toBe('i1');
    vm.edit('f2', '11,800');
    expect(vm.fieldValue(queue.items[1])).toBe('11,800');
    vm.selectDocument('i2');
    expect(vm.selected?.intakeId).toBe('i2');
    expect(vm.edits).toEqual({});
    expect(vm.fieldValue(queue.items[1])).toBe('11,900');
  });

  it('confirms each field of the selected document in order, with corrections, then resets and reloads', async () => {
    const repo = repository();
    const vm = new IntakeViewModel(repo);
    await vm.load();
    vm.edit('f2', '11,800');
    await vm.decide(true);
    expect(vi.mocked(repo.decideField).mock.calls).toEqual([
      ['f1', { approved: true, correctedValue: '22/09/2026' }],
      ['f2', { approved: true, correctedValue: '11,800' }],
    ]);
    expect(vm.edits).toEqual({});
    expect(vm.selectedId).toBeNull();
    expect(vm.deciding).toBe(false);
    expect(repo.reviewQueue).toHaveBeenCalledTimes(2);
  });

  it('rejects with an empty corrected value, ignoring edits', async () => {
    const repo = repository();
    const vm = new IntakeViewModel(repo);
    await vm.load();
    vm.selectDocument('i2');
    vm.edit('f3', 'changed');
    await vm.decide(false);
    expect(vi.mocked(repo.decideField).mock.calls).toEqual([['f3', { approved: false, correctedValue: '' }]]);
  });

  it('keeps edits and selection and shows the error when a decision fails, stopping at the failed field', async () => {
    const repo = repository({ decideField: vi.fn().mockRejectedValue(new Error('Review service unavailable')) });
    const vm = new IntakeViewModel(repo);
    await vm.load();
    vm.selectDocument('i1');
    vm.edit('f2', '11,800');
    await vm.decide(true);
    expect(repo.decideField).toHaveBeenCalledTimes(1);
    expect(vm.decisionError).toBe('Review service unavailable');
    expect(vm.edits).toEqual({ f2: '11,800' });
    expect(vm.selectedId).toBe('i1');
    expect(vm.deciding).toBe(false);
    expect(repo.reviewQueue).toHaveBeenCalledTimes(1);
  });

  it('falls back to a generic message when a decision fails without one, and clears it on the next attempt', async () => {
    const decideField = vi.fn().mockRejectedValueOnce('nope').mockResolvedValue({});
    const vm = new IntakeViewModel(repository({ decideField }));
    await vm.load();
    await vm.decide(false);
    expect(vm.decisionError).toBe('The request could not be completed.');
    const next = vm.decide(false);
    expect(vm.decisionError).toBe('');
    await next;
  });

  it('runs one decision at a time', async () => {
    let release!: () => void;
    const decideField = vi.fn(() => new Promise<unknown>(resolve => { release = () => resolve({}); }));
    const vm = new IntakeViewModel(repository({ decideField }));
    await vm.load();
    vm.selectDocument('i2');
    const first = vm.decide(true);
    expect(vm.deciding).toBe(true);
    await vm.decide(false);
    expect(decideField).toHaveBeenCalledTimes(1);
    release();
    await first;
    expect(vm.deciding).toBe(false);
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
    expect(vm.items.map(item => item.id)).toEqual(['f3']);
  });

  it('changes nothing after dispose: no late queue, no late decision outcome', async () => {
    // One gate for every field request: the decision carries on after dispose, as useMutation's did.
    let releaseDecision!: () => void;
    const gate = new Promise<void>(resolve => { releaseDecision = resolve; });
    const decideField = vi.fn(() => gate.then(() => ({})));
    const repo = repository({ decideField });
    const vm = new IntakeViewModel(repo);
    await vm.load();
    vm.edit('f1', 'edited');
    const decision = vm.decide(true);
    vm.dispose();
    releaseDecision();
    await decision;
    await settle();
    expect(decideField).toHaveBeenCalledTimes(2);
    expect(vm.edits).toEqual({ f1: 'edited' });
    expect(vm.deciding).toBe(true);
    expect(repo.reviewQueue).toHaveBeenCalledTimes(1);
    // A later load (as when React remounts) works again.
    await vm.load();
    expect(repo.reviewQueue).toHaveBeenCalledTimes(2);
    expect(vm.items).toHaveLength(3);
  });
});
