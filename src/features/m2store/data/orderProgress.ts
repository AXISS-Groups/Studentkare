import type { LiveOrder } from '@/data/types/workflowTypes';
import type { MessageKey } from '@/i18n';
import { isActive, orderState, trackSteps } from '@/features/orders/viewmodel/OrdersViewModel';
import type { OrderState, TrackStep } from '@/features/orders/viewmodel/OrdersViewModel';

/**
 * Mobile 2.0 Orders (M2Orders): what the board says about an order, from the
 * order API only (GET /orders: line states, payment state, delivery mode).
 * There is no rider, no location and no arrival estimate in the platform, so
 * nothing here claims one: the "route" is the order's steps drawn left to
 * right, and the headline says the step, never a time.
 */

export type M2OrdersTab = 'active' | 'past';

/** The tab the board opens on: Active when something is still going, else Past. */
export function initialTab(items: readonly LiveOrder[]): M2OrdersTab {
  return items.some(isActive) ? 'active' : 'past';
}

/** Whether the order has goods that travel (the route band is drawn only for those). */
export const hasGoods = (order: LiveOrder): boolean => order.lines.some((l) => l.kind === 'product');

export type StepShow = 'done' | 'now' | 'todo';

export interface RouteProgress {
  steps: TrackStep[];
  /** How each step is drawn: done, the one happening now, or still to come. */
  show: StepShow[];
  /** 0-based index of the step happening now (the last when the order has ended). */
  at: number;
  /** Where the marker sits along the band, 0 to 1. */
  fraction: number;
  /** The order has been handed over and is on its way (the scooter is drawn only then). */
  moving: boolean;
  /** Every step is done. */
  finished: boolean;
}

/**
 * The step happening now is the last one the server says is done (packed,
 * on its way), except while the order waits for the student's payment, when
 * it is the payment step. Later steps are still to come.
 */
export function routeProgress(order: LiveOrder): RouteProgress {
  const steps = trackSteps(order);
  const finished = steps.every((s) => s.state === 'done');
  const paidStep = steps.findIndex((s) => s.key === 'paid' && s.state === 'active');
  let lastDone = -1;
  steps.forEach((s, i) => { if (s.state === 'done') lastDone = i; });
  const at = finished ? steps.length - 1 : paidStep >= 0 ? paidStep : Math.max(lastDone, 0);
  const show: StepShow[] = steps.map((_, i) => (finished || i < at ? 'done' : i === at ? 'now' : 'todo'));
  const fraction = steps.length > 1 ? at / (steps.length - 1) : 1;
  const state = orderState(order);
  return { steps, show, at, fraction, finished, moving: state === 'dispatched' && order.delivery.mode === 'delivery' };
}

/** Where a delivery goes, as the student typed it at checkout ('' when unknown). */
function deliveryPlace(order: LiveOrder): string {
  return (order.delivery.address || order.delivery.city || '').trim();
}

/** The card's headline: the step in words, with no time. */
export function headline(order: LiveOrder): { key: MessageKey; vars?: Record<string, string> } {
  const state = orderState(order);
  switch (state) {
    case 'awaitingPayment': return { key: 'm2.ord.head.awaitingPayment' };
    case 'requested': return { key: 'm2.ord.head.requested' };
    case 'accepted': return { key: hasGoods(order) ? 'm2.ord.head.acceptedProduct' : 'm2.ord.head.acceptedService' };
    case 'dispatched': {
      if (order.delivery.mode === 'pickup') return { key: 'm2.ord.head.dispatchedPickup' };
      const place = deliveryPlace(order);
      return place ? { key: 'm2.ord.head.dispatchedTo', vars: { place } } : { key: 'm2.ord.head.dispatched' };
    }
    case 'completed': return { key: 'm2.ord.head.completed' };
    case 'declined': return { key: 'm2.ord.head.declined' };
    case 'cancelled': return { key: 'm2.ord.head.cancelled' };
  }
}

/** The pill on a past order: delivered, picked up or done (a service), else its end state. */
export function pastLabel(order: LiveOrder): MessageKey {
  const state = orderState(order);
  if (state === 'cancelled') return 'phone.orders.state.cancelled';
  if (state === 'declined') return 'phone.orders.state.declined';
  if (state !== 'completed') return `phone.orders.state.${state}` as MessageKey;
  if (!hasGoods(order)) return 'm2.ord.past.done';
  return order.delivery.mode === 'delivery' ? 'm2.ord.past.delivered' : 'm2.ord.past.pickedUp';
}

export type PillTone = 'positive' | 'attention' | 'action' | 'danger' | 'neutral';

/** The status pill's colour role for each state (red only for a declined order). */
export const STATE_TONE: Readonly<Record<OrderState, PillTone>> = {
  awaitingPayment: 'attention',
  requested: 'action',
  accepted: 'action',
  dispatched: 'positive',
  completed: 'positive',
  declined: 'danger',
  cancelled: 'neutral',
};

/** A completed order with goods can be returned (the return request checks each line's window). */
export const canReturn = (order: LiveOrder): boolean => orderState(order) === 'completed' && hasGoods(order);

/** The order includes a lab test (its report lives in My health, never on this board). */
export const hasLab = (order: LiveOrder): boolean => order.lines.some((l) => l.kind === 'lab');
