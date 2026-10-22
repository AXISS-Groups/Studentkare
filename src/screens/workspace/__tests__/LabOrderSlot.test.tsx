import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

// A student chooses the collection time for a test their doctor ordered.
const answers: Record<string, unknown> = {};
const failures: Record<string, Error> = {};
const apiRequest = vi.fn((path: string, _init?: RequestInit) => {
  if (path in failures) return Promise.reject(failures[path]);
  return path in answers ? Promise.resolve(answers[path]) : new Promise(() => undefined);
});
vi.mock('../../../data/services/http', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));
const user = { id: 'pt-1', role: 'STUDENT' };
vi.mock('../../../data/contexts/AuthContext', () => ({ useAuth: () => ({ user, logout: vi.fn() }) }));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user, logout: vi.fn() }) }));

import { MyPrescriptionsPanel } from '../MyPrescriptionsPanel';
import { LabQueuePanel } from '../FulfilmentQueuePanel';

const FUTURE = '2099-01-05T08:00:00+05:30';
const FUTURE_END = '2099-01-05T08:30:00+05:30';
const order = (over: Record<string, unknown> = {}) => ({
  id: 'lab-12345678', testPanel: ['Complete Blood Count'], status: 'BOOKED', sampleId: '', collectorName: '',
  fastingRequired: true, collectionMode: 'WALK_IN', criticalFlag: false, rejectionReason: '', createdAt: 1790000000,
  reviewNote: '', orderedByDoctor: 'Dr Rao', slotStart: '', ...over,
});
const slot = { id: 's-a', slotStart: FUTURE, slotEnd: FUTURE_END, capacity: 2, booked: 0, available: 2 };

beforeEach(() => {
  for (const store of [answers, failures]) Object.keys(store).forEach(key => delete store[key]);
  apiRequest.mockClear();
  answers['/prescriptions?limit=20'] = { items: [], total: 0 };
});

describe('A test the student booked and has not paid for (live-run audit #2)', () => {
  it('reads "Awaiting payment" and says it has not gone to the lab, not "Booked"', async () => {
    answers['/lab-orders?limit=20'] = { items: [order({ orderedByDoctor: '', paymentStatus: 'UNPAID' })], total: 1 };
    render(<MyPrescriptionsPanel />);
    expect(await screen.findByText('Awaiting payment')).toBeTruthy();
    expect(screen.getByText(/Not sent to the lab yet/)).toBeTruthy();
    expect(screen.queryByText('Booked')).toBeNull();
  });
});

describe('Choosing a collection time for a doctor-ordered test', () => {
  it('saves the chosen time on the order, with fasting guidance and no price', async () => {
    answers['/lab-orders?limit=20'] = { items: [order()], total: 1 };
    answers['/lab-orders/lab-12345678/slots'] = { slots: [slot] };
    answers['/lab-orders/lab-12345678/slot'] = order({ slotStart: FUTURE });
    render(<MyPrescriptionsPanel />);

    fireEvent.click(await screen.findByRole('button', { name: 'Choose a collection time for Complete Blood Count' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/taken fasting/)).toBeTruthy();
    expect(dialog.textContent).not.toMatch(/₹|price/i);
    // The order's own times, not the shop's appointment availability.
    expect(apiRequest).not.toHaveBeenCalledWith(expect.stringContaining('/appointments'), expect.anything());

    const select = await within(dialog).findByLabelText('Available provider slots') as HTMLSelectElement;
    await waitFor(() => expect(select.disabled).toBe(false));
    fireEvent.change(select, { target: { value: 's-a' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save this time' }));

    expect(await within(dialog).findByText('Collection time saved')).toBeTruthy();
    const put = apiRequest.mock.calls.find(([path]) => path === '/lab-orders/lab-12345678/slot');
    expect(put?.[1]).toMatchObject({ method: 'PUT', body: JSON.stringify({ slotId: 's-a' }) });
  });

  it('says so calmly when the lab has published no times', async () => {
    answers['/lab-orders?limit=20'] = { items: [order({ fastingRequired: false })], total: 1 };
    answers['/lab-orders/lab-12345678/slots'] = { slots: [] };
    render(<MyPrescriptionsPanel />);
    fireEvent.click(await screen.findByRole('button', { name: /Choose a collection time/ }));
    expect(await screen.findByText(/has not published any times/)).toBeTruthy();
    expect(screen.queryByText(/taken fasting/)).toBeNull();
  });

  it('shows the server error when saving fails', async () => {
    answers['/lab-orders?limit=20'] = { items: [order()], total: 1 };
    answers['/lab-orders/lab-12345678/slots'] = { slots: [slot] };
    failures['/lab-orders/lab-12345678/slot'] = new Error('The laboratory has already scheduled this collection.');
    render(<MyPrescriptionsPanel />);
    fireEvent.click(await screen.findByRole('button', { name: /Choose a collection time/ }));
    const select = await screen.findByLabelText('Available provider slots') as HTMLSelectElement;
    await waitFor(() => expect(select.disabled).toBe(false));
    fireEvent.change(select, { target: { value: 's-a' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save this time' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/already scheduled/);
  });

  it('offers a change while booked, and nothing for a self-booked or assigned test', async () => {
    answers['/lab-orders?limit=20'] = { items: [
      order({ id: 'lab-aaaaaaaa', slotStart: FUTURE }),
      order({ id: 'lab-bbbbbbbb', orderedByDoctor: '' }),
      order({ id: 'lab-cccccccc', status: 'ASSIGNED', collectorName: 'P. Rao' }),
    ], total: 3 };
    render(<MyPrescriptionsPanel />);
    expect(await screen.findByRole('button', { name: /Change the collection time/ })).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: /Choose a collection time/ })).toHaveLength(0);
    expect(screen.getByText(/^Collection time:/)).toBeTruthy();
  });
});

describe('Lab desk: the chosen collection time', () => {
  it('shows the time the student chose, or that none is chosen yet', async () => {
    const queued = (over: Record<string, unknown>) => ({ ...order(over), nextStates: ['ASSIGNED', 'CANCELLED'] });
    answers['/work/lab-orders?limit=50'] = { items: [
      queued({ id: 'lab-aaaaaaaa', slotStart: FUTURE }), queued({ id: 'lab-bbbbbbbb' }),
    ], total: 2, critical: 0 };
    render(<LabQueuePanel />);
    expect(await screen.findByText(/collection 5 Jan 2099/)).toBeTruthy();
    expect(screen.getByText(/no collection time chosen yet/)).toBeTruthy();
  });
});
