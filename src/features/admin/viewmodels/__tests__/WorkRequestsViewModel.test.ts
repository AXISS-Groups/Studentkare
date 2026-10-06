import { describe, expect, it, vi } from 'vitest';
import type { FollowUpTask, StaffAppointment, WorkRequest } from '@/data/workflowTypes';
import type { WorkRepository } from '../../model/workRepository';
import type { AppointmentList, WorkRequestPage, WorkRequestQuery } from '../../model/types';
import { WorkRequestsViewModel } from '../WorkRequestsViewModel';

const request = (id: string, overrides: Partial<WorkRequest> = {}): WorkRequest => ({
  id, itemId: 'i', name: id, kind: 'product', quantity: 1, pricePaise: 100, status: 'REQUESTED', orderId: 'o', customer: 'c', contact: 'x',
  delivery: { mode: 'delivery', address: '', city: '', pincode: '' }, requestedSlot: '', createdAt: 0, ...overrides,
});
const appointment = (id: string, status = 'REQUESTED'): StaffAppointment => ({ id, catalogItemId: 'c', providerId: 'p', slotStart: '', slotEnd: '', status, createdAt: 0, updatedAt: 0, customer: 'c', contact: 'x' });
const followUp = (id: string, status = 'OPEN'): FollowUpTask => ({ id, orderId: 'o', note: id, status, createdAt: 0, resolvedAt: null });
const settle = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); };

