import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/http';
import { DoctorLabOrderViewModel } from '@/features/clinician/viewmodel/DoctorLabOrderViewModel';
import type { OrderableLabTest, PlacedLabOrder } from '@/features/clinician/viewmodel/DoctorLabOrderViewModel';
import type { StaffAppointment } from '@/features/clinician/viewmodel/PrescribeViewModel';
import { DoctorLabOrderDispatchScreen } from '../DoctorLabOrderDispatchScreen';

type Requester = typeof import('@/data/http').apiRequest;

const appts: StaffAppointment[] = [
  { id: 'a1', patientId: 'pt_1', customer: 'Asha', slotStart: '2026-10-08T09:00', status: 'COMPLETED' },
  { id: 'a2', patientId: 'pt_2', customer: 'Ravi', slotStart: '2026-10-09T09:00', status: 'REQUESTED' },
];
const tests: OrderableLabTest[] = [
  { id: 'cbc', name: 'Complete Blood Count', preparation: 'No fasting', labName: 'Kare Labs', homeCollection: false },
  { id: 'lipid', name: 'Lipid Profile', preparation: '10 h fasting', labName: 'Kare Labs', homeCollection: true },
];
const placed: PlacedLabOrder = {
  id: 'lo_1', patientId: 'pt_1', patientName: 'Asha', testPanel: ['Complete Blood Count'],
  clinicalIndication: 'Post-fever follow-up', collectionMode: 'WALK_IN', fastingRequired: false,
  labName: 'Kare Labs', status: 'BOOKED', createdAt: 1_790_000_000,
};

interface Options { orders?: PlacedLabOrder[]; fail?: string; onPost?: () => unknown }

function backend({ orders = [], fail, onPost }: Options = {}) {
  const posts: Record<string, unknown>[] = [];
  let current = orders;
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    if (path === fail) throw new ApiError('Service unavailable', 503, null);
    if (path === '/work/appointments') return { items: appts };
    if (path === '/work/lab-tests') return { items: tests };
    if (path === '/work/doctor-lab-orders' && init?.method === 'POST') {
      posts.push(JSON.parse(String(init.body)));
      const result = onPost ? onPost() : { id: 'lo_1' };
      current = [placed];
      return result;
    }
    if (path === '/work/doctor-lab-orders') return { items: current };
    throw new Error(`unexpected ${path}`);
  }) as unknown as Requester;
  return { request, posts };
}

function renderWith(options?: Options) {
  const api = backend(options);
  const vm = new DoctorLabOrderViewModel(api.request);
  render(<DoctorLabOrderDispatchScreen viewModel={vm} />);
  return { vm, posts: api.posts };
}

describe('DoctorLabOrderDispatchScreen — a doctor orders a lab test', () => {
  it('offers only patients with a confirmed or completed appointment, and no prices', async () => {
    renderWith();
    const patient = await screen.findByLabelText(/^patient \(from your/i);
    expect(screen.getByRole('option', { name: /Asha/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Ravi/ })).toBeNull();
    expect(patient).toBeInTheDocument();
    await screen.findByRole('option', { name: 'Complete Blood Count' });
    expect(screen.queryByText(/₹|price:/i)).toBeNull();
  });

  it('will not submit without a typed indication, then sends the order and shows success', async () => {
    const { posts } = renderWith();
    fireEvent.change(await screen.findByLabelText(/^patient \(from your/i), { target: { value: 'pt_1' } });
    await screen.findByRole('option', { name: 'Complete Blood Count' });
    fireEvent.change(screen.getByLabelText(/^test$/i), { target: { value: 'cbc' } });
    const send = screen.getByRole('button', { name: /send lab order/i });
    expect(send).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/clinical indication/i), { target: { value: 'ab' } });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/clinical indication/i), { target: { value: '  Post-fever follow-up ' } });
    fireEvent.click(screen.getByLabelText(/fasting needed/i));
    expect(send).toBeEnabled();
    fireEvent.click(send);

    expect(await screen.findByText(/lab order sent/i)).toBeInTheDocument();
    expect(screen.getByText(/Complete Blood Count ordered for Asha/)).toBeInTheDocument();
    expect(posts).toEqual([{
      patientId: 'pt_1', catalogItemId: 'cbc', collectionMode: 'WALK_IN',
      fastingRequired: true, clinicalIndication: 'Post-fever follow-up',
    }]);
    // The placed order is listed with its status.
    expect(await screen.findByText(/Booked, ordered/)).toBeInTheDocument();
  });

  it('allows hostel collection only for a test whose lab offers it', async () => {
    const { vm } = renderWith();
    await screen.findByRole('option', { name: 'Complete Blood Count' });
    fireEvent.change(screen.getByLabelText(/^test$/i), { target: { value: 'cbc' } });
    expect(screen.getByLabelText(/collect from hostel room/i)).toBeDisabled();
    expect(screen.getByText(/doesn’t collect from hostels/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^test$/i), { target: { value: 'lipid' } });
    fireEvent.click(screen.getByLabelText(/collect from hostel room/i));
    expect(vm.collectionMode).toBe('HOME');
    fireEvent.change(screen.getByLabelText(/^test$/i), { target: { value: 'cbc' } });
    expect(vm.collectionMode).toBe('WALK_IN');
  });

  it('shows the server refusal and keeps the form', async () => {
    renderWith({ onPost: () => { throw new ApiError('You can order tests only for a patient with a confirmed or completed appointment with you.', 403, null); } });
    fireEvent.change(await screen.findByLabelText(/^patient \(from your/i), { target: { value: 'pt_1' } });
    await screen.findByRole('option', { name: 'Complete Blood Count' });
    fireEvent.change(screen.getByLabelText(/^test$/i), { target: { value: 'cbc' } });
    fireEvent.change(screen.getByLabelText(/clinical indication/i), { target: { value: 'Fatigue, six weeks' } });
    fireEvent.click(screen.getByRole('button', { name: /send lab order/i }));
    expect(await screen.findByText(/confirmed or completed appointment with you/i)).toBeInTheDocument();
    expect(screen.queryByText(/lab order sent/i)).toBeNull();
  });

  it('lists the orders this doctor placed with their indication and status', async () => {
    renderWith({ orders: [placed] });
    expect(await screen.findByText('Post-fever follow-up')).toBeInTheDocument();
    expect(screen.getByText(/1 open · 0 need fasting/)).toBeInTheDocument();
  });

  it('shows loading first, then an error with a retry when the list fails', async () => {
    const { vm } = renderWith({ fail: '/work/doctor-lab-orders' });
    expect(screen.getByText(/loading your orders/i)).toBeInTheDocument();
    expect(await screen.findByText(/your orders couldn’t be loaded/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /try again/i }).length).toBeGreaterThan(0);
    await waitFor(() => expect(vm.tests).not.toBeNull());
  });

  it('shows the empty state when the doctor has placed nothing', async () => {
    renderWith();
    expect(await screen.findByText(/haven’t ordered any tests yet/i)).toBeInTheDocument();
  });
});
