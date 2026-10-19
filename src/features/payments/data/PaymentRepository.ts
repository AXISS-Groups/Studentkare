import { apiRequest } from '@/data/services/http';

/**
 * Order payments (backend services/payments.py). A payable is `kind` + `id`;
 * only shop orders are wired. The amount is always the server's: nothing here
 * sends a price, an item name or anything about health (Rule L).
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

export class PaymentRepository {
  constructor(private readonly request: typeof apiRequest = apiRequest) {}

  start(orderId: string): Promise<PaymentStart> {
    return this.request<PaymentStart>(`/orders/${encodeURIComponent(orderId)}/payment`, { method: 'POST' });
  }

  mockCheckout(orderId: string, providerOrderId: string, cardNumber: string): Promise<MockCheckoutResult> {
    return this.request<MockCheckoutResult>(`/orders/${encodeURIComponent(orderId)}/payment/mock-checkout`, {
      method: 'POST', body: JSON.stringify({ providerOrderId, cardNumber }),
    });
  }

  /** The client's word that it paid. The server checks the signature and asks the provider. */
  verify(orderId: string, proof: PaymentProof): Promise<VerifyResult> {
    return this.request<VerifyResult>(`/orders/${encodeURIComponent(orderId)}/payment/verify`, {
      method: 'POST', body: JSON.stringify(proof),
    });
  }

  status(orderId: string): Promise<PaymentStatus> {
    return this.request<PaymentStatus>(`/orders/${encodeURIComponent(orderId)}/payment`);
  }
}

export const paymentRepository = new PaymentRepository();
