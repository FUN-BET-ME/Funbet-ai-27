// Force cache clear on new version
const CACHE_VERSION = 'v2.0.0';

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete all old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Claim all clients immediately
  return self.clients.claim();
});

// Don't cache anything - always fetch fresh
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request, {
      cache: 'no-store'
    }).catch(() => {
      return new Response('Offline');
    })
  );
});
