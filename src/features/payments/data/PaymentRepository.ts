import { apiRequest } from '@/data/services/http';

/**
 * Payments for one payable (backend services/payments.py). A payable is
 * `kind` + `id`: a shop order (`/orders/{id}/payment…`) or a lab test the
 * student booked (`/lab-orders/{id}/payment…`). The amount is always the
 * server's: nothing here sends a price, an item name or anything about
 * health (Rule L).
 */

/** POST /api/orders/{id}/payment */
export type PaymentStart =
  | { configured: false; status: 'UNAVAILABLE'; provider: string; message: string }
  | {
      configured: true;
      status: string;
      intentId: string;
      /** 'mock' or 'razorpay' today; another gateway adds a name, not a shape. */
      provider: string;
      /** The mock gateway: no real money moves. The UI must say so. */
      testMode: boolean;
      providerOrderId: string;
      amountPaise: number;
      currency: string;
      expiresAt: number;
      payable: { kind: string; id: string };
      checkout: { keyId?: string; testCards?: { number: string; outcome: 'captured' | 'failed' }[] };
    };

export type OpenPayment = Extract<PaymentStart, { configured: true }>;

/** POST /api/orders/{id}/payment/mock-checkout — the mock's stand-in for a payment page. */
export interface MockCheckoutResult {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
  outcome: 'captured' | 'failed';
  errorCode: string;
  testMode: true;
}

export type OrderPaymentStatus = 'UNPAID' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'EXPIRED' | 'CANCELLED';

/** GET /api/orders/{id}/payment */
export interface PaymentStatus {
  paymentStatus: OrderPaymentStatus;
  provider: string;
  testMode: boolean;
  amountPaise: number;
  paymentDueAt: number | null;
  payments: { status: string; amountPaise: number; providerRef: string; refundedPaise: number; failureCode: string | null; settledAt: number | null }[];
}

/** POST /api/orders/{id}/payment/verify */
export interface VerifyResult extends PaymentStatus {
  outcome: 'PAID' | 'DUPLICATE' | 'LATE' | 'FAILED' | 'PENDING';
}

export interface PaymentProof {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

/** Where a kind of payable is paid. */
export type PayableBase = '/orders' | '/lab-orders';

export class PaymentRepository {
  constructor(
    private readonly request: typeof apiRequest = apiRequest,
    private readonly base: PayableBase = '/orders',
  ) {}

  private path(id: string, rest = ''): string {
    return `${this.base}/${encodeURIComponent(id)}/payment${rest}`;
  }

  /** `idempotencyKey`: one per Pay step; the server hands the same payment back for it. */
  start(orderId: string, idempotencyKey?: string): Promise<PaymentStart> {
    return this.request<PaymentStart>(this.path(orderId), {
      method: 'POST', ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
    });
  }

  mockCheckout(orderId: string, providerOrderId: string, cardNumber: string): Promise<MockCheckoutResult> {
    return this.request<MockCheckoutResult>(this.path(orderId, '/mock-checkout'), {
      method: 'POST', body: JSON.stringify({ providerOrderId, cardNumber }),
    });
  }

  /** The client's word that it paid. The server checks the signature and asks the provider. */
  verify(orderId: string, proof: PaymentProof): Promise<VerifyResult> {
    return this.request<VerifyResult>(this.path(orderId, '/verify'), {
      method: 'POST', body: JSON.stringify(proof),
    });
  }

  status(orderId: string): Promise<PaymentStatus> {
    return this.request<PaymentStatus>(this.path(orderId));
  }
}

export const paymentRepository = new PaymentRepository();
