import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/services/http';
import { PaymentRepository } from '@/features/payments/data/PaymentRepository';
import { PayStepViewModel } from '@/features/payments/viewmodel/PayStepViewModel';
import { LabBookingRepository } from '../../data/LabBookingRepository';
import { LabBookingViewModel } from '../../viewmodel/LabBookingViewModel';
import { PACKAGE, SLOTS, booking } from '../../viewmodel/__tests__/labFixtures';
import { LabBookingFlow } from '../LabBookingFlow';

type Requester = typeof import('@/data/services/http').apiRequest;

const PAY = '/lab-orders/order-abcdef12/payment';
const MOCK_START = {
  configured: true, status: 'CREATED', intentId: 'pi_1', provider: 'mock', testMode: true,
  providerOrderId: 'mock_order_1', amountPaise: 64900, currency: 'INR', expiresAt: 0,
  payable: { kind: 'lab_order', id: 'order-abcdef12' }, checkout: { testCards: [] },
};

function renderFlow(routes: Record<string, unknown>) {
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    const answer = routes[`${init?.method ?? 'GET'} ${path}`];
    if (answer instanceof Error) throw answer;
    return answer;
  }) as unknown as Requester;
  const vm = new LabBookingViewModel(new LabBookingRepository(request),
    (id, amount) => new PayStepViewModel(id, amount, new PaymentRepository(request, '/lab-orders')));
  const links = { onExit: vi.fn(), onReports: vi.fn(), onViewBooking: vi.fn() };
  render(<LabBookingFlow viewModel={vm} studentName="Krishna C." links={links} />);
  void vm.load();
  return { vm, links };
}

const routes = {
  'GET /lab-packages': { items: [PACKAGE] },
  'GET /lab-packages/pkg/slots': { slots: SLOTS },
  'POST /lab-bookings': booking('UNPAID'),
  [`POST ${PAY}`]: MOCK_START,
  [`POST ${PAY}/mock-checkout`]: { providerOrderId: 'mock_order_1', providerPaymentId: 'mock_pay_1', signature: 'sig', outcome: 'captured', errorCode: '', testMode: true },
  [`POST ${PAY}/verify`]: { outcome: 'PAID', paymentStatus: 'PAID', provider: 'mock', testMode: true, amountPaise: 64900, paymentDueAt: null, payments: [] },
  'GET /lab-bookings/order-abcdef12': booking('PAID'),
};

