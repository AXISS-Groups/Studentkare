import { makeAutoObservable, runInAction } from 'mobx';
import type { MessageKey } from '@/i18n';
import { ApiError } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import { CheckoutDismissed, openRazorpay } from '@/data/services/razorpayCheckout';
import { rememberPayMethod } from '../data/payMethodMemory';
import { paymentRepository, type OpenPayment, type PaymentRepository, type PaymentStatus, type VerifyResult } from '../data/PaymentRepository';

/** Methods the gateway takes. Kare points and cash on delivery are drawn but not offered (not built). */
export type PayMethod = 'upi' | 'card' | 'netbanking';
export type TestCard = 'success' | 'declined';

export type PayPhase =
  | 'starting'     // asking the server for a payment
  | 'unavailable'  // no provider connected: the order stays a request, nothing charged
  | 'ready'        // choose a method and pay
  | 'paying'       // the provider's window is open / the test gateway is answering
  | 'verifying'    // the server is checking with the provider
  | 'paid'
  | 'failed'       // declined; nothing charged; can retry
  | 'pending'      // the provider has not confirmed yet; don't pay again
  | 'late'         // paid after the order was released: support refunds it
  | 'closed'       // expired or cancelled: cannot be paid
  | 'error';       // our side or the network; retry

function newPaymentKey(): string {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `pay-${random}`;
}

const TEST_CARD_NUMBERS: Record<TestCard, string> = {
  success: '4111111111111111',
  declined: '4000000000000002',
};

type OpenCheckout = typeof openRazorpay;

/**
 * The Pay step of checkout (canvas: Payment, SK-063, Tier 2) for one shop order.
 *
 * Nothing on the client decides an order is paid. The provider's result goes
 * to the server, which verifies the signature and asks the provider; the
 * provider's webhook settles it independently. Retrying after a timeout reuses
 * the same provider order, so it cannot charge twice.
 */
export class PayStepViewModel implements ViewModel {
  phase: PayPhase = 'starting';
  payment: OpenPayment | null = null;
  method: PayMethod = 'upi';
  testCard: TestCard = 'success';
  /** A message key (translated by the view), or '' for none. */
  error: MessageKey | '' = '';
  notice: MessageKey | '' = '';
  private disposed = false;
  /** The start in flight: a second start() (StrictMode runs the mount effect twice) joins it. */
  private starting: Promise<void> | null = null;
  /** One key for this Pay step: every start, retry included, asks for the same payment (live-run audit #9). */
  private readonly idempotencyKey = newPaymentKey();

  constructor(
    readonly orderId: string,
    readonly amountPaise: number,
    private readonly repository: PaymentRepository = paymentRepository,
    private readonly openCheckout: OpenCheckout = openRazorpay,
  ) {
    makeAutoObservable<PayStepViewModel, 'disposed' | 'repository' | 'openCheckout' | 'starting' | 'idempotencyKey'>(
      this, { disposed: false, repository: false, openCheckout: false, orderId: false, amountPaise: false, starting: false, idempotencyKey: false },
      { autoBind: true },
    );
  }

  /** The mock gateway: the view labels every part of it as a test payment. */
  get testMode(): boolean {
    return this.payment?.testMode === true;
  }

  get busy(): boolean {
    return this.phase === 'starting' || this.phase === 'paying' || this.phase === 'verifying';
  }

  /** Short order reference for copy and support (never a provider id). */
  get reference(): string {
    return this.orderId.slice(0, 8).toUpperCase();
  }

  setMethod(method: PayMethod): void {
    this.method = method;
  }

  setTestCard(card: TestCard): void {
    this.testCard = card;
  }

  start(): Promise<void> {
    this.disposed = false;
    if (this.starting) return this.starting;
    const run = this.openPayment().finally(() => { this.starting = null; });
    this.starting = run;
    return run;
  }

  private async openPayment(): Promise<void> {
    this.phase = 'starting';
    this.error = '';
    this.notice = '';
    try {
      const res = await this.repository.start(this.orderId, this.idempotencyKey);
      if (this.disposed) return;
      runInAction(() => {
        if (!res.configured) { this.phase = 'unavailable'; return; }
        this.payment = res;
        this.phase = 'ready';
      });
    } catch (error) {
      if (this.disposed) return;
      // 409: already paid, expired or cancelled. Ask what is true rather than guess.
      if (error instanceof ApiError && error.status === 409) { await this.checkStatus(); return; }
      runInAction(() => { this.phase = 'error'; this.error = 'pay.error.start'; });
    }
  }

