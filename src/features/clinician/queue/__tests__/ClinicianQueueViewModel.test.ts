import { describe, expect, it, vi } from 'vitest';
import { ClinicianQueueViewModel } from '../ClinicianQueueViewModel';
import { sampleQueueSource, unconnectedQueueSource } from '../queueSource';
import type { ClinicianQueueSource } from '../queueSource';
import type { QueueData, QueueEntry } from '../queueModel';
import { actionFor, queueSummary, timeLabel } from '../queueModel';

const NOW = new Date('2026-09-24T10:00:00');

async function sample(): Promise<QueueData> {
  const data = await sampleQueueSource.load();
  if (!data) throw new Error('sample must load');
  return data;
}

function sourceOf(data: QueueData | null, extra: Partial<ClinicianQueueSource> = {}): ClinicianQueueSource {
  return { load: () => Promise.resolve(data), ...extra };
}

describe('ClinicianQueueViewModel', () => {
  it('loads the queue and selects the first student', async () => {
    const vm = new ClinicianQueueViewModel(sourceOf(await sample()), () => NOW);
    await vm.load();
    expect(vm.status).toBe('ready');
    expect(vm.selected?.patientName).toBe('Priya N.');
    expect(vm.summary).toBe('6 students with an active care relationship · 2 waiting now');
  });

  it('is unconnected when there is nothing real behind it', async () => {
    const vm = new ClinicianQueueViewModel(unconnectedQueueSource, () => NOW);
    await vm.load();
    expect(vm.status).toBe('unconnected');
    expect(vm.selected).toBeNull();
  });

  it('is empty when connected and nobody is queued', async () => {
    const vm = new ClinicianQueueViewModel(sourceOf({ ...(await sample()), entries: [] }), () => NOW);
    await vm.load();
    expect(vm.status).toBe('empty');
  });

  it('errors when the load fails', async () => {
    const vm = new ClinicianQueueViewModel({ load: () => Promise.reject(new Error('down')) }, () => NOW);
    await vm.load();
    expect(vm.status).toBe('error');
  });

  it('keeps the selection across a reload while that student is still queued', async () => {
    const vm = new ClinicianQueueViewModel(sourceOf(await sample()), () => NOW);
    await vm.load();
    vm.select('q3');
    await vm.load();
    expect(vm.selected?.patientName).toBe('Sneha K.');
    vm.select('not-here');
    expect(vm.selectedId).toBe('q3');
  });

  it('marks a request sent only after the source accepts it', async () => {
    const requestAccess = vi.fn(() => Promise.resolve());
    const vm = new ClinicianQueueViewModel(sourceOf(await sample(), { requestAccess }), () => NOW);
    await vm.load();
    await vm.requestAccess('q4');
    expect(requestAccess).toHaveBeenCalledWith('q4');
    expect(vm.data?.entries.find((e) => e.id === 'q4')?.requested).toBe(true);
    expect(vm.toast).toBe('Renewal request sent. Rahul decides — nothing opens until they do.');
    // Consent itself does not change: the student decides.
    expect(vm.data?.entries.find((e) => e.id === 'q4')?.consent).toBe('expired');
  });

  it('does not send twice, and never for an active consent', async () => {
    const requestAccess = vi.fn(() => Promise.resolve());
    const vm = new ClinicianQueueViewModel(sourceOf(await sample(), { requestAccess }), () => NOW);
    await vm.load();
    await vm.requestAccess('q1');
    await vm.requestAccess('q3');
    await vm.requestAccess('q3');
    expect(requestAccess).toHaveBeenCalledTimes(1);
  });

  it('leaves the entry unrequested when sending fails', async () => {
    const vm = new ClinicianQueueViewModel(sourceOf(await sample(), { requestAccess: () => Promise.reject(new Error('no')) }), () => NOW);
    await vm.load();
    await vm.requestAccess('q3');
    expect(vm.data?.entries.find((e) => e.id === 'q3')?.requested).toBeFalsy();
    expect(vm.toast).toMatch(/Nothing was sent/);
    expect(vm.requestingId).toBeNull();
  });
});

describe('queue helpers', () => {
  const base: QueueEntry = { id: 'x', patientName: 'A B', reason: '', consent: 'active', scope: '', access: [] };

  it('picks the next step from consent', () => {
    expect(actionFor(base)).toBe('open-consult');
    expect(actionFor({ ...base, consent: 'awaiting' })).toBe('request-access');
    expect(actionFor({ ...base, consent: 'expired' })).toBe('ask-renew');
  });

  it('shows waiting time, or the booked time', () => {
    expect(timeLabel({ ...base, waitingSince: new Date(NOW.getTime() - 4 * 60000) }, NOW)).toBe('Waiting 4m');
    expect(timeLabel({ ...base, waitingSince: new Date(NOW.getTime() - 65 * 60000) }, NOW)).toBe('Waiting 1h 5m');
    expect(timeLabel({ ...base, scheduledAt: '2:30 PM' }, NOW)).toBe('2:30 PM');
  });

  it('summarises with correct plurals', () => {
    expect(queueSummary({ entries: [], activeRelationships: 1, accepting: true, crisisFlagged24h: 0 })).toBe('1 student with an active care relationship · 0 waiting now');
  });
});
