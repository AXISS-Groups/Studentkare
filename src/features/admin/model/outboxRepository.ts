import { apiRequest } from '@/data/http';
import type { OutboxMessage, OutboxRequeueResult, OutboxRun } from './types';

/** What GET /v1/admin/notifications/outbox sends for one message (workflow_api.outbox_admin_row). No payload is sent. */
interface RawOutboxEvent {
  id: string;
  eventType?: string | null;
  channel?: string | null;
  recipientMasked?: string | null;
  status?: string | null;
  attempts?: number | null;
  maxAttempts?: number | null;
  createdAt?: number | null;
  sentAt?: number | null;
  lastError?: string | null;
}

interface RawOutboxRun { processed?: number; delivered?: number; failed?: number; deferred?: number; pending?: number }

const HIDDEN = '•••';
const EMAIL = /[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[^\s@<>()"',;:]+/g;
// Seven or more digits, allowing spaces, dashes, dots, brackets and a leading +.
const PHONE = /\+?\d[\d\s().-]{5,}\d/g;

/**
 * A contact reduced to a hint an admin can match against a complaint without
 * reading it: the first letter and top-level domain of an email, the last two
 * digits of a phone number. Anything else is hidden entirely.
 */
export function maskContact(value: string): string {
  const contact = value.trim();
  if (!contact) return '';
  const at = contact.lastIndexOf('@');
  if (at > 0) {
    const domain = contact.slice(at + 1);
    const dot = domain.lastIndexOf('.');
    return `${contact.charAt(0)}${HIDDEN}@${HIDDEN}${dot >= 0 ? domain.slice(dot) : ''}`;
  }
  const digits = contact.replace(/\D/g, '');
  return digits.length >= 6 ? `${HIDDEN} ${digits.slice(-2)}` : HIDDEN;
}

/** Free text (a provider's error) with every email address and phone number in it masked. */
export function maskContactsIn(text: string): string {
  return text.replace(EMAIL, match => maskContact(match)).replace(PHONE, match => maskContact(match));
}

const toMessage = (raw: RawOutboxEvent): OutboxMessage => ({
  id: raw.id,
  eventType: raw.eventType ?? '',
  channel: raw.channel ?? '',
  status: raw.status ?? '',
  attempts: raw.attempts ?? 0,
  maxAttempts: raw.maxAttempts ?? 0,
  // The server masks both already; masking again is a no-op on masked text and a backstop if it ever is not.
  recipientMasked: maskContactsIn(raw.recipientMasked ?? ''),
  createdAt: raw.createdAt ?? null,
  sentAt: raw.sentAt ?? null,
  lastError: raw.lastError ? maskContactsIn(raw.lastError) : null,
});

/**
 * The notification outbox, for Super Admin. The only place that knows the
 * /v1/admin/notifications/outbox endpoints. The server sends no message payload
 * and masks contacts; this boundary masks any contact again as a backstop.
 */
export interface OutboxRepository {
  list(signal?: AbortSignal): Promise<OutboxMessage[]>;
  /** Runs the scheduler's real delivery job (reminder_reconcile) once over pending messages. */
  process(): Promise<OutboxRun>;
  requeue(notificationId: string): Promise<OutboxRequeueResult>;
}

export const outboxRepository: OutboxRepository = {
  list: async signal => {
    const page = await apiRequest<{ items?: RawOutboxEvent[] }>('/v1/admin/notifications/outbox', { signal });
    return (page.items ?? []).map(toMessage);
  },
  process: async () => {
    const run = await apiRequest<RawOutboxRun>('/v1/admin/notifications/outbox/process', { method: 'POST' });
    return { processed: run.processed ?? 0, delivered: run.delivered ?? 0, failed: run.failed ?? 0, deferred: run.deferred ?? 0, pending: run.pending ?? 0 };
  },
  requeue: async notificationId => {
    const result = await apiRequest<{ status?: string }>('/v1/admin/notifications/outbox/requeue', { method: 'POST', body: JSON.stringify({ notificationId }) });
    return { status: result.status ?? '' };
  },
};
