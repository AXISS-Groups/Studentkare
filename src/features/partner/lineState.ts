import type { SkTone } from '@/design-system/primitives';
import type { MessageKey } from '@/i18n';
import type { PartnerRequest, RequestStatus } from './partnerApi';

/**
 * The label and tone of one order line in the partner console. One map for
 * every board that lists lines (VendorHome, VendorConsole), so a state the
 * server adds can't crash one board and not the other.
 *
 * A line the student cancelled stays in the partner's queue as CANCELLED. A
 * state this build doesn't know yet shows a neutral "Status not shown" pill
 * instead of throwing (the console went blank on a cancelled order before).
 */
const STATE: Record<RequestStatus, { key: MessageKey; tone: SkTone }> = {
  ACCEPTED: { key: 'pc.state.accepted', tone: 'action' },
  CANCELLED: { key: 'pc.state.cancelled', tone: 'neutral' },
  COMPLETED: { key: 'pc.state.delivered', tone: 'neutral' },
  DECLINED: { key: 'pc.state.declined', tone: 'neutral' },
  DISPATCHED: { key: 'pc.state.out', tone: 'positive' },
  REQUESTED: { key: 'pc.state.new', tone: 'attention' },
};
/** Placed but not paid: not "New" for the partner until the payment is confirmed. */
const AWAITING_PAYMENT_STATE = { key: 'pc.state.awaitingPayment', tone: 'neutral' } as const;
const UNKNOWN_STATE = { key: 'pc.state.unknown', tone: 'neutral' } as const;

/** Closed lines: nothing left for the partner to do. */
const CLOSED: ReadonlySet<string> = new Set<RequestStatus>(['CANCELLED', 'COMPLETED', 'DECLINED']);

export function isClosedLine(line: Pick<PartnerRequest, 'status'>): boolean {
  return CLOSED.has(line.status);
}

export function lineState(line: Pick<PartnerRequest, 'status' | 'awaitingPayment'>): { key: MessageKey; tone: SkTone } {
  // Only an open request can be waiting for payment; a cancelled one is just cancelled.
  if (line.awaitingPayment && line.status === 'REQUESTED') return AWAITING_PAYMENT_STATE;
  return Object.prototype.hasOwnProperty.call(STATE, line.status) ? STATE[line.status] : UNKNOWN_STATE;
}
