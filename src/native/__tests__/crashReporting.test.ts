import { beforeEach, expect, it, vi } from 'vitest';

const init = vi.fn();
vi.mock('@sentry/react-native', () => ({ init: (...args: unknown[]) => init(...args) }));

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  init.mockClear();
});

it('disables native crash capture and installs the shared final JavaScript transport', async () => {
  vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', 'https://public@sentry.example.test/1');
  const { startCrashReporting } = await import('../crashReporting');
  expect(startCrashReporting()).toBe(true);
  expect(startCrashReporting()).toBe(true);
  expect(init).toHaveBeenCalledTimes(1);
  const options = init.mock.calls[0]?.[0];
  for (const key of ['enableNative', 'autoInitializeNativeSdk', 'enableNativeCrashHandling',
    'enableAutoPerformanceTracing', 'enableAppStartTracking', 'enableNativeFramesTracking',
    'enableStallTracking', 'attachScreenshot', 'attachViewHierarchy', 'autoSessionTracking']) {
    expect(options[key]).toBe(false);
  }
  expect(options.transport).toBeTypeOf('function');
  expect(options.beforeSendTransaction({ transaction: 'opaque-token' })).toBeNull();
  expect(JSON.stringify(options.beforeSend({ message: 'opaque-token', contexts: { reading: 72 } })))
    .not.toMatch(/opaque-token|reading/);
});
