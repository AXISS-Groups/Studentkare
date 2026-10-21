import type { MessageKey } from '@/i18n';

/**
 * Small, shared wording helpers for the WP-15 partner pages. Every word comes
 * from the catalogue (src/i18n/areas/partnerWork.ts); status codes from the
 * server are mapped, never shown raw.
 */

export { useOnline } from '@/design-system/States';

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

const LAB_STATUS: Record<string, { state: MessageKey; action: MessageKey }> = {
  BOOKED: { state: 'pt.lab.status.BOOKED', action: 'pt.lab.status.BOOKED' },
  ASSIGNED: { state: 'pt.lab.status.ASSIGNED', action: 'pt.lab.do.ASSIGNED' },
  SAMPLE_COLLECTED: { state: 'pt.lab.status.SAMPLE_COLLECTED', action: 'pt.lab.do.SAMPLE_COLLECTED' },
  IN_TRANSIT: { state: 'pt.lab.status.IN_TRANSIT', action: 'pt.lab.do.IN_TRANSIT' },
  RECEIVED_AT_LAB: { state: 'pt.lab.status.RECEIVED_AT_LAB', action: 'pt.lab.do.RECEIVED_AT_LAB' },
  IN_ANALYSIS: { state: 'pt.lab.status.IN_ANALYSIS', action: 'pt.lab.do.IN_ANALYSIS' },
  REPORT_READY: { state: 'pt.lab.status.REPORT_READY', action: 'admin.fulfil.fileReport' },
  REPORT_RELEASED: { state: 'pt.lab.status.REPORT_RELEASED', action: 'pt.lab.status.REPORT_RELEASED' },
  SAMPLE_REJECTED: { state: 'pt.lab.status.SAMPLE_REJECTED', action: 'pt.lab.do.SAMPLE_REJECTED' },
  RECOLLECTION_REQUIRED: { state: 'pt.lab.status.RECOLLECTION_REQUIRED', action: 'pt.lab.do.RECOLLECTION_REQUIRED' },
  CANCELLED: { state: 'pt.lab.status.CANCELLED', action: 'pt.lab.do.CANCELLED' },
};

/** The readable name of a lab order state, or of the step that moves an order into it. */
export function labStatusKey(status: string, form: 'state' | 'action' = 'state'): MessageKey {
  return LAB_STATUS[status]?.[form] ?? 'pt.status.unknown';
}

const DISPENSE_STATUS: Record<string, MessageKey> = {
  RX_ISSUED: 'pt.rx.status.RX_ISSUED',
  RX_VERIFIED: 'pt.rx.status.RX_VERIFIED',
  SUBSTITUTION_PROPOSED: 'pt.rx.status.SUBSTITUTION_PROPOSED',
  ACCEPTED: 'pt.rx.status.ACCEPTED',
  PARTIALLY_ACCEPTED: 'pt.rx.status.PARTIALLY_ACCEPTED',
  PACKED: 'pt.rx.status.PACKED',
  OUT_FOR_DELIVERY: 'pt.rx.status.OUT_FOR_DELIVERY',
  DELIVERED: 'pt.rx.status.DELIVERED',
  REJECTED: 'pt.rx.status.REJECTED',
  CANCELLED: 'pt.rx.status.CANCELLED',
  RETURNED: 'pt.rx.status.RETURNED',
};

export function dispenseStatusKey(status: string): MessageKey {
  return DISPENSE_STATUS[status] ?? 'pt.status.unknown';
}

/** "4 min ago", "3 h ago", "2 d ago" from an epoch in seconds; "—" without one. */
export function minutesAgo(t: Translate, epochSeconds: number | null | undefined, now: number = Date.now()): string {
  if (!epochSeconds) return '—';
  const minutes = Math.max(0, Math.round((now / 1000 - epochSeconds) / 60));
  if (minutes < 60) return t('pt.ago.minutes', { count: minutes });
  if (minutes < 1440) return t('pt.ago.hours', { count: Math.floor(minutes / 60) });
  return t('pt.ago.days', { count: Math.floor(minutes / 1440) });
}

/** A clock time ("16:04") from an epoch in seconds or milliseconds. */
export function clockTime(epoch: number, unit: 's' | 'ms' = 's'): string {
  const ms = unit === 's' ? epoch * 1000 : epoch;
  return new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** "30 Sep" from an epoch in seconds. */
export function shortDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Initials of a name, never the name itself. */
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || '—';
}
