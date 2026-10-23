import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/services/http';
import { CheckoutDismissed } from '@/data/services/razorpayCheckout';
import { PaymentRepository } from '../../data/PaymentRepository';
import { PayStepViewModel } from '../PayStepViewModel';

type Requester = typeof import('@/data/services/http').apiRequest;
type OpenCheckout = typeof import('@/data/services/razorpayCheckout').openRazorpay;

const ORDER = 'ord_12345678abcd';
const MOCK_START = {
  configured: true, status: 'CREATED', intentId: 'pi_1', provider: 'mock', testMode: true,
  providerOrderId: 'mock_order_1', amountPaise: 45000, currency: 'INR', expiresAt: 0,
  payable: { kind: 'shop_order', id: ORDER }, checkout: { testCards: [] },
};
const RZP_START = { ...MOCK_START, provider: 'razorpay', testMode: false, providerOrderId: 'order_RZP1', checkout: { keyId: 'rzp_test_key' } };
const statusOf = (paymentStatus: string, outcome?: string) => ({
  outcome, paymentStatus, provider: 'mock', testMode: true, amountPaise: 45000, paymentDueAt: null, payments: [],
});

/** A fake server: each path answers from the map (a function is called with the body). */
function server(routes: Record<string, unknown>) {
  return vi.fn(async (path: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${path}`;
    const answer = routes[key];
    if (answer instanceof Error) throw answer;
    if (typeof answer === 'function') return (answer as (body: unknown) => unknown)(init?.body ? JSON.parse(String(init.body)) : undefined);
    if (answer === undefined) throw new Error(`unexpected ${key}`);
    return answer;
  }) as unknown as Requester & ReturnType<typeof vi.fn>;
}

const base = `/orders/${ORDER}/payment`;

function viewModel(routes: Record<string, unknown>, openCheckout?: OpenCheckout) {
  const request = server(routes);
  const vm = new PayStepViewModel(ORDER, 45000, new PaymentRepository(request), openCheckout);
  return { vm, request };
}

describe('PayStepViewModel', () => {
  it('says plainly when no provider is connected, and charges nothing', async () => {
    const { vm } = viewModel({ [`POST ${base}`]: { configured: false, status: 'UNAVAILABLE', provider: '', message: '' } });
    await vm.start();
    expect(vm.phase).toBe('unavailable');
    expect(vm.payment).toBeNull();
  });

  it('pays through the labelled mock: test card, then the server verifies', async () => {
    const mockCheckout = vi.fn(() => ({ providerOrderId: 'mock_order_1', providerPaymentId: 'mock_pay_1', signature: 'sig', outcome: 'captured', errorCode: '', testMode: true }));
    const verify = vi.fn(() => statusOf('PAID', 'PAID'));
    const { vm } = viewModel({ [`POST ${base}`]: MOCK_START, [`POST ${base}/mock-checkout`]: mockCheckout, [`POST ${base}/verify`]: verify });
    await vm.start();
    expect(vm.phase).toBe('ready');
    expect(vm.testMode).toBe(true);
    await vm.pay();
    expect(mockCheckout).toHaveBeenCalledWith({ providerOrderId: 'mock_order_1', cardNumber: '4111111111111111' });
    expect(verify).toHaveBeenCalledWith({ providerOrderId: 'mock_order_1', providerPaymentId: 'mock_pay_1', signature: 'sig' });
    expect(vm.phase).toBe('paid');
  });

  it('shows a decline, then lets the student retry on the same provider order', async () => {
    const mockCheckout = vi.fn(() => ({ providerOrderId: 'mock_order_1', providerPaymentId: 'mock_pay_2', signature: 's', outcome: 'failed', errorCode: 'card_declined', testMode: true }));
    const { vm } = viewModel({ [`POST ${base}`]: MOCK_START, [`POST ${base}/mock-checkout`]: mockCheckout, [`POST ${base}/verify`]: statusOf('UNPAID', 'FAILED') });
    await vm.start();
    vm.setTestCard('declined');
    await vm.pay();
    expect(mockCheckout).toHaveBeenCalledWith({ providerOrderId: 'mock_order_1', cardNumber: '4000000000000002' });
    expect(vm.phase).toBe('failed');
    expect(vm.error).toBe('pay.failed.declined');
    vm.tryAgain();
    expect(vm.phase).toBe('ready');
    expect(vm.payment?.providerOrderId).toBe('mock_order_1');
  });

  it('treats a rejected signature as a failure, never as paid', async () => {
    const { vm } = viewModel({
      [`POST ${base}`]: MOCK_START,
      [`POST ${base}/mock-checkout`]: { providerOrderId: 'mock_order_1', providerPaymentId: 'p', signature: 'bad', outcome: 'captured', errorCode: '', testMode: true },
      [`POST ${base}/verify`]: new ApiError('Payment verification failed.', 400),
    });
    await vm.start();
    await vm.pay();
    expect(vm.phase).toBe('failed');
    expect(vm.error).toBe('pay.failed.verify');
  });

  it('opens Razorpay with the server amount and the chosen method, sending no item names', async () => {
    const open = vi.fn(async () => ({ razorpay_order_id: 'order_RZP1', razorpay_payment_id: 'pay_RZP1', razorpay_signature: 'sig', razorpay_subscription_id: '' })) as unknown as OpenCheckout & ReturnType<typeof vi.fn>;
    const verify = vi.fn(() => statusOf('PAID', 'PAID'));
    const { vm } = viewModel({ [`POST ${base}`]: RZP_START, [`POST ${base}/verify`]: verify }, open);
    await vm.start();
    vm.setMethod('card');
    await vm.pay();
    expect(open).toHaveBeenCalledWith(expect.objectContaining({
      key: 'rzp_test_key', order_id: 'order_RZP1', amount: 45000, currency: 'INR', description: 'Order ORD_1234', prefill: { method: 'card' },
    }));
    expect(verify).toHaveBeenCalledWith({ providerOrderId: 'order_RZP1', providerPaymentId: 'pay_RZP1', signature: 'sig' });
    expect(vm.phase).toBe('paid');
  });

  it('goes back to choosing when the Razorpay window is closed', async () => {
    const open = vi.fn(async () => { throw new CheckoutDismissed(); }) as unknown as OpenCheckout;
    const { vm } = viewModel({ [`POST ${base}`]: RZP_START }, open);
    await vm.start();
    await vm.pay();
    expect(vm.phase).toBe('ready');
    expect(vm.notice).toBe('pay.notice.dismissed');
  });

  it('does not invite a second payment when the verify call is lost', async () => {
    const { vm } = viewModel({
      [`POST ${base}`]: MOCK_START,
      [`POST ${base}/mock-checkout`]: { providerOrderId: 'mock_order_1', providerPaymentId: 'p', signature: 's', outcome: 'captured', errorCode: '', testMode: true },
      [`POST ${base}/verify`]: new TypeError('Failed to fetch'),
      [`GET ${base}`]: statusOf('PAID'),
    });
    await vm.start();
    await vm.pay();
    expect(vm.phase).toBe('pending');
    await vm.checkStatus();
    expect(vm.phase).toBe('paid');
  });

  it('reports a late capture, an expired order and a server failure honestly', async () => {
    const late = viewModel({
      [`POST ${base}`]: MOCK_START,
      [`POST ${base}/mock-checkout`]: { providerOrderId: 'mock_order_1', providerPaymentId: 'p', signature: 's', outcome: 'captured', errorCode: '', testMode: true },
      [`POST ${base}/verify`]: statusOf('EXPIRED', 'LATE'),
    }).vm;
    await late.start();
    await late.pay();
    expect(late.phase).toBe('late');

    const expired = viewModel({ [`POST ${base}`]: new ApiError('This order was not paid in time.', 409), [`GET ${base}`]: statusOf('EXPIRED') }).vm;
    await expired.start();
    expect(expired.phase).toBe('closed');

    const down = viewModel({ [`POST ${base}`]: new ApiError('Bad gateway', 502) }).vm;
    await down.start();
    expect(down.phase).toBe('error');
    expect(down.error).toBe('pay.error.start');
    expect(down.reference).toBe('ORD_1234');
  });
});

describe('one payment per Pay step (live-run audit #9)', () => {
  it('a second start while one is in flight (StrictMode) sends no second request', async () => {
    const { vm, request } = viewModel({ [`POST ${base}`]: MOCK_START });
    await Promise.all([vm.start(), vm.start()]);
    expect(request.mock.calls.filter(([path, init]) => path === base && init?.method === 'POST')).toHaveLength(1);
    expect(vm.phase).toBe('ready');
  });

  it('sends one Idempotency-Key for the Pay step, the same on every try', async () => {
    const { vm, request } = viewModel({ [`POST ${base}`]: MOCK_START });
    await vm.start();
    vm.dispose();
    await vm.start();
    const keys = request.mock.calls.filter(([path]) => path === base)
      .map(([, init]) => new Headers((init as RequestInit).headers).get('Idempotency-Key'));
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^pay-/);
    expect(keys[1]).toBe(keys[0]);
  });
});

