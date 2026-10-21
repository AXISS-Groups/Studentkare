import { getSetting } from '@/data/services/config';

/** A dialable number: digits, an optional leading +, nothing else (so a stored value can never become another URL). */
const DIALABLE = /^\+?\d{3,15}$/;

/**
 * The order line for "Call to order" / "Call to book" (settings registry
 * `shop.order_line_phone`). Null until one is configured: the boards then show
 * the call option as not available yet and never open a dialler.
 */
export function orderLinePhone(): string | null {
  const raw = getSetting('shop.order_line_phone').replace(/[\s-]/g, '');
  return DIALABLE.test(raw) ? raw : null;
}
