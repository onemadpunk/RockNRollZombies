// Service worker: always fetch the newest game files when there's a connection, and keep a copy
// of everything (game files, the 3D engine, fonts) so the installed game plays offline.
const CACHE = 'rnrz-v2';
const CDN = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];   // versioned, never change

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

const store = (req, res) => {
  if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
  return res;
};

// Our own files: newest from the network, but don't hang on a weak signal (car!), fall back to the copy.
function networkFirst(req) {
  const net = fetch(req, { cache: 'no-cache' }).then((res) => store(req, res));
  net.catch(() => {});
  const fallback = () => caches.match(req, { ignoreSearch: true });
  const slow = new Promise((r) => setTimeout(r, 4000)).then(fallback).then((hit) => hit || net);
  return Promise.race([net, slow]).catch(() => fallback().then((hit) => hit || Response.error()));
}

// The engine and fonts: the copy if we have one, otherwise fetch it and keep it.
function cacheFirst(req) {
  return caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req).then((res) => store(req, res)));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) e.respondWith(networkFirst(req));
  else if (CDN.includes(url.hostname)) e.respondWith(cacheFirst(req));
  // anything else (the world scoreboard) always goes straight to the network
});

// The page sends the list of everything it loaded, so the very first visit is saved for offline too.
self.addEventListener('message', (e) => {
  const urls = (e.data && e.data.warm) || [];
  const keep = async (c, u, same) => {
    if (!same) { const hit = await c.match(u, { ignoreVary: true }); if (hit) return hit; }
    const res = await fetch(u, same ? { cache: 'no-cache' } : {});
    if (res.ok) await c.put(u, res.clone());
    return res;
  };
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(urls.map(async (u) => {
    try {
      const same = new URL(u).origin === self.location.origin;
      const res = await keep(c, u, same);
      // The fonts stylesheet points at the actual font files: keep those too
      if (new URL(u).hostname === 'fonts.googleapis.com' && res.ok) {
        const css = await res.clone().text();
        const files = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]);
        await Promise.all(files.map((f) => keep(c, f, false).catch(() => {})));
      }
    } catch {}
  }))));
});
