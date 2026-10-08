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

/**
 * The API origin for the native app. Expo inlines only EXPO_PUBLIC_* variables,
 * and only when read as a static property — `process.env[key]` is never
 * inlined — so this must stay a literal `process.env.EXPO_PUBLIC_API_BASE_URL`.
 * A phone has no same-origin '/api'; without the variable every request fails,
 * the session check fails closed and the app stays signed out.
 */
export const apiBaseUrl = (): string => {
  const configured = (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_API_BASE_URL : undefined) ?? read('VITE_API_BASE_URL');
  if (configured) return configured.replace(/\/$/, '');
  if (isDev()) console.warn('[env] EXPO_PUBLIC_API_BASE_URL is not set; the native app cannot reach the API. Set it to e.g. https://<host>/api');
  return '/api';
};

export const allowOfflineAuth = (): boolean => isDev() && read('VITE_ALLOW_OFFLINE_AUTH') === 'true';
