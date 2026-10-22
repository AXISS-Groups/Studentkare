import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { VendorConsoleScreen } from '../VendorConsoleScreen';
import type { ConsoleData, ConsoleSource } from '../VendorConsoleScreen';
import type { PartnerRequest } from '@/features/partner/partnerApi';

const partner = { partnerKind: 'PHARMACY' };
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'acct-1', fullName: 'Campus Pharmacy', role: 'VENDOR', partnerKind: partner.partnerKind } }) }));
vi.mock('@/lib/utils/workflowRouting', () => ({ navigate: vi.fn() }));

const line = (over: Partial<PartnerRequest> = {}): PartnerRequest => ({
  id: 'line-1', orderId: 'order-00048120', itemId: 'i1', name: 'Ashwagandha Stress Balance', kind: 'product', quantity: 2,
  pricePaise: 28900, status: 'ACCEPTED', customer: 'Kiran Chandra', delivery: { mode: 'delivery', city: 'Hyderabad', pincode: '500090' },
  requestedSlot: 'Tonight, 9 PM', createdAt: 1_760_000_000, ...over,
});
const data = (over: Partial<ConsoleData> = {}): ConsoleData => ({
  page: { items: [line(), line({ id: 'line-2', orderId: 'order-00048115', name: 'Omega 3 Fish Oil', quantity: 1, status: 'COMPLETED', delivery: { mode: 'pickup' }, requestedSlot: '' })], total: 2, limit: 20, offset: 0 },
  totals: { ALL: 9, REQUESTED: 2, ACCEPTED: 4, DISPATCHED: 1, AWAITING_PAYMENT: 0 },
  rxWaiting: 2,
  ...over,
});

describe('VendorConsole — the fulfilment queue', () => {
  beforeEach(() => { partner.partnerKind = 'PHARMACY'; });

  it('lists the partner’s own lines with initials only, server prices and the server totals', async () => {
    render(<VendorConsoleScreen source={vi.fn(async () => data())} />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Fulfilment queue' })).toBeInTheDocument();
    expect(screen.getByText('9 orders · 2 waiting for you · 2 awaiting pharmacist verification')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('048120')).toBeInTheDocument();
    expect(within(table).getAllByText("K.C.").length).toBe(2);
    expect(within(table).queryByText(/Kiran/)).toBeNull();
    expect(within(table).getByText(/Qty 2 · ₹578/)).toBeInTheDocument();
    expect(within(table).getByText('Pickup at the store')).toBeInTheDocument();
    const side = screen.getByRole('complementary', { name: 'Summary and notes' });
    expect(within(side).getByText('Orders received').nextElementSibling).toHaveTextContent('9');
    expect(within(side).getByText('Settlement due').nextElementSibling).toHaveTextContent('—');
    expect(within(side).getByText(/2 prescriptions are waiting/)).toBeInTheDocument();
    expect(within(side).getByText('What you cannot see')).toBeInTheDocument();
  });

  it('filters by state on the server and resets to the first page', async () => {
    const source: ConsoleSource = vi.fn(async () => data());
    render(<VendorConsoleScreen source={source} />);
    fireEvent.click(await screen.findByRole('button', { name: /To pack/ }));
    await waitFor(() => expect(source).toHaveBeenLastCalledWith('ACCEPTED', 0, true, expect.anything()));
    expect(screen.getByRole('button', { name: /To pack/ })).toHaveAttribute('aria-pressed', 'true');
    // No "Blocked" chip: order lines are never held, so it would always be empty.
    expect(screen.queryByRole('button', { name: /Blocked/ })).toBeNull();
  });

  it('keeps an unpaid order apart as "Awaiting payment", never "New" (live-run audit #1)', async () => {
    const source: ConsoleSource = vi.fn(async () => data({
      page: { items: [line({ status: 'REQUESTED', awaitingPayment: true, paymentStatus: 'UNPAID' })], total: 1, limit: 20, offset: 0 },
      totals: { ALL: 9, REQUESTED: 0, ACCEPTED: 4, DISPATCHED: 1, AWAITING_PAYMENT: 1 },
    }));
    render(<VendorConsoleScreen source={source} />);
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Awaiting payment')).toBeInTheDocument();
    expect(within(table).queryByText('New')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Awaiting payment/ }));
    await waitFor(() => expect(source).toHaveBeenLastCalledWith('AWAITING_PAYMENT', 0, true, expect.anything()));
  });

  it('a non-pharmacy partner gets no pharmacist note and no Rx call', async () => {
    partner.partnerKind = 'CLINIC';
    const source: ConsoleSource = vi.fn(async () => data({ rxWaiting: null }));
    render(<VendorConsoleScreen source={source} />);
    await screen.findByRole('table');
    expect(source).toHaveBeenCalledWith('ALL', 0, false, expect.anything());
    expect(screen.queryByText('Awaiting pharmacist')).toBeNull();
  });

  it('empty and error states', async () => {
    const { unmount } = render(<VendorConsoleScreen source={vi.fn(async () => data({ page: { items: [], total: 0, limit: 20, offset: 0 }, totals: { ALL: 0, REQUESTED: 0, ACCEPTED: 0, DISPATCHED: 0, AWAITING_PAYMENT: 0 } }))} />);
    expect(await screen.findByRole('heading', { name: 'Nothing in the fulfilment queue yet.' })).toBeInTheDocument();
    unmount();
    render(<VendorConsoleScreen source={vi.fn(async () => { throw new Error('down'); })} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load the fulfilment queue');
    expect(screen.getByText('Ref QUEUE · VendorConsole')).toBeInTheDocument();
  });
});
