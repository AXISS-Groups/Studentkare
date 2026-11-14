import { describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/react';
import type { Envelope } from '@sentry/core';
import { privacyTransport, scrubEnvelope } from '../sentryTransport';
import { scrubEvent } from '../sentryScrub';

describe('actual Sentry SDK envelopes', () => {
  it('serializes safe error metadata through the actual SDK and fetch transport', async () => {
    const requests: RequestInit[] = [];
    const fetchRecorder = vi.fn(async (_url: string, options: RequestInit) => {
      requests.push(options);
      return new Response('', { status: 200 });
    });
    const client = new Sentry.BrowserClient({
      dsn: 'https://public@sentry.example.test/1',
      integrations: [], stackParser: Sentry.defaultStackParser,
      tracesSampleRate: 1, autoSessionTracking: false, sendClientReports: false,
      beforeSend: scrubEvent, beforeSendTransaction: () => null,
      transport: privacyTransport((options) => Sentry.makeFetchTransport(options, fetchRecorder)),
    });
    client.init();
    const scope = new Sentry.Scope();
    scope.setClient(client);
    scope.setUser({ id: 'Asha', email: 'asha@example.test' });
    scope.setContext('arbitrary', { value: 'O+', reading: 72 });
    scope.captureException(new TypeError('opaque-token Asha O+ 72'), {
      attachments: [{ filename: 'Asha.txt', data: 'opaque-token' }],
    });
    expect(await client.flush(1000)).toBe(true);
    expect(requests).toHaveLength(1);
    const body = String(requests[0]?.body);
    expect(body).not.toMatch(/opaque-token|Asha|asha|O\+|reading|filename|attachment|user|contexts/);
    expect(body).toContain('TypeError');
    expect(body).toContain('Error details withheld');
    expect(requests[0]?.credentials).toBe('omit');
    expect(requests[0]?.referrerPolicy).toBe('no-referrer');
    const [headerText, itemText, eventText] = body.split('\n');
    const headers: unknown = JSON.parse(headerText ?? '');
    const event: unknown = JSON.parse(eventText ?? '');
    expect(headers).toEqual({ event_id: expect.stringMatching(/^[a-f0-9]{32}$/), sent_at: expect.any(String) });
    expect(itemText).toBe('{"type":"event"}');
    expect(event).toMatchObject({ event_id: expect.stringMatching(/^[a-f0-9]{32}$/) });

    scope.captureEvent({ type: 'transaction', transaction: 'opaque-token', start_timestamp: 1, timestamp: 2 });
    await client.flush(1000);
    expect(requests).toHaveLength(1);

    // Sentry skips beforeSend for its internal processing errors. The final
    // transport still denies attached arbitrary fields and envelope headers.
    scope.captureEvent({ message: 'opaque-token', extra: { reading: 72 } }, { data: { __sentry__: true } });
    await client.flush(1000);
    expect(requests).toHaveLength(2);
    expect(String(requests[1]?.body)).not.toMatch(/opaque-token|reading|extra|trace/);
    await client.close(1000);
  });

  it('rejects every side-envelope type, even when handed directly to the transport', () => {
    const kinds = ['transaction', 'attachment', 'session', 'sessions', 'profile', 'profile_chunk', 'replay_event', 'replay_recording', 'feedback', 'user_report', 'statsd', 'span', 'check_in', 'client_report'] as const;
    for (const type of kinds) {
      const envelope = [{}, [[{ type }, 'opaque-token']]];
      expect(scrubEnvelope(envelope)).toBeNull();
    }
  });

  it('rebuilds event IDs and headers and strips side items even without beforeSend', () => {
    const originalId = '0123456789abcdef0123456789abcdef';
    const envelope: Envelope = [
      { event_id: originalId, sent_at: 'opaque-token', trace: { public_key: 'opaque-token' }, arbitrary: 'Asha' },
      [[{ type: 'event', filename: 'Asha' }, { event_id: originalId, message: 'opaque-token', contexts: { value: { reading: 72 } } }],
       [{ type: 'attachment', length: 12, filename: 'Asha' }, 'opaque-token']],
    ];
    const safe = scrubEnvelope(envelope);
    expect(safe).not.toBeNull();
    expect(JSON.stringify(safe)).not.toMatch(/opaque-token|Asha|reading|trace|arbitrary|0123456789abcdef/);
    expect(safe?.[1]).toHaveLength(1);
  });
});
