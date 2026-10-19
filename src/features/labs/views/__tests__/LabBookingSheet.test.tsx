import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/services/http';
import { PaymentRepository } from '@/features/payments/data/PaymentRepository';
import { PayStepViewModel } from '@/features/payments/viewmodel/PayStepViewModel';
import { LabBookingRepository } from '../../data/LabBookingRepository';
import { LabBookingViewModel } from '../../viewmodel/LabBookingViewModel';
import { LabBookingSheet } from '../LabBookingSheet';

type Requester = typeof import('@/data/services/http').apiRequest;

const FUTURE = '2099-01-05T08:00:00+05:30';
const FUTURE_END = '2099-01-05T08:30:00+05:30';
const OPTIONS = {
  lab: { id: 'lab-1', name: 'Vijaya Diagnostics' }, homeCollection: true,
  slots: [
    { id: 's-a', slotStart: FUTURE, slotEnd: FUTURE_END, capacity: 2, booked: 0, available: 2 },
    { id: 's-past', slotStart: '2020-01-05T08:00:00+05:30', slotEnd: '2020-01-05T08:30:00+05:30', capacity: 2, booked: 0, available: 2 },
  ],
};
const BOOKING = {
  id: 'lab12345678abcd', status: 'PENDING_PAYMENT', testPanel: ['Vitamin D + B12'], slotStart: FUTURE,
  collectionMode: 'HOSTEL', collectionAddress: { hostelBlock: 'Block B', room: '214' }, paymentOrderId: 'ord_1',
  labName: 'Vijaya Diagnostics',
};
const PAY = '/orders/ord_1/payment';
const START = {
  configured: true, status: 'CREATED', intentId: 'pi_1', provider: 'mock', testMode: true, providerOrderId: 'mock_order_1',
  amountPaise: 64900, currency: 'INR', expiresAt: 0, payable: { kind: 'shop_order', id: 'ord_1' }, checkout: { testCards: [] },
};
const PAID = { outcome: 'PAID', paymentStatus: 'PAID', provider: 'mock', testMode: true, amountPaise: 64900, paymentDueAt: null, payments: [] };

function setup(routes: Record<string, unknown>, preparation = 'Needs 10 hours fasting. Water is fine.') {
  const calls: { path: string; init?: RequestInit }[] = [];
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    const answer = routes[`${init?.method ?? 'GET'} ${path}`];
    if (answer instanceof Error) throw answer;
    if (typeof answer === 'function') return (answer as () => unknown)();
    return answer;
  }) as unknown as Requester;
  const vm = new LabBookingViewModel(
    { catalogItemId: 'vit-d', name: 'Vitamin D + B12', pricePaise: 64900, preparation },
    new LabBookingRepository(request),
    (orderId, amount) => new PayStepViewModel(orderId, amount, new PaymentRepository(request)),
  );
  const handlers = { onClose: vi.fn(), onViewBooking: vi.fn(), onOrders: vi.fn() };
  render(<LabBookingSheet viewModel={vm} studentName="Krishna C." {...handlers} />);
  return { vm, calls, ...handlers };
}

