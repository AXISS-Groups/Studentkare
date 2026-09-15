// Platform-neutral environment accessor — WEB (Vite) implementation.
//
// Vite resolves `./env` to this `.web.ts` file (it prefers `.web.*` over generic).
// It reads Vite's `import.meta.env`. Native uses `env.ts` (process.env).
export const isDev = (): boolean => Boolean(import.meta.env.DEV);

export const apiBaseUrl = (): string => (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';

export const allowOfflineAuth = (): boolean => Boolean(import.meta.env.DEV) && import.meta.env.VITE_ALLOW_OFFLINE_AUTH === 'true';