  async pay(): Promise<void> {
    const payment = this.payment;
    if (!payment || this.busy) return;
    this.phase = 'paying';
    this.error = '';
    this.notice = '';
    try {
      const proof = payment.provider === 'mock'
        ? await this.repository.mockCheckout(this.orderId, payment.providerOrderId, TEST_CARD_NUMBERS[this.testCard])
        : await this.openProvider(payment);
      if (this.disposed) return;
      runInAction(() => { this.phase = 'verifying'; });
      const result = await this.repository.verify(this.orderId, {
        providerOrderId: proof.providerOrderId, providerPaymentId: proof.providerPaymentId, signature: proof.signature,
      });
      if (!this.disposed) this.applyVerify(result);
    } catch (error) {
      if (this.disposed) return;
      runInAction(() => {
        if (error instanceof CheckoutDismissed) { this.phase = 'ready'; this.notice = 'pay.notice.dismissed'; return; }
        if (error instanceof ApiError && error.status === 400) { this.phase = 'failed'; this.error = 'pay.failed.verify'; return; }
        if (error instanceof ApiError && error.status === 409) { this.phase = 'error'; this.error = 'pay.error.mismatch'; return; }
        // We may not know whether money moved: never invite a second payment blind.
        this.phase = this.phase === 'verifying' ? 'pending' : 'error';
        this.error = this.phase === 'pending' ? '' : 'pay.error.provider';
      });
    }
  }

  private async openProvider(payment: OpenPayment) {
    const keyId = payment.checkout.keyId;
    if (!keyId) throw new Error('No checkout key.');
    const res = await this.openCheckout({
      key: keyId,
      order_id: payment.providerOrderId,
      amount: payment.amountPaise,
      currency: payment.currency,
      name: 'Student Kare',
      // Generic on purpose: the gateway is not told what was bought (Rule L).
      description: `Order ${this.reference}`,
      prefill: { method: this.method },
    });
    return { providerOrderId: res.razorpay_order_id, providerPaymentId: res.razorpay_payment_id, signature: res.razorpay_signature };
  }

  private applyVerify(result: VerifyResult): void {
    runInAction(() => {
      if (result.paymentStatus === 'PAID' || result.outcome === 'PAID' || result.outcome === 'DUPLICATE') {
        this.phase = 'paid';
        // The kind of method only (a reorder starts from it); nothing about the order.
        void rememberPayMethod(this.method);
        return;
      }
      if (result.outcome === 'LATE') { this.phase = 'late'; return; }
      if (result.outcome === 'FAILED') { this.phase = 'failed'; this.error = 'pay.failed.declined'; return; }
      this.phase = 'pending';
    });
  }

  /** Re-read the order's payment state from the server (pending, or after a 409). */
  async checkStatus(): Promise<void> {
    this.error = '';
    try {
      const status: PaymentStatus = await this.repository.status(this.orderId);
      if (this.disposed) return;
      runInAction(() => {
        if (status.paymentStatus === 'PAID' || status.paymentStatus === 'PARTIALLY_REFUNDED' || status.paymentStatus === 'REFUNDED') { this.phase = 'paid'; return; }
        if (status.paymentStatus === 'EXPIRED' || status.paymentStatus === 'CANCELLED') { this.phase = 'closed'; return; }
        if (this.phase === 'pending') { this.notice = 'pay.notice.stillPending'; return; }
        this.phase = this.payment ? 'ready' : 'error';
        if (!this.payment) this.error = 'pay.error.start';
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'error'; this.error = 'pay.error.start'; });
    }
  }

  /** After a decline: back to choosing, same provider order. */
  tryAgain(): void {
    this.phase = this.payment ? 'ready' : 'starting';
    this.error = '';
    this.notice = '';
    if (!this.payment) void this.start();
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.phase = 'starting';
    this.payment = null;
    this.method = 'upi';
    this.testCard = 'success';
    this.error = '';
    this.notice = '';
  }
}
