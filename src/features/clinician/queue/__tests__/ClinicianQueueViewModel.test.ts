import { describe, expect, it, vi } from 'vitest';
import { ClinicianQueueViewModel } from '../ClinicianQueueViewModel';
import { bookingsQueueSource } from '../queueSource';
import type { ClinicianQueueSource } from '../queueSource';
import type { QueueData, QueueEntry } from '../queueModel';
import { actionFor, confirmedCount, waitingCount, waitingMinutes } from '../queueModel';
import { bookingsFor, consentQueue } from './queueFixture';

const NOW = new Date(2026, 8, 24, 10, 0);

function sourceOf(data: QueueData | null, extra: Partial<ClinicianQueueSource> = {}): ClinicianQueueSource {
  return { load: () => Promise.resolve(data), ...extra };
}

describe('bookingsQueueSource', () => {
  it('keeps today’s live requests and confirmed bookings, and reports nothing it cannot know', async () => {
    const data = await bookingsQueueSource(async () => bookingsFor(NOW), () => NOW).load();
    expect(data?.entries.map((entry) => entry.id)).toEqual(['b2', 'b3']);
    expect(data?.entries.every((entry) => entry.consent === 'unreported' && entry.access === null)).toBe(true);
    expect(data).toMatchObject({ activeRelationships: null, accepting: null, crisisFlagged24h: null });
  });

  it('offers no request-access action: nothing on the server sends one', () => {
    expect(bookingsQueueSource(async () => []).requestAccess).toBeUndefined();
  });
});

describe('ClinicianQueueViewModel', () => {
  it('loads the queue and selects the first student', async () => {
    const vm = new ClinicianQueueViewModel(sourceOf(consentQueue(NOW)), () => NOW);
    await vm.load();
    expect(vm.status).toBe('ready');
    expect(vm.selected?.patientName).toBe('Priya Nair');
  });

  it('is unconnected when there is nothing real behind it', async () => {
    const vm = new ClinicianQueueViewModel(sourceOf(null), () => NOW);
    await vm.load();
    expect(vm.status).toBe('unconnected');
    expect(vm.selected).toBeNull();
  });

  it('is empty when connected and nobody is queued', async () => {
    const vm = new ClinicianQueueViewModel(sourceOf({ ...consentQueue(NOW), entries: [] }), () => NOW);
    await vm.load();
    expect(vm.status).toBe('empty');
  });

  it('errors when the load fails', async () => {
    const vm = new ClinicianQueueViewModel({ load: () => Promise.reject(new Error('down')) }, () => NOW);
    await vm.load();
    expect(vm.status).toBe('error');
  });

  it('keeps the selection across a reload while that student is still queued', async () => {
    const vm = new ClinicianQueueViewModel(sourceOf(consentQueue(NOW)), () => NOW);
    await vm.load();
    vm.select('q3');
    await vm.load();
    expect(vm.selected?.patientName).toBe('Sneha Kumar');
    vm.select('not-here');
    expect(vm.selectedId).toBe('q3');
  });

  it('marks a request sent only after the source accepts it', async () => {
    const requestAccess = vi.fn(() => Promise.resolve());
    const vm = new ClinicianQueueViewModel(sourceOf(consentQueue(NOW), { requestAccess }), () => NOW);
    await vm.load();
    await vm.requestAccess('q4');
    expect(requestAccess).toHaveBeenCalledWith('q4');
    expect(vm.data?.entries.find((e) => e.id === 'q4')?.requested).toBe(true);
    expect(vm.toast).toEqual({ key: 'clinQueue.toast.renewSent', vars: { name: 'Rahul' } });
    // Consent itself does not change: the student decides.
    expect(vm.data?.entries.find((e) => e.id === 'q4')?.consent).toBe('expired');
  });

  it('does not send twice, and never for an active or unreported consent', async () => {
    const requestAccess = vi.fn(() => Promise.resolve());
    const data = consentQueue(NOW);
    data.entries.push({ id: 'q5', patientName: 'New Person', booking: 'CONFIRMED', consent: 'unreported', access: null });
    const vm = new ClinicianQueueViewModel(sourceOf(data, { requestAccess }), () => NOW);
    await vm.load();
    await vm.requestAccess('q1');
    await vm.requestAccess('q5');
    await vm.requestAccess('q3');
    await vm.requestAccess('q3');
    expect(requestAccess).toHaveBeenCalledTimes(1);
  });

  it('leaves the entry unrequested when sending fails', async () => {
    const vm = new ClinicianQueueViewModel(sourceOf(consentQueue(NOW), { requestAccess: () => Promise.reject(new Error('no')) }), () => NOW);
    await vm.load();
    await vm.requestAccess('q3');
    expect(vm.data?.entries.find((e) => e.id === 'q3')?.requested).toBeFalsy();
    expect(vm.toast).toEqual({ key: 'clinQueue.toast.failed' });
    expect(vm.requestingId).toBeNull();
  });
});

describe('queue helpers', () => {
  const base: QueueEntry = { id: 'x', patientName: 'A B', booking: 'CONFIRMED', consent: 'active', access: [] };

  it('picks the next step from consent, and from the booking when sharing is unreported', () => {
    expect(actionFor(base)).toBe('open-consult');
    expect(actionFor({ ...base, consent: 'awaiting' })).toBe('request-access');
    expect(actionFor({ ...base, consent: 'expired' })).toBe('ask-renew');
    expect(actionFor({ ...base, consent: 'unreported' })).toBe('open-consult');
    expect(actionFor({ ...base, consent: 'unreported', booking: 'REQUESTED' })).toBe('none');
  });

  it('counts waiting minutes only while the student is in the room', () => {
    expect(waitingMinutes({ ...base, waitingSince: new Date(NOW.getTime() - 4 * 60000) }, NOW)).toBe(4);
    expect(waitingMinutes(base, NOW)).toBeNull();
  });

  it('counts waiting and confirmed entries', () => {
    const data = consentQueue(NOW);
    expect(waitingCount(data)).toBe(2);
    expect(confirmedCount(data)).toBe(4);
  });
});
