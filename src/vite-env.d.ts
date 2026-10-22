interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ALLOW_OFFLINE_AUTH?: string;
  readonly VITE_DEMO_DATA?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly DEV?: boolean;
  readonly MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/* Bundled media (Vite resolves these imports to a served URL). */
declare module '*.png' {
  const url: string;
  export default url;
}
declare module '*.jpg' {
  const url: string;
  export default url;
}
declare module '*.mp4' {
  const url: string;
  export default url;
}
