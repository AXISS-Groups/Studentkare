import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initSentry } from './lib/sentry';
// Design-system CSS variables (--sk-*), generated from design/tokens. Web entry only.
import './theme/tokens/generated/sk-tokens.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize Sentry as early as possible
initSentry();

// Service worker lifecycle: in development mode, active service workers trap
// Vite HMR and serve stale cached bundles on localhost. Unregister any existing
// workers and clear caches in DEV mode. In production, register the offline shell.
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* offline shell is progressive enhancement */ });
    });
  }
}
