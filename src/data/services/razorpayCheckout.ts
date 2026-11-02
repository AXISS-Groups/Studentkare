/**
 * Razorpay Standard Checkout (https://checkout.razorpay.com/v1/checkout.js), web only.
 *
 * One loader for membership billing and order payments. No Content-Security-Policy
 * header is served today (deploy/nginx.conf); if one is added, it must allow
 * script-src and frame-src https://checkout.razorpay.com and https://api.razorpay.com.
 *
 * The checkout result is never trusted on its own: callers send it to the server,
 * which verifies the signature and asks Razorpay what was actually paid.
 */

const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

export interface RazorpayOrderSuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpaySubscriptionSuccess {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  order_id?: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string; method?: 'upi' | 'card' | 'netbanking' };
  theme?: { color: string };
  handler: (response: RazorpayOrderSuccess & RazorpaySubscriptionSuccess) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance { open: () => void }
type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

function razorpayGlobal(): RazorpayConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
}

let loading: Promise<void> | null = null;

function loadRazorpayCheckout(): Promise<void> {
  if (razorpayGlobal()) return Promise.resolve();
  if (typeof document === 'undefined') return Promise.reject(new Error('The payment checkout is only available on the web.'));
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = RAZORPAY_CHECKOUT_SRC;
      script.onload = () => resolve();
      script.onerror = () => { loading = null; reject(new Error('The payment checkout could not be loaded.')); };
      document.head.appendChild(script);
    });
  }
  return loading;
}

/** Thrown when the student closes the Razorpay window without paying. */
export class CheckoutDismissed extends Error {
  constructor() { super('Checkout was dismissed.'); this.name = 'CheckoutDismissed'; }
}

/** Opens Checkout and resolves once Razorpay hands back a payment (unverified). */
export async function openRazorpay(options: Omit<RazorpayOptions, 'handler' | 'modal'>): Promise<RazorpayOrderSuccess & RazorpaySubscriptionSuccess> {
  await loadRazorpayCheckout();
  const Razorpay = razorpayGlobal();
  if (!Razorpay) throw new Error('The payment checkout is unavailable.');
  return new Promise((resolve, reject) => {
    new Razorpay({
      ...options,
      handler: resolve,
      modal: { ondismiss: () => reject(new CheckoutDismissed()) },
    }).open();
  });
}
