import { describe, expect, it, vi } from 'vitest';
import { MyRequestsViewModel, NewRequestViewModel, canCancel, statusLabel } from '../RequestsViewModel';
import type { RequestItem } from '../RequestsViewModel';

type Requester = typeof import('@/data/http').apiRequest;
const item = (over: Partial<RequestItem>): RequestItem => ({ kind: 'RETURN', id: 'r1', title: 'Return: X', status: 'REQUESTED', createdAt: 1, ...over });

describe('requests', () => {
  it('speaks plainly about status and never says "refunded"', () => {
    expect(statusLabel(item({ status: 'APPROVED' }))).toBe('Approved');
    expect(statusLabel(item({ kind: 'REFILL', status: 'READY' }))).toBe('Ready to collect');
    expect(statusLabel(item({ kind: 'HOSTEL_VISIT', status: 'ASSIGNED' }))).toBe('Partner assigned');
  });

  it('offers cancel only where the server allows it', () => {
    expect(canCancel(item({}))).toBe(true);
    expect(canCancel(item({ status: 'APPROVED' }))).toBe(false);
    expect(canCancel(item({ kind: 'HOSTEL_VISIT', status: 'ASSIGNED' }))).toBe(true);
    expect(canCancel(item({ kind: 'ORDER' }))).toBe(false);
  });

  it('shows an error, not an empty list, when requests cannot load', async () => {
    const vm = new MyRequestsViewModel((async () => { throw new Error('x'); }) as unknown as Requester);
    await vm.load();
    expect(vm.loadFailed).toBe(true);
    expect(vm.items).toBeNull();
  });

  it('needs words for "something else" and a real future window for a visit', async () => {
    const empty = (async () => ({ items: [] })) as unknown as Requester;
    const ret = new NewRequestViewModel('RETURN', empty);
    ret.set('orderLineId', 'l1');
    ret.set('reason', 'OTHER');
    expect(ret.canSubmit).toBe(false);
    ret.set('note', 'Leaking bottle');
    expect(ret.canSubmit).toBe(true);

    const visit = new NewRequestViewModel('HOSTEL_VISIT', empty);
    visit.set('service', 'NURSE_VISIT');
    visit.set('hostelBlock', 'B');
    visit.set('room', '214');
    visit.set('date', '2020-01-01');
    visit.set('startTime', '09:00');
    visit.set('hours', '2');
    expect(visit.window).toBeNull();
    const next = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    visit.set('date', next);
    expect(visit.window?.end).toBe((visit.window?.start ?? 0) + 7200);
    expect(visit.canSubmit).toBe(true);
  });

  it('says nothing was sent when submitting fails', async () => {
    const request = vi.fn(async (_p: string, init?: RequestInit) => {
      if (init?.method === 'POST') throw new Error('offline');
      return { items: [] };
    }) as unknown as Requester;
    const vm = new NewRequestViewModel('REFILL', request);
    vm.set('planId', 'p1');
    vm.set('providerId', 'v1');
    await vm.submit();
    expect(vm.done).toBe(false);
    expect(vm.error).toMatch(/Nothing was sent/);
  });
});
