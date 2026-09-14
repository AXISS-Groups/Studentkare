// Platform-neutral environment accessor — NATIVE / Node implementation.
//
// Web uses `env.web.ts` (Vite's `import.meta.env`); Metro/React Native uses this
// file, reading from `process.env` (RN exposes it) and the `__DEV__` flag. The
// shared stores/ViewModels import from here, so they never touch `import.meta`
// and bundle cleanly on native.
function read(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key];
    if (value !== undefined) return value;
  }
  return undefined;
}

export const isDev = (): boolean =>
  Boolean((globalThis as unknown as { __DEV__?: boolean }).__DEV__) || read('NODE_ENV') === 'development';

export const apiBaseUrl = (): string => read('VITE_API_BASE_URL')?.replace(/\/$/, '') || '/api';

export const allowOfflineAuth = (): boolean => isDev() && read('VITE_ALLOW_OFFLINE_AUTH') === 'true';
