import { uuid4 } from '@sentry/core';
import type { BaseTransportOptions, Envelope, Transport } from '@sentry/core';
import { scrubEvent } from './sentryScrub';

type TransportFactory = (options: BaseTransportOptions) => Transport;

/** The final wire boundary also covers SDK paths that bypass beforeSend. */
export function scrubEnvelope(envelope: unknown): Envelope | null {
  try {
    if (!Array.isArray(envelope) || !Array.isArray(envelope[1])) return null;
    for (const item of envelope[1]) {
      if (!Array.isArray(item)) continue;
      const headers: unknown = item[0];
      const payload: unknown = item[1];
      if (typeof headers !== 'object' || headers === null || !('type' in headers)) continue;
      if (headers.type !== 'event') continue;
      const event = scrubEvent(payload);
      if (!event) continue;
      const eventId = uuid4();
      return [{ event_id: eventId, sent_at: new Date().toISOString() }, [[{ type: 'event' }, { ...event, event_id: eventId }]]];
    }
  } catch {
    return null;
  }
  // No attachments, native dumps, replay, profiles, sessions or transactions.
  return null;
}

export function privacyTransport(makeTransport: TransportFactory): TransportFactory {
  return (options) => {
    const transportOptions = {
      ...options,
      fetchOptions: { credentials: 'omit' as const, referrerPolicy: 'no-referrer' as const },
    };
    const transport = makeTransport(transportOptions);
    return {
      send(envelope) {
        const safe = scrubEnvelope(envelope);
        return safe ? transport.send(safe) : Promise.resolve({});
      },
      flush: (timeout) => transport.flush(timeout),
    };
  };
}
