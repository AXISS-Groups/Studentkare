import { makeAutoObservable, runInAction } from 'mobx';
import type { ViewModel } from '@/core/store/ViewModel';
import type { Said } from '@/i18n';
import { ApiError } from '@/data/services/http';
import { Resource } from '@/features/m2health/resource';
import { lastPayMethod } from '@/features/payments/data/payMethodMemory';
import { PayStepViewModel, type PayMethod } from '@/features/payments/viewmodel/PayStepViewModel';
import { refillsApi, type QuoteLine, type RefillsApi, type ReorderQuote, type RxStatus } from '../data/refillsApi';
import { refusalCode } from './refillMessages';

/**
 * One-tap reorder (M2Reorder), opened from a refill reminder or the Refills list.
 *
 * - The order is priced again, now, by the server (POST /orders/{id}/reorder-quote):
 *   today's price, MRP and stock, never what was paid last time. The order is
 *   then placed with the total the student saw (`expectedTotalPaise`); if the
 *   price moved in between the server refuses it (PRICE_CHANGED) and the screen
 *   shows the new quote instead of charging it.
 * - Same items, quantities and delivery as the order; the last payment method
 *   used on this device is preselected (the gateway still asks for the rest).
 * - A prescription item is never bought here (the shop refuses them). The
 *   screen asks the clinical side only whether an in-date e-prescription exists
 *   (GET /refill-tracker/rx-status) and routes to sending it to a pharmacist, or
 *   to upload / consult. If that check fails, it fails closed.
 * - Out of stock: tell me when it is back, or ask a pharmacist. Never a substitute.
 *
 * Rule L: the commerce calls carry the order id and item ids only. Nothing about
 * the refill (its label, counts or dates) is sent with them.
 */

export type ReorderPhase = 'review' | 'placing' | 'pay';

function newOrderKey(): string {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `reorder-${random}`;
}

export class ReorderViewModel implements ViewModel {
  readonly quote: Resource<ReorderQuote>;
  readonly rx: Resource<RxStatus>;
  phase: ReorderPhase = 'review';
  online = true;
  method: PayMethod | null = null;
  notice: Said | null = null;
  error: Said | null = null;
  watchBusy: string | null = null;
  payment: PayStepViewModel | null = null;
  /** One key per quote shown: a retry of the same quote cannot place two orders. */
  private orderKey = newOrderKey();
  private disposed = false;

  constructor(
    readonly orderId: string,
    readonly itemIds: string[],
    private readonly api: RefillsApi = refillsApi,
    private readonly makePayment: (orderId: string, amount: number) => PayStepViewModel = (id, amount) => new PayStepViewModel(id, amount),
  ) {
    this.quote = new Resource(() => api.quote(orderId, itemIds));
    this.rx = new Resource(() => api.rxStatus());
    makeAutoObservable<ReorderViewModel, 'api' | 'makePayment' | 'orderKey' | 'disposed'>(this, {
      api: false, makePayment: false, orderKey: false, disposed: false, quote: false, rx: false, orderId: false, itemIds: false,
    }, { autoBind: true });
  }

  async load(): Promise<void> {
    this.disposed = false;
    void lastPayMethod().then((m) => { if (!this.disposed) runInAction(() => { this.method = m; }); });
    await this.refresh();
  }

  /** Price again (also after PRICE_CHANGED), and check prescriptions only when a line needs one. */
  async refresh(): Promise<void> {
    this.orderKey = newOrderKey();
    await this.quote.load();
    if (this.needsPrescription) await this.rx.load();
  }

  setOnline(online: boolean): void {
    this.online = online;
  }

  get lines(): QuoteLine[] {
    return this.quote.data?.lines ?? [];
  }

  get buyable(): QuoteLine[] {
    return this.lines.filter((l) => l.state === 'OK');
  }

  get needsPrescription(): boolean {
    return this.lines.some((l) => l.state === 'PRESCRIPTION');
  }

  /** Fail closed: a valid prescription only when the check completed and found one. */
  get validPrescriptionUntil(): number | null {
    return this.rx.phase === 'ready' && this.rx.data && this.rx.data.validCount > 0 ? this.rx.data.latestValidUntil : null;
  }

  get totalPaise(): number {
    return this.quote.data?.totalPaise ?? 0;
  }

  get canPay(): boolean {
    return this.online && this.phase === 'review' && this.quote.phase === 'ready' && this.buyable.length > 0 && this.totalPaise > 0;
  }

  async place(): Promise<void> {
    const quote = this.quote.data;
    if (!quote || !this.canPay) return;
    this.phase = 'placing';
    this.error = null;
    this.notice = null;
    try {
      const order = await this.api.placeOrder(
        this.buyable.map((l) => ({ id: l.itemId, quantity: l.quantity })), quote.delivery, quote.totalPaise, this.orderKey);
      if (this.disposed) return;
      const payment = this.makePayment(order.id, order.totalPaise);
      if (this.method) payment.setMethod(this.method);
      // PayStepView starts the payment when it mounts.
      runInAction(() => {
        this.payment = payment;
        this.phase = 'pay';
      });
    } catch (error) {
      if (this.disposed) return;
      if (error instanceof ApiError && error.status === 409 && refusalCode(error) === 'PRICE_CHANGED') {
        runInAction(() => { this.phase = 'review'; this.notice = { key: 'reorder.priceChanged' }; });
        await this.refresh();
        return;
      }
      runInAction(() => { this.phase = 'review'; this.error = { key: 'reorder.placeFailed' }; });
    }
  }

  /** Back to the review from a payment that was not finished. */
  backToReview(): void {
    this.payment?.dispose();
    this.payment = null;
    this.phase = 'review';
    void this.refresh();
  }

  async toggleWatch(line: QuoteLine): Promise<void> {
    if (!this.online || this.watchBusy) return;
    this.watchBusy = line.itemId;
    this.error = null;
    try {
      if (line.stockAlert) await this.api.unwatchStock(line.itemId);
      else await this.api.watchStock(line.itemId);
      runInAction(() => {
        const data = this.quote.data;
        if (data) this.quote.set({ ...data, lines: data.lines.map((l) => (l.itemId === line.itemId ? { ...l, stockAlert: !line.stockAlert } : l)) });
      });
    } catch {
      runInAction(() => { this.error = { key: 'refill.status.failed' }; });
    } finally {
      runInAction(() => { this.watchBusy = null; });
    }
  }

  dispose(): void {
    this.disposed = true;
    this.quote.cancel();
    this.rx.cancel();
    this.payment?.dispose();
  }

  reset(): void {
    this.dispose();
    this.payment = null;
    this.phase = 'review';
  }
}
