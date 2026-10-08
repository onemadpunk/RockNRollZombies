// Service worker: always fetch the newest game files (checks with the server every time),
// and keep a copy so the game still opens without a connection.
const CACHE = 'rnrz-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // 3D engine + fonts: normal browser caching
  e.respondWith(
    fetch(req, { cache: 'no-cache' })                          // revalidate: never serve a stale copy when online
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })),
  );
});
