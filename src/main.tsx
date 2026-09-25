import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initSentry } from './lib/sentry';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize Sentry as early as possible
initSentry();

// Register the offline application shell (never caches API/private data).
if ('serviceWorker' in navigator && (!import.meta.env.DEV || window.location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* offline shell is progressive enhancement */ });
  });
}
