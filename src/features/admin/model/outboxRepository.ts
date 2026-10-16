import { apiRequest } from '@/data/http';
import type { OutboxMessage, OutboxRequeueResult, OutboxRun } from './types';

/** What GET /v1/admin/notifications/outbox sends for one message (notification_worker.OutboxNotification). */
interface RawOutboxNotification {
  id: string;
  recipient?: string | null;
  channel?: string | null;
  status?: string | null;
  attempts?: number | null;
  max_attempts?: number | null;
  scheduled_at?: string | null;
  last_attempt_at?: string | null;
  error_message?: string | null;
  // subject and body are also sent. They are never read here: a message can carry health information.
}

interface RawOutboxRun { processed?: number; queue_size?: number; quiet_hours_active?: boolean }

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

const toMessage = (raw: RawOutboxNotification): OutboxMessage => ({
  id: raw.id,
  channel: raw.channel ?? '',
  status: raw.status ?? '',
  attempts: raw.attempts ?? 0,
  maxAttempts: raw.max_attempts ?? 0,
  recipientMasked: maskContact(raw.recipient ?? ''),
  scheduledAt: raw.scheduled_at ?? '',
  lastAttemptAt: raw.last_attempt_at ?? null,
  lastError: raw.error_message ? maskContactsIn(raw.error_message) : null,
});

/**
 * The notification outbox, for Super Admin. The only place that knows the
 * /v1/admin/notifications/outbox endpoints, and the boundary where message
 * bodies and subjects are dropped and contacts are masked.
 */
export interface OutboxRepository {
  list(signal?: AbortSignal): Promise<OutboxMessage[]>;
  /** Runs the delivery worker once over pending messages. */
  process(): Promise<OutboxRun>;
  requeue(notificationId: string): Promise<OutboxRequeueResult>;
}

export const outboxRepository: OutboxRepository = {
  list: async signal => {
    const page = await apiRequest<{ items?: RawOutboxNotification[] }>('/v1/admin/notifications/outbox', { signal });
    return (page.items ?? []).map(toMessage);
  },
  process: async () => {
    const run = await apiRequest<RawOutboxRun>('/v1/admin/notifications/outbox/process', { method: 'POST' });
    return { processed: run.processed ?? 0, queueSize: run.queue_size ?? 0, quietHoursActive: run.quiet_hours_active === true };
  },
  requeue: async notificationId => {
    const result = await apiRequest<{ status?: string }>('/v1/admin/notifications/outbox/requeue', { method: 'POST', body: JSON.stringify({ notificationId }) });
    return { status: result.status ?? '' };
  },
};
