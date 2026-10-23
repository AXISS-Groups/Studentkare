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
  // Never intercept Vite dev server, HMR, or source file requests
  if (
    url.hostname === 'localhost' ||
    url.port === '3000' ||
    url.pathname.startsWith('/@') ||
    url.pathname.includes('/src/') ||
    url.pathname.includes('/node_modules/')
  ) {
    return;
  }
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
    }).catch(() => {
      return caches.match('/') || new Response(JSON.stringify({ error: 'Service Unavailable' }), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      });
    }))
  );
});

/* Push notifications (src/lib/webPush.ts; backend/services/push_dispatch.py).
 *
 * The payload is already the lock-screen text: a fixed "you have an update"
 * line per category, never a medicine, test, result or condition, or a super
 * admin's checked announcement. A tap opens the app at the payload's path, a
 * path on this site only (never another origin), which then asks for sign-in
 * if the browser is signed out.
 */
function safePath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/notifications';
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {};
  }
  const title = typeof data.title === 'string' && data.title ? data.title : 'Student Kare';
  const body = typeof data.body === 'string' ? data.body : '';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag: typeof data.tag === 'string' ? data.tag : undefined,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { path: safePath(data.path) },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(safePath(event.notification.data && event.notification.data.path), self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        return client.navigate(target).then((opened) => (opened || client).focus());
      }
    }
    return self.clients.openWindow(target);
  }));
});
