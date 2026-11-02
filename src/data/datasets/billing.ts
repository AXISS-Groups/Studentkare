import { apiRequest } from '../services/http';
import { openRazorpay } from '../services/razorpayCheckout';
import { skTokens } from '../../theme/tokens/generated/skTokens';

export type BillingPlanId = 'FREE' | 'STUDENT_PLUS' | 'PREMIUM' | 'CAMPUS' | 'ENTERPRISE';
/** A prepaid bundle of a plan (Student Plus 3-month package). `price` is whole rupees. */
export interface BillingPackage { id: string; months: number; price: number }
/**
 * A plan from GET /billing/plans. A numeric `price` is whole rupees from the
 * server's settings registry; `priceFrom` marks a starting price, which must
 * always be shown as "from".
 */
export interface BillingPlan {
  id: BillingPlanId; name: string; price: number | string; period: string;
  audience: string; benefits: string[]; description: string;
  priceFrom?: boolean; packages?: BillingPackage[];
}
interface BillingReceipt {
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

/**
 * Opens Razorpay Checkout for the Student Plus subscription, then reports the
 * authorized payment back to the server for verification. Membership is only
 * granted server-side once a paid invoice reconciles.
 */
export async function openSubscriptionCheckout(opts: {
  key: string; subscriptionId: string; amountPaise: number; name: string; email: string; phone: string;
}): Promise<{ verified: boolean; subscriptionId: string; paymentId: string }> {
  const response = await openRazorpay({
    key: opts.key,
    subscription_id: opts.subscriptionId,
    amount: opts.amountPaise,
    currency: 'INR',
    name: 'Studentkare',
    description: 'Student Plus membership',
    prefill: { name: opts.name, email: opts.email, contact: opts.phone },
    // Razorpay draws its own light sheet and needs a literal colour, not a CSS variable.
    theme: { color: skTokens.color.light.action },
  });
  try {
    await apiRequest('/billing/subscription/verify', {
      method: 'POST',
      body: JSON.stringify({ razorpay_subscription_id: response.razorpay_subscription_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }),
    });
  } catch (reason) {
    throw reason instanceof Error ? reason : new Error('The payment could not be verified.');
  }
  return { verified: true, subscriptionId: response.razorpay_subscription_id, paymentId: response.razorpay_payment_id };
}