async function bookThroughSheet() {
  fireEvent.click(await screen.findByRole('button', { name: 'Book Vitamin D + B12, ₹649' }));
  expect(await screen.findByTestId('lab-fasting-note')).toHaveTextContent('Needs 10 hours fasting. Water is fine.');
  await screen.findByTestId('lab-slot-s-am');
  fireEvent.change(screen.getByLabelText('Hostel block'), { target: { value: 'Block B' } });
  fireEvent.change(screen.getByLabelText('Room'), { target: { value: '214' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and pay ₹649' }));
}

describe('LabBookingFlow', () => {
  it('lists each test with its price, fasting tag and test count, never a value', async () => {
    renderFlow(routes);
    const row = await screen.findByTestId('lab-package-pkg');
    expect(row).toHaveTextContent('Vitamin D + B12');
    expect(row).toHaveTextContent('FASTING');
    expect(row).toHaveTextContent('2 tests · report in 24 hours');
    expect(row).toHaveTextContent('₹649');
    expect(row).toHaveTextContent('35% off');
    expect(screen.queryByText(/NABL/)).not.toBeInTheDocument();
    expect(screen.queryByText(/range|ng\/mL|pg\/mL/i)).not.toBeInTheDocument();
  });

  it('books a slot at the hostel, pays on the test gateway and shows the booking', async () => {
    const { links } = renderFlow(routes);
    await bookThroughSheet();
    expect(await screen.findByTestId('pay-step')).toBeInTheDocument();
    expect(screen.getByTestId('pay-test-badge')).toHaveTextContent('Test payment');
    fireEvent.click(screen.getByRole('button', { name: 'Pay ₹649 · test' }));
    expect(await screen.findByText('Lab test booked')).toBeInTheDocument();
    expect(screen.getByText('Demo Diagnostics')).toBeInTheDocument();
    expect(screen.getByText('Krishna C.')).toBeInTheDocument();
    expect(screen.getByText('Block B · room 214')).toBeInTheDocument();
    expect(screen.getByText('Test payment ₹649')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Receipt, not available yet' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Show more details' }));
    expect(screen.getByTestId('result-more')).toHaveTextContent('Reviewed by a doctor before you see it, about 24 hours');
    fireEvent.click(screen.getByRole('button', { name: 'View booking' }));
    expect(links.onViewBooking).toHaveBeenCalled();
  });

  it('a declined test card stays on Pay with nothing booked as paid', async () => {
    renderFlow({ ...routes,
      [`POST ${PAY}/mock-checkout`]: { providerOrderId: 'mock_order_1', providerPaymentId: 'mock_pay_2', signature: 's', outcome: 'failed', errorCode: 'card_declined', testMode: true },
      [`POST ${PAY}/verify`]: { outcome: 'FAILED', paymentStatus: 'UNPAID', provider: 'mock', testMode: true, amountPaise: 64900, paymentDueAt: null, payments: [] },
    });
    await bookThroughSheet();
    fireEvent.click(await screen.findByRole('radio', { name: /Bank declines the payment/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Pay ₹649 · test' }));
    expect(await screen.findByTestId('pay-failed')).toHaveTextContent('Your bank declined it. Nothing was charged.');
    expect(screen.queryByText('Lab test booked')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry ₹649' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try another method' })).toBeInTheDocument();
    expect(screen.queryByTestId('result-confetti')).not.toBeInTheDocument();
  });

  it('Pay goes back to the slot, not to delivery', async () => {
    renderFlow(routes);
    await bookThroughSheet();
    fireEvent.click(await screen.findByRole('button', { name: 'Back to the slot' }));
    expect(await screen.findByTestId('lab-packages')).toBeInTheDocument();
  });

  it('a slot that just went is explained in the sheet', async () => {
    renderFlow({ ...routes, 'POST /lab-bookings': new ApiError('taken', 409) });
    await bookThroughSheet();
    expect(await screen.findByTestId('lab-book-error')).toHaveTextContent('That slot just went. Pick another; nothing was charged.');
  });

  it('an expired booking says so instead of celebrating', async () => {
    renderFlow({ ...routes, 'GET /lab-bookings/order-abcdef12': booking('EXPIRED') });
    await bookThroughSheet();
    fireEvent.click(await screen.findByRole('button', { name: 'Pay ₹649 · test' }));
    expect(await screen.findByTestId('lab-result-failed')).toHaveTextContent('This booking is no longer active');
    expect(screen.queryByText('Lab test booked')).not.toBeInTheDocument();
  });

  it('shows the empty state with a way back', async () => {
    const { links } = renderFlow({ 'GET /lab-packages': { items: [] } });
    expect(await screen.findByText('No lab tests to book yet')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Back to the shop' })[0]);
    expect(links.onExit).toHaveBeenCalled();
  });

  it('shows a calm error with a retry when the list fails', async () => {
    renderFlow({ 'GET /lab-packages': new ApiError('down', 502) });
    expect(await screen.findByText('Lab tests didn\'t load')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByTestId('lab-state-error')).toHaveAttribute('role', 'alert');
  });

  it('empty state gives two ways out', async () => {
    const { links } = renderFlow({ 'GET /lab-packages': { items: [] } });
    expect(await screen.findByTestId('lab-state-empty')).toHaveTextContent('Empty');
    fireEvent.click(screen.getByRole('button', { name: 'My reports' }));
    expect(links.onReports).toHaveBeenCalled();
  });

  it('says offline, not broken, when the list fails with no connection', async () => {
    const onLine = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      renderFlow({ 'GET /lab-packages': new ApiError('down', 0) });
      const state = await screen.findByTestId('lab-state-offline');
      expect(state).toHaveTextContent('No connection');
      expect(state).toHaveTextContent('Nothing was booked or charged.');
      expect(screen.getByRole('button', { name: 'Retry now' })).toBeInTheDocument();
      expect(screen.queryByTestId('lab-state-error')).not.toBeInTheDocument();
    } finally {
      onLine.mockRestore();
    }
  });
});
