const CACHE_NAME = 'multiia-shell-v22';
const APP_SHELL = [
  '/',
  '/index.html',
  '/admin.html',
  '/studio.html',
  '/css/style.css',
  '/js/chat.js',
  '/js/admin.js',
  '/js/studio.js',
  '/js/pwa.js',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first so app updates show up immediately; falls back to the
// cached shell only when offline (airplane mode, flaky connection).
// `cache: 'no-store'` forces this fetch to skip the BROWSER's own HTTP
// cache entirely (not just our Cache Storage) - without it, `fetch(request)`
// still honors normal HTTP caching semantics, so staleness could survive
// even with a correct network-first strategy if a Cache-Control header
// upstream is ever missing/misconfigured. This makes freshness a guarantee
// that doesn't depend on any server-side header at all.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.url.includes('/api/')) return;
  event.respondWith(
    fetch(request, { cache: 'no-store' })
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
