// Collectr â Service Worker v2.0
const CACHE_NAME = 'collectr-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/styles.css',
  '/src/app.js',
  '/src/firebase-config.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't cache API calls or Firebase
  if (url.hostname.includes('googleapis') ||
      url.hostname.includes('firestore') ||
      url.hostname.includes('anthropic') ||
      url.hostname.includes('gstatic') ||
      url.hostname.includes('fonts.googleapis') ||
      url.pathname.startsWith('/v1/')) {
    return;
  }

  // Cache-first for static assets (fonts, icons, CSS from CDN)
  if (url.hostname !== self.location.hostname) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Network first, fallback to cache for same-origin
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      return caches.match(event.request).then((cached) => {
        return cached || caches.match('/index.html');
      });
    })
  );
});

// Background sync for pending saves
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-collection') {
    event.waitUntil(syncCollection());
  }
});

async function syncCollection() {
  // Handled by the app when it comes online
  console.log('[SW] Background sync triggered');
}
