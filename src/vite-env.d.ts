interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ALLOW_OFFLINE_AUTH?: string;
  readonly VITE_DEMO_DATA?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_APP_VERSION?: string;
  readonly DEV?: boolean;
  readonly MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Images copied from design/assets into src/assets; Vite serves them by URL. */
declare module '*.jpg' {
  const src: string;
  export default src;
}
