import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppointmentBookingViewModel } from '../AppointmentBookingViewModel';
import type { AvailabilitySlot, BookableService } from '../AppointmentBookingViewModel';
import { AppointmentBookingNativeView } from '../../views/AppointmentBookingNativeView';

type Requester = typeof import('@/data/http').apiRequest;
const service: BookableService = { id: 'cat_1', name: 'General consult', brand: 'Campus Clinic', pricePaise: 19900 };
const slot = (over: Partial<AvailabilitySlot> = {}): AvailabilitySlot => ({ id: 'slot_1', slotStart: '2026-10-12T09:00', slotEnd: '2026-10-12T09:15', capacity: 2, booked: 0, available: 2, ...over });

function backend(overrides: Record<string, () => unknown> = {}) {
  const calls: { path: string; init?: RequestInit }[] = [];
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    const key = Object.keys(overrides).find((k) => path === k);
    if (key) return overrides[key]();
    if (path.startsWith('/catalog')) return { items: [service] };
    if (path.startsWith('/appointments/availability')) return { slots: [slot(), slot({ id: 'slot_full', available: 0, booked: 2 })] };
    if (path === '/appointments') return { id: 'apt_1', slotStart: '2026-10-12T09:00', slotEnd: '2026-10-12T09:15', status: 'REQUESTED' };
    throw new Error(`unexpected ${path}`);
  });
  return { request: request as unknown as Requester, calls };
}

describe('AppointmentBookingViewModel on the real contract', () => {
  it('lists consultations, their slots, and books by slotId only', async () => {
    const { request, calls } = backend();
    const vm = new AppointmentBookingViewModel(request);
    await vm.load();
    await vm.selectService('cat_1');
    vm.selectSlot('slot_1');
    expect(await vm.submit()).toBe(true);
    expect(calls.map((c) => c.path)).toEqual(['/catalog?kind=consultation&limit=50', '/appointments/availability?catalogItemId=cat_1&date=', '/appointments']);
    expect(JSON.parse(String(calls[2].init?.body))).toEqual({ slotId: 'slot_1' });
    expect(vm.request?.status).toBe('REQUESTED');
  });

  it('never calls the endpoints that do not exist', async () => {
    const { request, calls } = backend();
    const vm = new AppointmentBookingViewModel(request);
    await vm.load();
    await vm.selectService('cat_1');
    expect(calls.some((c) => /\/appointments\/(providers|slots|book)/.test(c.path))).toBe(false);
  });

  it('will not submit a full slot', async () => {
    const { request } = backend();
    const vm = new AppointmentBookingViewModel(request);
    await vm.load();
    await vm.selectService('cat_1');
    vm.selectSlot('slot_full');
    expect(vm.canSubmit).toBe(false);
    expect(await vm.submit()).toBe(false);
  });

  it('reports a refused booking and books nothing', async () => {
    const { request } = backend({ '/appointments': () => { throw new Error('This slot was just booked. Please choose another.'); } });
    const vm = new AppointmentBookingViewModel(request);
    await vm.load();
    await vm.selectService('cat_1');
    vm.selectSlot('slot_1');
    expect(await vm.submit()).toBe(false);
    expect(vm.request).toBeNull();
    expect(vm.error).toMatch(/just booked/);
  });

  it('shows an error, not an empty list, when consultations cannot load', async () => {
    const vm = new AppointmentBookingViewModel((async () => { throw new Error('offline'); }) as unknown as Requester);
    await vm.load();
    expect(vm.servicesFailed).toBe(true);
  });
});

describe('AppointmentBookingNativeView', () => {
  it('shows the price before the request and calls a sent request a request', async () => {
    const { request } = backend();
    const vm = new AppointmentBookingViewModel(request);
    render(<AppointmentBookingNativeView viewModel={vm} />);
    fireEvent.click(await screen.findByRole('radio', { name: /General consult · Campus Clinic · ₹199/ }));
    expect(await screen.findByText(/Price: ₹199/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('radio', { name: /2 left/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Request this appointment' }));
    await waitFor(() => expect(screen.getByText('Request sent')).toBeInTheDocument());
    expect(screen.getByText(/not confirmed until the provider accepts/)).toBeInTheDocument();
  });
});
