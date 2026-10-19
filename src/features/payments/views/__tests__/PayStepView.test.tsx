import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/services/http';
import { PaymentRepository } from '../../data/PaymentRepository';
import { PayStepViewModel } from '../../viewmodel/PayStepViewModel';
import { PayStepView } from '../PayStepView';

type Requester = typeof import('@/data/services/http').apiRequest;

const ORDER = 'ord_12345678abcd';
const base = `/orders/${ORDER}/payment`;
const MOCK_START = {
  configured: true, status: 'CREATED', intentId: 'pi_1', provider: 'mock', testMode: true,
  providerOrderId: 'mock_order_1', amountPaise: 45000, currency: 'INR', expiresAt: 0,
  payable: { kind: 'shop_order', id: ORDER }, checkout: { testCards: [] },
};
const RZP_START = { ...MOCK_START, provider: 'razorpay', testMode: false, providerOrderId: 'order_RZP1', checkout: { keyId: 'rzp_test_key' } };
const PAID = { outcome: 'PAID', paymentStatus: 'PAID', provider: 'mock', testMode: true, amountPaise: 45000, paymentDueAt: null, payments: [] };

function renderWith(routes: Record<string, unknown>) {
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    const answer = routes[`${init?.method ?? 'GET'} ${path}`];
    if (answer instanceof Error) throw answer;
    return answer;
  }) as unknown as Requester;
  const vm = new PayStepViewModel(ORDER, 45000, new PaymentRepository(request));
  const handlers = { onBack: vi.fn(), onTrack: vi.fn(), onOrders: vi.fn() };
  render(<PayStepView viewModel={vm} {...handlers} />);
  return { vm, ...handlers };
}

describe('PayStepView', () => {
  it('labels the mock gateway as a test payment everywhere it shows', async () => {
    renderWith({ [`POST ${base}`]: MOCK_START });
    expect(await screen.findByTestId('pay-test-note')).toHaveTextContent('This is a test payment');
    expect(screen.getByTestId('pay-test-badge')).toHaveTextContent('Test payment');
    expect(screen.getByRole('radio', { name: /Payment goes through/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Bank declines the payment/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pay ₹450 · test' })).toBeInTheDocument();
    expect(screen.getByTestId('pay-total')).toHaveTextContent('₹450');
  });

  it('shows the gateway methods, with Kare points and cash on delivery not offered', async () => {
    renderWith({ [`POST ${base}`]: RZP_START });
    expect(await screen.findByText('Pay with'.toUpperCase())).toBeInTheDocument();
    expect(screen.queryByTestId('pay-test-badge')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /UPI/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: /Debit or credit card/ }));
    expect(screen.getByRole('radio', { name: /Debit or credit card/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Kare points/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('radio', { name: /Cash on delivery/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Pay ₹450' })).toBeInTheDocument();
    expect(screen.getByText(/never stores your card details/)).toBeInTheDocument();
  });

  it('pays with a test card and offers tracking', async () => {
    const { onTrack } = renderWith({
      [`POST ${base}`]: MOCK_START,
      [`POST ${base}/mock-checkout`]: { providerOrderId: 'mock_order_1', providerPaymentId: 'mock_pay_1', signature: 'sig', outcome: 'captured', errorCode: '', testMode: true },
      [`POST ${base}/verify`]: PAID,
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Pay ₹450 · test' }));
    expect(await screen.findByTestId('pay-paid')).toHaveTextContent('Test payment of ₹450 done');
    expect(screen.getByTestId('pay-paid')).toHaveTextContent('No real money moved.');
    fireEvent.click(screen.getByRole('button', { name: 'Track order' }));
    expect(onTrack).toHaveBeenCalled();
  });

  it('explains a decline and lets the student try again', async () => {
    renderWith({
      [`POST ${base}`]: MOCK_START,
      [`POST ${base}/mock-checkout`]: { providerOrderId: 'mock_order_1', providerPaymentId: 'mock_pay_2', signature: 's', outcome: 'failed', errorCode: 'card_declined', testMode: true },
      [`POST ${base}/verify`]: { ...PAID, outcome: 'FAILED', paymentStatus: 'UNPAID' },
    });
    fireEvent.click(await screen.findByRole('radio', { name: /Bank declines the payment/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Pay ₹450 · test' }));
    const failed = await screen.findByTestId('pay-failed');
    expect(failed).toHaveTextContent('Your bank declined it. Nothing was charged.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Pay ₹450 · test' })).toBeInTheDocument();
  });

  it('says when online payment is not connected', async () => {
    const { onOrders } = renderWith({ [`POST ${base}`]: { configured: false, status: 'UNAVAILABLE', provider: '', message: '' } });
    expect(await screen.findByTestId('pay-unavailable')).toHaveTextContent('Your order ORD_1234 is saved as a request. Nothing was charged.');
    fireEvent.click(screen.getByRole('button', { name: 'Go to my orders' }));
    expect(onOrders).toHaveBeenCalled();
  });

  it('shows a calm error with a reference and a retry', async () => {
    renderWith({ [`POST ${base}`]: new ApiError('Bad gateway', 502) });
    expect(await screen.findByText('Payment didn\'t go through')).toBeInTheDocument();
    expect(screen.getByText(/This is on our side, not yours/)).toBeInTheDocument();
    expect(screen.getByText(/ORD_1234/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('goes back to delivery from the header', async () => {
    const { onBack } = renderWith({ [`POST ${base}`]: MOCK_START });
    fireEvent.click(await screen.findByRole('button', { name: 'Back to delivery' }));
    expect(onBack).toHaveBeenCalled();
  });
});