describe('Booking a lab test from the shop', () => {
  it('holds a time, collects at the hostel room, pays, and ends on the booked state', async () => {
    const { calls, onViewBooking } = setup({
      'GET /lab-tests/vit-d/booking-options': OPTIONS,
      'POST /lab-orders': BOOKING,
      [`POST ${PAY}`]: START,
      [`POST ${PAY}/mock-checkout`]: { providerOrderId: 'mock_order_1', providerPaymentId: 'mock_pay_1', signature: 'sig', outcome: 'captured', errorCode: '', testMode: true },
      [`POST ${PAY}/verify`]: PAID,
      'GET /lab-orders?limit=20': { items: [{ ...BOOKING, status: 'BOOKED' }], total: 1 },
    });

    expect(await screen.findByText('Pick a collection slot')).toBeInTheDocument();
    expect(screen.getByText('Vitamin D + B12 · ₹649')).toBeInTheDocument();
    expect(screen.getByTestId('lab-booking-prep')).toHaveTextContent('Needs 10 hours fasting');
    // Past times are not offered.
    expect(screen.getAllByRole('radio', { name: /left/ })).toHaveLength(1);
    expect(screen.getByRole('radio', { name: 'My hostel room' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: /2 left/ }));
    fireEvent.change(screen.getByTestId('lab-booking-block'), { target: { value: 'Block B' } });
    fireEvent.change(screen.getByTestId('lab-booking-room'), { target: { value: '214' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and pay ₹649' }));

    // The Pay step shows the server's amount and labels the mock as a test payment.
    fireEvent.click(await screen.findByRole('button', { name: 'Pay ₹649 · test' }));
    const booked = await screen.findByTestId('lab-booking-booked');
    expect(booked).toHaveTextContent('Lab test booked');
    expect(booked).toHaveTextContent('Vijaya Diagnostics');
    expect(booked).toHaveTextContent('Booking LAB12345');
    expect(booked).toHaveTextContent('Block B · room 214');
    expect(booked).toHaveTextContent('Paid ₹649 · test payment');
    fireEvent.click(screen.getByRole('button', { name: 'View booking' }));
    expect(onViewBooking).toHaveBeenCalled();

    const post = calls.find(call => call.path === '/lab-orders' && call.init?.method === 'POST');
    expect(JSON.parse(String(post?.init?.body))).toEqual({
      catalogItemId: 'vit-d', slotId: 's-a', collectionMode: 'HOSTEL', hostelBlock: 'Block B', hostelRoom: '214',
    });
    expect((post?.init?.headers as Record<string, string>)['Idempotency-Key']).toBeTruthy();
  });

  it('checks the address before holding anything', async () => {
    const { calls } = setup({ 'GET /lab-tests/vit-d/booking-options': OPTIONS });
    await screen.findByText('Pick a collection slot');
    fireEvent.click(screen.getByRole('radio', { name: 'My home address' }));
    fireEvent.change(screen.getByTestId('lab-booking-pincode'), { target: { value: '012345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and pay ₹649' }));
    expect(await screen.findByText('Choose a collection time.')).toBeInTheDocument();
    expect(screen.getByText('Enter the address where the sample should be collected.')).toBeInTheDocument();
    expect(screen.getByText('Enter a 6-digit pincode.')).toBeInTheDocument();
    expect(calls.some(call => call.path === '/lab-orders')).toBe(false);
  });

  it('says so when the time was just taken, and offers what is still open', async () => {
    let optionsCalls = 0;
    setup({
      'GET /lab-tests/vit-d/booking-options': () => { optionsCalls += 1; return optionsCalls === 1 ? OPTIONS : { ...OPTIONS, slots: [] }; },
      'POST /lab-orders': new ApiError('That time was just taken. Choose another.', 409),
    }, '');
    await screen.findByText('Pick a collection slot');
    expect(screen.queryByTestId('lab-booking-prep')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /2 left/ }));
    fireEvent.click(screen.getByRole('radio', { name: /walk in/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and pay ₹649' }));
    expect(await screen.findByTestId('lab-booking-error')).toHaveTextContent('That time was just taken. Choose another.');
    await waitFor(() => expect(screen.queryAllByRole('radio', { name: /left/ })).toHaveLength(0));
  });

  it('is honest when online payment is not connected', async () => {
    setup({
      'GET /lab-tests/vit-d/booking-options': { ...OPTIONS, homeCollection: false },
      'POST /lab-orders': new ApiError("Online payment isn't connected yet, so lab tests can't be booked here. Nothing was booked or charged.", 503),
    });
    await screen.findByText('Pick a collection slot');
    expect(screen.queryByRole('radio', { name: 'My hostel room' })).not.toBeInTheDocument();
    expect(screen.getByText('Vijaya Diagnostics takes walk-in visits only for this test.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /2 left/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and pay ₹649' }));
    expect(await screen.findByTestId('lab-booking-error')).toHaveTextContent('Nothing was booked or charged.');
  });

  it('does not claim the booking reached the lab until the server says BOOKED', async () => {
    const { vm } = setup({
      'GET /lab-tests/vit-d/booking-options': OPTIONS,
      'GET /lab-orders?limit=20': { items: [BOOKING], total: 1 },
    });
    await screen.findByText('Pick a collection slot');
    vm.booking = { ...BOOKING, collectionMode: 'HOSTEL' };
    await vm.confirm();
    expect(await screen.findByTestId('lab-booking-confirm-pending')).toHaveTextContent("Don’t pay again.");
    expect(screen.queryByTestId('lab-booking-booked')).not.toBeInTheDocument();
  });

  it('shows the empty and error states', async () => {
    setup({ 'GET /lab-tests/vit-d/booking-options': { ...OPTIONS, slots: [] } });
    expect(await screen.findByText('No collection times open')).toBeInTheDocument();
  });

  it('shows a calm error when the times cannot load', async () => {
    setup({ 'GET /lab-tests/vit-d/booking-options': new ApiError('Bad gateway', 502) });
    expect(await screen.findByText('Couldn’t load collection times')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('shows no result or report anywhere in the booking', async () => {
    setup({ 'GET /lab-tests/vit-d/booking-options': OPTIONS });
    await screen.findByText('Pick a collection slot');
    expect(document.body.textContent).not.toMatch(/result|report/i);
  });
});
