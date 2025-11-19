const CACHE_NAME = 'cmovil-cache-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ status: 'error', message: 'Sin conexión' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503
        }))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((response) => response || fetch(request))
  );
});