function work(overrides: Partial<WorkRepository> = {}): WorkRepository {
  return {
    listRequests: vi.fn().mockResolvedValue({ items: [request('a')], total: 40 }),
    updateRequest: vi.fn().mockResolvedValue({}),
    listAppointments: vi.fn().mockResolvedValue({ items: [appointment('appt')] }),
    updateAppointment: vi.fn().mockResolvedValue({}),
    listFollowUps: vi.fn().mockResolvedValue({ items: [followUp('task')] }),
    resolveFollowUp: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}
const loaded = async (repo = work()) => {
  const vm = new WorkRequestsViewModel(repo);
  vm.load();
  await settle();
  return vm;
};
const queries = (repo: WorkRepository) => vi.mocked(repo.listRequests).mock.calls.map(([query]) => query);

describe('WorkRequestsViewModel loading', () => {
  it('is loading before the first load, then loads the first page, the appointments and the follow-ups, in that order', async () => {
    const calls: string[] = [];
    const repo = work({
      listRequests: vi.fn(async (query: WorkRequestQuery) => { calls.push(`requests ${JSON.stringify(query)}`); return { items: [] }; }),
      listAppointments: vi.fn(async () => { calls.push('appointments'); return { items: [] }; }),
      listFollowUps: vi.fn(async () => { calls.push('follow-ups'); return { items: [] }; }),
    });
    const vm = new WorkRequestsViewModel(repo);
    expect([vm.requestsLoading, vm.appointmentsLoading, vm.followUpsLoading]).toEqual([true, true, true]);
    vm.load();
    expect(calls).toEqual(['requests {"limit":15,"offset":0,"status":"ALL"}', 'appointments', 'follow-ups']);
    await settle();
    expect([vm.requestsLoading, vm.appointmentsLoading, vm.followUpsLoading]).toEqual([false, false, false]);
  });

  it('exposes the requests, appointments and follow-ups it loaded', async () => {
    const vm = await loaded();
    expect(vm.requestItems.map(item => item.id)).toEqual(['a']);
    expect(vm.requestTotal).toBe(40);
    expect(vm.appointmentItems.map(item => item.id)).toEqual(['appt']);
    expect(vm.followUpItems.map(item => item.id)).toEqual(['task']);
  });

  it('counts the requests on the page when the server reports no total, and has no items while a list is missing', async () => {
    const vm = await loaded(work({ listRequests: vi.fn().mockResolvedValue({ items: [request('a'), request('b')] }), listAppointments: vi.fn().mockResolvedValue({}) }));
    expect(vm.requestTotal).toBe(2);
    expect(vm.appointmentItems).toEqual([]);
    expect(new WorkRequestsViewModel(work()).followUpItems).toEqual([]);
  });

  it('keeps each list’s error separate, and reloads each on its own', async () => {
    const repo = work({
      listRequests: vi.fn().mockRejectedValueOnce(new Error('Requests unavailable')).mockResolvedValue({ items: [request('a')] }),
      listAppointments: vi.fn().mockRejectedValue(new Error('Appointments unavailable')),
      listFollowUps: vi.fn().mockRejectedValue(new Error('Follow-ups unavailable')),
    });
    const vm = await loaded(repo);
    expect([vm.requestsError, vm.appointmentsError, vm.followUpsError]).toEqual(['Requests unavailable', 'Appointments unavailable', 'Follow-ups unavailable']);
    vm.reloadRequests();
    await settle();
    expect(vm.requestsError).toBe('');
    expect(vm.requestItems.map(item => item.id)).toEqual(['a']);
    expect(vm.appointmentsError).toBe('Appointments unavailable');
    expect(repo.listAppointments).toHaveBeenCalledTimes(1);
    expect(repo.listFollowUps).toHaveBeenCalledTimes(1);
  });

  it('clears a list and shows it loading while it reloads', async () => {
    let release!: (value: AppointmentList) => void;
    const repo = work();
    const vm = await loaded(repo);
    vi.mocked(repo.listAppointments).mockImplementation(() => new Promise(resolve => { release = resolve; }));
    vm.reloadAppointments();
    expect(vm.appointmentsLoading).toBe(true);
    expect(vm.appointmentItems).toEqual([]);
    release({ items: [appointment('fresh')] });
    await settle();
    expect(vm.appointmentItems.map(item => item.id)).toEqual(['fresh']);
  });
});

describe('WorkRequestsViewModel filter and pages', () => {
  it('pages by 15, filters from the first page, and does not reload an unchanged query', async () => {
    const repo = work();
    const vm = await loaded(repo);
    vm.setPage(1);
    vm.setFilter('ACCEPTED');
    vm.setFilter('ACCEPTED');
    vm.setPage(0);
    vm.setFilter('ALL');
    expect(queries(repo)).toEqual([
      { limit: 15, offset: 0, status: 'ALL' },
      { limit: 15, offset: 15, status: 'ALL' },
      { limit: 15, offset: 0, status: 'ACCEPTED' },
      { limit: 15, offset: 0, status: 'ALL' },
    ]);
    expect([vm.filter, vm.page]).toEqual(['ALL', 0]);
    expect(repo.listAppointments).toHaveBeenCalledTimes(1);
  });

  it('ignores a filter value it does not offer', async () => {
    const repo = work();
    const vm = await loaded(repo);
    vm.setFilter('SHIPPED');
    expect(vm.filter).toBe('ALL');
    expect(repo.listRequests).toHaveBeenCalledTimes(1);
  });
});

describe('WorkRequestsViewModel steps offered', () => {
  it('offers accept or decline, then dispatch for a product or completion otherwise, and nothing once finished', () => {
    const vm = new WorkRequestsViewModel(work());
    expect(vm.requestSteps(request('a'))).toEqual(['ACCEPTED', 'DECLINED']);
    expect(vm.requestSteps(request('a', { status: 'ACCEPTED', kind: 'product' }))).toEqual(['DISPATCHED']);
    expect(vm.requestSteps(request('a', { status: 'ACCEPTED', kind: 'lab' }))).toEqual(['COMPLETED']);
    expect(vm.requestSteps(request('a', { status: 'DISPATCHED' }))).toEqual(['COMPLETED']);
    (['COMPLETED', 'DECLINED', 'CANCELLED'] as const).forEach(status => expect(vm.requestSteps(request('a', { status }))).toEqual([]));
  });

  it('offers confirm or decline, then completion or no-show and the consultation, for appointments; resolution for open follow-ups', () => {
    const vm = new WorkRequestsViewModel(work());
    expect(vm.appointmentDecisions(appointment('a'))).toEqual(['CONFIRMED', 'CANCELLED']);
    expect(vm.appointmentDecisions(appointment('a', 'CONFIRMED'))).toEqual(['COMPLETED', 'NO_SHOW']);
    expect(vm.appointmentDecisions(appointment('a', 'COMPLETED'))).toEqual([]);
    expect([vm.canJoinConsultation(appointment('a')), vm.canJoinConsultation(appointment('a', 'CONFIRMED'))]).toEqual([false, true]);
    expect([vm.canResolve(followUp('a')), vm.canResolve(followUp('a', 'RESOLVED'))]).toEqual([true, false]);
  });
});

describe('WorkRequestsViewModel changes', () => {
  it('updates a request, then reloads only the requests, on the same page and filter', async () => {
    const repo = work();
    const vm = await loaded(repo);
    vm.setFilter('REQUESTED');
    await settle();
    expect(await vm.updateRequest(request('a'), 'ACCEPTED')).toBe(true);
    expect(repo.updateRequest).toHaveBeenCalledWith('a', 'ACCEPTED');
    expect(queries(repo)[queries(repo).length - 1]).toEqual({ limit: 15, offset: 0, status: 'REQUESTED' });
    expect(repo.listRequests).toHaveBeenCalledTimes(3);
    expect(repo.listAppointments).toHaveBeenCalledTimes(1);
    expect(repo.listFollowUps).toHaveBeenCalledTimes(1);
  });

  it('decides an appointment, then reloads only the appointments', async () => {
    const repo = work();
    const vm = await loaded(repo);
    expect(await vm.decideAppointment(appointment('appt'), 'NO_SHOW')).toBe(true);
    expect(repo.updateAppointment).toHaveBeenCalledWith('appt', 'NO_SHOW');
    expect(repo.listAppointments).toHaveBeenCalledTimes(2);
    expect(repo.listRequests).toHaveBeenCalledTimes(1);
    expect(repo.listFollowUps).toHaveBeenCalledTimes(1);
  });

  it('resolves a follow-up, then reloads only the follow-ups', async () => {
    const repo = work();
    const vm = await loaded(repo);
    expect(await vm.resolveFollowUp(followUp('task'))).toBe(true);
    expect(repo.resolveFollowUp).toHaveBeenCalledWith('task');
    expect(repo.listFollowUps).toHaveBeenCalledTimes(2);
    expect(repo.listRequests).toHaveBeenCalledTimes(1);
    expect(repo.listAppointments).toHaveBeenCalledTimes(1);
  });

  it('shows a failed change with its message or a generic one, cleared on the next attempt, without reloading', async () => {
    const repo = work({
      updateRequest: vi.fn().mockRejectedValueOnce(new Error('Already declined.')).mockRejectedValueOnce('no message').mockResolvedValue({}),
      resolveFollowUp: vi.fn().mockRejectedValue(new Error('Already resolved.')),
    });
    const vm = await loaded(repo);
    expect(await vm.updateRequest(request('a'), 'ACCEPTED')).toBe(false);
    expect(vm.actionError).toBe('Already declined.');
    expect(vm.busy).toBe(false);
    expect(await vm.updateRequest(request('a'), 'ACCEPTED')).toBe(false);
    expect(vm.actionError).toBe('The request could not be completed.');
    const next = vm.updateRequest(request('a'), 'DECLINED');
    expect(vm.actionError).toBe('');
    expect(await next).toBe(true);
    expect(await vm.resolveFollowUp(followUp('task'))).toBe(false);
    expect(vm.actionError).toBe('Already resolved.');
    expect(repo.listFollowUps).toHaveBeenCalledTimes(1);
    expect(repo.listRequests).toHaveBeenCalledTimes(2);
  });

  it('runs one change at a time across requests, appointments and follow-ups', async () => {
    let release!: () => void;
    const repo = work({ updateRequest: vi.fn(() => new Promise<unknown>(resolve => { release = () => resolve({}); })) });
    const vm = await loaded(repo);
    const first = vm.updateRequest(request('a'), 'ACCEPTED');
    expect(vm.busy).toBe(true);
    expect(await vm.updateRequest(request('b'), 'ACCEPTED')).toBe(false);
    expect(await vm.decideAppointment(appointment('appt'), 'CONFIRMED')).toBe(false);
    expect(await vm.resolveFollowUp(followUp('task'))).toBe(false);
    expect(repo.updateRequest).toHaveBeenCalledTimes(1);
    expect(repo.updateAppointment).not.toHaveBeenCalled();
    expect(repo.resolveFollowUp).not.toHaveBeenCalled();
    release();
    expect(await first).toBe(true);
    expect(vm.busy).toBe(false);
    expect(await vm.resolveFollowUp(followUp('task'))).toBe(true);
  });
});

describe('WorkRequestsViewModel cancellation', () => {
  it('ignores a stale page and cancels its request', async () => {
    const pending: { query: WorkRequestQuery; signal?: AbortSignal; resolve: (value: WorkRequestPage) => void }[] = [];
    const listRequests = vi.fn((query: WorkRequestQuery, signal?: AbortSignal) => new Promise<WorkRequestPage>(resolve => { pending.push({ query, signal, resolve }); }));
    const vm = new WorkRequestsViewModel(work({ listRequests }));
    vm.load();
    vm.setFilter('DISPATCHED');
    expect(pending[0].signal?.aborted).toBe(true);
    expect(pending[1].signal?.aborted).toBe(false);
    pending[1].resolve({ items: [request('filtered')], total: 1 });
    await settle();
    pending[0].resolve({ items: [request('first')], total: 9 });
    await settle();
    expect(vm.requestItems.map(item => item.id)).toEqual(['filtered']);
    expect(vm.requestTotal).toBe(1);
  });

  it('ignores a stale reload of the appointments, and cancels it', async () => {
    const pending: { signal?: AbortSignal; resolve: (value: AppointmentList) => void }[] = [];
    const listAppointments = vi.fn((signal?: AbortSignal) => new Promise<AppointmentList>(resolve => { pending.push({ signal, resolve }); }));
    const vm = new WorkRequestsViewModel(work({ listAppointments }));
    vm.load();
    vm.reloadAppointments();
    expect(pending[0].signal?.aborted).toBe(true);
    pending[1].resolve({ items: [appointment('new')] });
    await settle();
    pending[0].resolve({ items: [appointment('old')] });
    await settle();
    expect(vm.appointmentItems.map(item => item.id)).toEqual(['new']);
  });

  it('cancels every load and changes nothing after dispose, and a later load works again', async () => {
    const signals: (AbortSignal | undefined)[] = [];
    let releaseRequests!: (value: WorkRequestPage) => void;
    let releaseChange!: () => void;
    const repo = work({
      listRequests: vi.fn((_query: WorkRequestQuery, signal?: AbortSignal) => { signals.push(signal); return new Promise<WorkRequestPage>(resolve => { releaseRequests = resolve; }); }),
      listAppointments: vi.fn((signal?: AbortSignal) => { signals.push(signal); return new Promise<AppointmentList>(() => undefined); }),
      listFollowUps: vi.fn((signal?: AbortSignal) => { signals.push(signal); return new Promise<{ items: FollowUpTask[] }>(() => undefined); }),
      updateAppointment: vi.fn(() => new Promise<unknown>(resolve => { releaseChange = () => resolve({}); })),
    });
    const vm = new WorkRequestsViewModel(repo);
    vm.load();
    const changing = vm.decideAppointment(appointment('appt'), 'CONFIRMED');
    vm.dispose();
    expect(signals.map(signal => signal?.aborted)).toEqual([true, true, true]);
    releaseRequests({ items: [request('late')], total: 1 });
    releaseChange();
    expect(await changing).toBe(false);
    await settle();
    expect(vm.requests).toBeNull();
    expect(vm.requestsLoading).toBe(true);
    expect(vm.busy).toBe(true);
    expect(repo.listAppointments).toHaveBeenCalledTimes(1);
    vm.load();
    expect(repo.listRequests).toHaveBeenCalledTimes(2);
    expect(repo.listAppointments).toHaveBeenCalledTimes(2);
    expect(repo.listFollowUps).toHaveBeenCalledTimes(2);
  });

  it('keeps a failed change silent after dispose', async () => {
    let fail!: () => void;
    const repo = work({ resolveFollowUp: vi.fn(() => new Promise<unknown>((_resolve, reject) => { fail = () => reject(new Error('late failure')); })) });
    const vm = await loaded(repo);
    const resolving = vm.resolveFollowUp(followUp('task'));
    vm.dispose();
    fail();
    expect(await resolving).toBe(false);
    expect(vm.actionError).toBe('');
  });
});
