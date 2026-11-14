import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scrubBreadcrumb, scrubEvent } from '../sentryScrub';
import packageJson from '../../../package.json';

const init = vi.fn();
const captureException = vi.fn();
vi.mock('@sentry/react', () => ({
  init: (...args: unknown[]) => init(...args),
  captureException: (...args: unknown[]) => captureException(...args),
  makeFetchTransport: vi.fn(),
}));

describe('shared closed-schema crash metadata', () => {
  it('retains only enumerated metadata, never arbitrary strings, keys or clinical numbers', () => {
    const input = {
      event_id: '0123456789abcdef0123456789abcdef',
      release: 'release-with-a-token', environment: 'production', level: 'warning',
      message: 'Asha O+ 72', user: { email: 'asha@example.test' },
      request: { url: 'https://asha:opaque-token@example.test/asha?token=x', headers: { Authorization: 'Bearer opaque-token' } },
      contexts: { arbitrary: { who: 'Asha', reading: 72 } }, tags: { value: 'O+' },
      exception: { values: [{ type: 'TypeError', value: 'Asha', stacktrace: { frames: [{ filename: 'Asha.js', vars: { reading: 72 }, pre_context: ['opaque-token'] }] } }] },
      breadcrumbs: [{ category: 'navigation', level: 'info', timestamp: 72, data: { who: 'Asha' }, message: 'O+' }],
      fingerprint: ['opaque-token'], arbitrary: { password: 'opaque-token' },
    };
    expect(scrubEvent(input)).toEqual({
      platform: 'javascript', release: packageJson.version, environment: 'production', level: 'warning',
      exception: { values: [{ type: 'TypeError', value: 'Error details withheld' }] },
      breadcrumbs: [{ category: 'navigation', level: 'info' }],
    });
    expect(input.exception.values[0]?.value).toBe('Asha');
  });

  it('maps arbitrary exception types and metadata values to static defaults', () => {
    expect(scrubEvent({
      level: 'Asha', environment: 'O+', exception: { values: [{ type: 'OpaqueTokenError', value: 'x' }] },
    })).toEqual({
      platform: 'javascript', release: packageJson.version, level: 'error',
      exception: { values: [{ type: 'Error', value: 'Error details withheld' }] },
    });
  });

  it('denies unsupported event types and unreadable payloads without permissive fallback', () => {
    for (const input of [null, [], 'Asha', { type: 'transaction' }, { type: 'feedback' }, { type: 'profile' }]) {
      expect(scrubEvent(input)).toBeNull();
    }
    expect(scrubEvent({ get type() { throw new Error('opaque-token'); } })).toBeNull();
    expect(scrubBreadcrumb({ get category() { throw new Error('opaque-token'); } })).toBeNull();
  });

  it('accepts only known generic breadcrumb categories and severity', () => {
    expect(scrubBreadcrumb({ category: 'fetch', level: 'info', timestamp: 72, message: 'Asha', data: { url: '/asha' } }))
      .toEqual({ category: 'fetch', level: 'info' });
    expect(scrubBreadcrumb({ category: 'console', message: 'anything' })).toBeNull();
    expect(scrubBreadcrumb({ category: 'opaque-token' })).toBeNull();
  });
});

describe('web crash reporting', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    init.mockClear();
    captureException.mockClear();
  });

  it('stays off and sends nothing without a DSN', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const { initSentry, captureSentryException } = await import('../sentry');
    expect(initSentry()).toBe(false);
    captureSentryException(new Error('opaque-token'));
    expect(init).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  it('installs the final transport and independently denies transactions', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://public@sentry.example.test/1');
    const { initSentry } = await import('../sentry');
    expect(initSentry()).toBe(true);
    expect(initSentry()).toBe(true);
    expect(init).toHaveBeenCalledTimes(1);
    const options = init.mock.calls[0]?.[0];
    expect(options.sendDefaultPii).toBe(false);
    expect(options.tracesSampleRate).toBe(0);
    expect(options.autoSessionTracking).toBe(false);
    expect(options.sendClientReports).toBe(false);
    expect(options.beforeSendTransaction({ transaction: 'opaque-token' })).toBeNull();
    expect(options.transport).toBeTypeOf('function');
    expect(options.beforeSend({ message: 'Asha O+ 72' })).toEqual(scrubEvent({}));
  });

  it('leaves only the exception for the SDK privacy boundary, without component context', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://public@sentry.example.test/1');
    const { initSentry, captureSentryException } = await import('../sentry');
    initSentry();
    const error = new Error('opaque-token');
    captureSentryException(error, '\n at Asha');
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it('never lets a failing initialization break the app', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://public@sentry.example.test/1');
    init.mockImplementationOnce(() => { throw new Error('opaque-token'); });
    expect((await import('../sentry')).initSentry()).toBe(false);
  });
});
