import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scrubBreadcrumb, scrubEvent, scrubText, scrubUrl } from '../sentryScrub';

const init = vi.fn();
const captureException = vi.fn();
vi.mock('@sentry/react', () => ({ init: (...args: unknown[]) => init(...args), captureException: (...args: unknown[]) => captureException(...args) }));

describe('crash-report scrubber (shared by web and phone)', () => {
  it('masks e-mail addresses and long numbers, and redacts a line that names PHI', () => {
    expect(scrubText('Could not load for asha@example.test')).toBe('Could not load for [email]');
    expect(scrubText('Call back on +91 98765 43210')).toBe('Call back on [number]');
    expect(scrubText('id 1234-5678-9012')).toBe('id [number]');
    expect(scrubText('Failed to render prescription list')).toBe('[REDACTED: PHI]');
    expect(scrubText('Network request failed')).toBe('Network request failed');
  });

  it('keeps the page, never whose page: no query, no fragment, no record ids', () => {
    expect(scrubUrl('https://app.example/orders/9c35d6f0?ref=abc#top')).toBe('https://app.example/orders/:id');
    expect(scrubUrl('/records/3f2b8c1e-5a7d-4e9f-8b1a-2c3d4e5f6a7b/share')).toBe('/records/:id/share');
    expect(scrubUrl('/consult/room/123456')).toBe('/consult/room/:id');
    expect(scrubUrl('/lab-tests')).toBe('/lab-tests');
  });

  it('reduces a breadcrumb to category and level, and drops console lines', () => {
    expect(scrubBreadcrumb({ category: 'console', message: 'anything a screen logged' })).toBeNull();
    expect(scrubBreadcrumb({ category: 'fetch', level: 'info', timestamp: 1, message: 'GET /api/x', data: { url: '/api/health/documents/1' } }))
      .toEqual({ type: undefined, category: 'fetch', level: 'info', timestamp: 1 });
  });

  it('strips the user, extra data, request details and local variables from an event', () => {
    const event = scrubEvent({
      user: { id: 'u1', email: 'asha@example.test', ip_address: '10.0.0.1' },
      extra: { form: { symptoms: 'typed by the student' } },
      server_name: 'host-1',
      transaction: '/orders/9c35d6f0',
      request: { url: 'https://app.example/records?search=report', headers: { Cookie: 'care_session=x' }, cookies: { a: 'b' } },
      message: 'Sign-in failed for asha@example.test',
      exception: { values: [{ type: 'Error', value: 'No slot for 9876543210', stacktrace: { frames: [{ filename: 'a.js', lineno: 3, vars: { typed: 'secret' } }] } }] },
      breadcrumbs: [{ category: 'console', message: 'x' }, { category: 'navigation', data: { to: '/records/1' } }],
    });
    expect(event).toEqual({
      transaction: '/orders/:id',
      request: { url: 'https://app.example/records' },
      message: 'Sign-in failed for [email]',
      exception: { values: [{ type: 'Error', value: 'No slot for [number]', stacktrace: { frames: [{ filename: 'a.js', lineno: 3 }] } }] },
      breadcrumbs: [{ type: undefined, category: 'navigation', level: undefined, timestamp: undefined }],
    });
    expect(JSON.stringify(event)).not.toMatch(/asha|secret|care_session|typed by|9876543210|10\.0\.0\.1/);
  });

  it('drops an event that still names PHI after scrubbing', () => {
    expect(scrubEvent({ exception: { values: [{ type: 'HivResultError', value: 'x' }] } })).toBeNull();
    expect(scrubEvent({ contexts: { app: { screen: 'ok' } }, fingerprint: ['patient-list'] })).toBeNull();
  });

  it('redacts PHI words in contexts and tags instead of sending them', () => {
    expect(scrubEvent({ contexts: { app: { screen: 'prescription' } }, tags: { area: 'therapy' } }))
      .toEqual({ contexts: { app: { screen: '[REDACTED: PHI]' } }, tags: { area: '[REDACTED: PHI]' } });
  });
});

describe('web crash reporting', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    init.mockClear();
    captureException.mockClear();
  });

  it('stays off, and sends nothing, when no DSN is configured', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const { initSentry, captureSentryException } = await import('../sentry');
    expect(initSentry()).toBe(false);
    captureSentryException(new Error('boom'));
    expect(init).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  it('starts with no user data, no traces, no session replay, and the shared scrubber', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@sentry.example/1');
    const { initSentry } = await import('../sentry');
    expect(initSentry()).toBe(true);
    expect(initSentry()).toBe(true);
    expect(init).toHaveBeenCalledTimes(1);
    const options = init.mock.calls[0][0];
    expect(options.sendDefaultPii).toBe(false);
    expect(options.tracesSampleRate).toBe(0);
    expect(options).not.toHaveProperty('replaysSessionSampleRate');
    expect(options).not.toHaveProperty('replaysOnErrorSampleRate');
    expect(options).not.toHaveProperty('integrations');
    expect(options.beforeSend({ user: { id: 'u1' }, message: 'x' })).toEqual({ message: 'x' });
    expect(options.beforeBreadcrumb({ category: 'console', message: 'x' })).toBeNull();
  });

  it('sends a caught error with component names only, and refuses one whose message names PHI', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@sentry.example/1');
    const { initSentry, captureSentryException } = await import('../sentry');
    initSentry();
    const error = new Error('render failed');
    captureSentryException(error, '\n    at Card\n    at Home');
    expect(captureException).toHaveBeenCalledWith(error, { contexts: { react: { componentStack: '\n    at Card\n    at Home' } } });
    captureSentryException(new Error('could not show diagnosis'));
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('never lets a failing start break the app', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@sentry.example/1');
    init.mockImplementationOnce(() => { throw new Error('bad dsn'); });
    const { initSentry } = await import('../sentry');
    expect(initSentry()).toBe(false);
  });
});
