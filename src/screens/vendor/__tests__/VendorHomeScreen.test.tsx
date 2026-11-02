import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { VendorHomeScreen } from '../VendorHomeScreen';
import type { HomeData, HomeSource } from '../VendorHomeScreen';
import type { PartnerRequest } from '@/features/partner/partnerApi';

// The partner type comes from the session, as a super admin assigned it.
const partner: { partnerKind: string } = { partnerKind: 'PHARMACY' };
vi.mock('../../../data/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'acct-1', fullName: 'Demo Wellness Store', role: 'VENDOR', email: 'vendor@studentkare.test', partnerKind: partner.partnerKind },
    logout: vi.fn(),
  }),
}));

const updateRequest = vi.fn();
vi.mock('@/features/partner/partnerApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/partner/partnerApi')>()),
  updateRequest: (...args: unknown[]) => updateRequest(...args),
}));

vi.mock('../../../lib/utils/workflowRouting', () => ({ navigate: vi.fn() }));

const line = (over: Partial<PartnerRequest> = {}): PartnerRequest => ({
  id: 'line-1', orderId: 'order-00005521', itemId: 'i1', name: 'Paracetamol 650', kind: 'product', quantity: 2,
  pricePaise: 4500, status: 'REQUESTED', customer: 'Priya Sharma', delivery: { mode: 'delivery', city: 'Hyderabad', pincode: '500090' },
  requestedSlot: 'Today 6–8 PM', createdAt: 1_760_000_000, ...over,
});

const data = (over: Partial<HomeData> = {}): HomeData => ({
  recent: [line(), line({ id: 'line-2', orderId: 'order-00005519', name: 'Thermometer', quantity: 1, status: 'COMPLETED' })],
  total: 2,
  counts: { REQUESTED: 1, ACCEPTED: 0, DISPATCHED: 3 },
  newest: line(),
  rxWaiting: 4,
  ...over,
});

const sourceOf = (value: HomeData): HomeSource => vi.fn(async () => value);

describe('VendorHome', () => {
  beforeEach(() => { partner.partnerKind = 'PHARMACY'; updateRequest.mockReset(); });

  it('lists a cancelled order line as "Cancelled by student" instead of crashing', async () => {
    render(<VendorHomeScreen source={sourceOf(data({ recent: [line({ id: 'line-c', status: 'CANCELLED', awaitingPayment: true, paymentStatus: 'CANCELLED' })], total: 1, newest: null }))} />);
    expect(await screen.findByText('Cancelled by student')).toBeInTheDocument();
    expect(screen.queryByText('Awaiting payment')).toBeNull();
  });

  it('shows the partner’s own account and real server figures, never a sample business', async () => {
    render(<VendorHomeScreen source={sourceOf(data())} />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Demo Wellness Store' })).toBeInTheDocument();
    for (const fake of [/MedPlus/, /Bachupally/, /96%/, /2FA on/]) expect(screen.queryByText(fake)).toBeNull();
    const kpis = screen.getByRole('group', { name: 'Today at a glance' });
    expect(within(kpis).getByText('Rx to review').nextElementSibling).toHaveTextContent('4');
    expect(within(kpis).getByText('Out for delivery').nextElementSibling).toHaveTextContent('3');
    // Accept rate has no source: "—", never a number.
    expect(within(kpis).getByText('Accept rate').nextElementSibling).toHaveTextContent('—');
    expect(within(kpis).getByText('Not connected')).toBeInTheDocument();
  });

  it('lists the latest orders by reference only: no student name on the page', async () => {
    render(<VendorHomeScreen source={sourceOf(data())} />);
    expect(await screen.findByText('Paracetamol 650 × 2', { selector: '.vh-row__what' })).toBeInTheDocument();
    expect(screen.getByText('005521')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.queryByText(/Priya/)).toBeNull();
  });

  it('accepts the newest request from the banner and reloads', async () => {
    updateRequest.mockResolvedValue({});
    const source = sourceOf(data());
    render(<VendorHomeScreen source={source} />);
    const banner = await screen.findByRole('region', { name: 'New request · Paracetamol 650 × 2' });
    expect(within(banner).getByText(/₹90/)).toBeInTheDocument();
    fireEvent.click(within(banner).getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(updateRequest).toHaveBeenCalledWith('line-1', 'ACCEPTED'));
    await waitFor(() => expect(source).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Accepted. It’s in your fulfilment queue.')).toBeInTheDocument();
  });

  it('says so when a decision fails, and keeps the request', async () => {
    updateRequest.mockRejectedValue(new Error('This request changed. Refresh and try again.'));
    render(<VendorHomeScreen source={sourceOf(data())} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));
    expect(await screen.findByText('This request changed. Refresh and try again.')).toBeInTheDocument();
  });

  it('shows no banner when nothing is waiting', async () => {
    render(<VendorHomeScreen source={sourceOf(data({ newest: null, counts: { REQUESTED: 0, ACCEPTED: 0, DISPATCHED: 0 } }))} />);
    await screen.findByRole('heading', { level: 1, name: 'Demo Wellness Store' });
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
  });

  it('empty: the board’s tile, copy and one next step', async () => {
    const onNavigate = vi.fn();
    render(<VendorHomeScreen onNavigate={onNavigate} source={sourceOf(data({ recent: [], total: 0, newest: null, rxWaiting: 0 }))} />);
    expect(await screen.findByRole('heading', { name: 'Nothing in Demo Wellness Store yet.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check your catalogue' }));
    expect(onNavigate).toHaveBeenCalledWith('catalogue');
  });

  it('error: calm card with retry and the reference', async () => {
    const source: HomeSource = vi.fn(async () => { throw new Error('boom'); });
    render(<VendorHomeScreen source={source} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load Demo Wellness Store');
    expect(screen.getByText('Ref HOME · VendorHome')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(source).toHaveBeenCalledTimes(2));
  });

  it('loading: a labelled skeleton', () => {
    render(<VendorHomeScreen source={() => new Promise(() => undefined)} />);
    expect(screen.getByRole('status', { name: 'Loading Demo Wellness Store' })).toHaveAttribute('aria-busy', 'true');
  });

  it('a lab gets lab tools; tools with no page say so instead of navigating', async () => {
    partner.partnerKind = 'LAB';
    const onNavigate = vi.fn();
    render(<VendorHomeScreen onNavigate={onNavigate} source={sourceOf(data({ rxWaiting: null }))} />);
    fireEvent.click(await screen.findByRole('button', { name: /Run sheet/ }));
    expect(onNavigate).toHaveBeenCalledWith('run-sheet');
    expect(screen.queryByText('Rx to review')).toBeNull();
  });

  it('a clinic’s unbuilt tools are marked unavailable and never navigate', async () => {
    partner.partnerKind = 'CLINIC';
    const onNavigate = vi.fn();
    render(<VendorHomeScreen onNavigate={onNavigate} source={sourceOf(data({ rxWaiting: null }))} />);
    const slots = await screen.findByRole('button', { name: /Slots/ });
    expect(slots).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(slots);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('fails closed with no assigned type: no dashboard, no tools, no request', () => {
    partner.partnerKind = '';
    const source = sourceOf(data());
    render(<VendorHomeScreen source={source} />);
    expect(screen.getByRole('heading', { name: 'Your partner account isn’t set up yet.' })).toBeInTheDocument();
    expect(source).not.toHaveBeenCalled();
  });
});
