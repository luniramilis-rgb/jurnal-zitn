/* Jurnal ZITN service worker (ZITN-TECH-017 §12 / Fase H) — PWA offline.
 *
 * Deliberately small and network-first for navigations so the app never serves a
 * stale shell: the SPA is a hashed-asset bundle, and only immutable asset paths
 * are cached. `/api/*` is never cached (data must be live; D12 applies to
 * market data, and user data must not be served from a cache). No telemetry.
 *
 * Cache lifecycle: the shell is refreshed on every successful navigation (so the
 * offline fallback tracks the deployed build) and `/assets/*` entries are capped
 * so Cache Storage cannot grow across deploys. `/vendor/*` is NOT cached — those
 * filenames are not content-addressed.
 */
const CACHE = 'jurnal-zitn-v1';
const SHELL = '/index.html';
const PRECACHE = [SHELL, '/manifest.webmanifest', '/favicon.svg'];
// Content-hashed entry + lazy chunks for a handful of deploys; FIFO-evicted.
const MAX_ASSETS = 60;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Session teardown posts this so a signed-out tab does not keep a warm shell.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(caches.delete(CACHE).then(() => caches.open(CACHE)));
  }
});

async function trim(cache) {
  const keys = await cache.keys();
  // Cache.keys() yields insertion order; drop the oldest entries beyond the cap.
  const excess = keys.length - MAX_ASSETS;
  for (let i = 0; i < excess; i += 1) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache the API: user data and market data must be live.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network first, refresh the shell, fall back to it when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(SHELL, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(SHELL)) ?? Response.error()),
    );
    return;
  }

  // Immutable, content-hashed assets: cache first, then network.
  if (!url.pathname.startsWith('/assets/')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE).then(async (cache) => {
            await cache.put(request, copy);
            await trim(cache);
          });
        }
        return response;
      });
    }),
  );
});
