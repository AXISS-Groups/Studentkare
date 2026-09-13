/* Studentkare service worker — offline application shell.
 *
 * Caches the static application shell (HTML, JS, CSS, manifest) so the app can
 * open offline. Private health data and API responses are NEVER cached; the
 * network is always used for API requests and they fall back to an explicit
 * offline state rather than stale data.
 */
const CACHE = 'studentkare-shell-v1';
const SHELL = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never cache API calls or private data. Let them hit the network; on failure
  // the app shows its own offline state.
  if (url.pathname.startsWith('/api/')) return;
  // Cache-first for the static shell assets, network-first for navigation.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return res;
    }))
  );
});
