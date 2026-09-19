import { apiRequest } from '../services/http';

export type BillingPlanId = 'FREE' | 'STUDENT_PLUS' | 'CAMPUS' | 'ENTERPRISE';
export interface BillingPlan {
  id: BillingPlanId; name: string; price: number | string; period: string;
  audience: string; benefits: string[]; description: string;
}
export interface BillingReceipt {
  invoiceId: string; amountPaise: number; currency: string; paidAt: number;
  refundedPaise: number; periodStart: number; periodEnd: number;
}
export interface BillingMe {
  effectivePlanId: BillingPlanId; plan: BillingPlan; status: string;
  periodStart: number; periodEnd: number; cancelAtPeriodEnd: boolean;
  checkoutAvailable: boolean;
  organizationPlan: { planId: BillingPlanId; organization: string; periodStart: number; periodEnd: number } | null;
  benefits: { limit: number; used: number };
  receipts: BillingReceipt[];
}
export interface PlanCatalog { plans: BillingPlan[]; checkoutAvailable: boolean; publicKey: string }
export interface EnterpriseInquiry { id: string; organization: string; contactName: string; email: string; seats: number; planId: BillingPlanId; message: string; status: string; createdAt: number }
export interface ContractRecord { id: string; organization: string; planId: BillingPlanId; status: string; seats: number; assigned: string[]; annualAmountPaise: number; amountPaidPaise: number; periodStart: number; periodEnd: number; paymentReference: string }

export const getPlans = () => apiRequest<PlanCatalog>('/billing/plans');
export const getBillingMe = () => apiRequest<BillingMe>('/billing/me');
export const syncSubscription = () => apiRequest<BillingMe>('/billing/subscription/sync', { method: 'POST' });
export const cancelSubscription = () => apiRequest<BillingMe>('/billing/subscription/cancel', { method: 'POST' });

let checkoutLoaded: Promise<void> | null = null;
function loadRazorpayCheckout(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).Razorpay) return Promise.resolve();
  if (!checkoutLoaded) {
    checkoutLoaded = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('The payment checkout could not be loaded.'));
      document.head.appendChild(script);
    });
  }
  return checkoutLoaded;
}

/**
 * Opens Razorpay Checkout for the Student Plus subscription, then reports the
 * authorized payment back to the server for verification. Membership is only
 * granted server-side once a paid invoice reconciles.
 */
export async function openSubscriptionCheckout(opts: {
  key: string; subscriptionId: string; amountPaise: number; name: string; email: string; phone: string;
}): Promise<{ verified: boolean; subscriptionId: string; paymentId: string }> {
  await loadRazorpayCheckout();
  const Razorpay = (window as any).Razorpay;
  if (!Razorpay) throw new Error('The payment checkout is unavailable.');
  return new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key: opts.key,
      subscription_id: opts.subscriptionId,
      amount: opts.amountPaise,
      currency: 'INR',
      name: 'Studentkare',
      description: 'Student Plus membership',
      prefill: { name: opts.name, email: opts.email, contact: opts.phone },
      theme: { color: '#7c3aed' },
      handler: async (response: { razorpay_subscription_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        try {
          await apiRequest('/billing/subscription/verify', {
            method: 'POST',
            body: JSON.stringify({ razorpay_subscription_id: response.razorpay_subscription_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }),
          });
          resolve({ verified: true, subscriptionId: response.razorpay_subscription_id, paymentId: response.razorpay_payment_id });
        } catch (reason) {
          reject(reason instanceof Error ? reason : new Error('The payment could not be verified.'));
        }
      },
      modal: { ondismiss: () => reject(new Error('Checkout was dismissed.')) },
    });
    checkout.open();
  });
}
