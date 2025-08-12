let offlineMode = true;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then(async (cache) => {
      const urlsToCache = [
        '/',
        'index.html',
        'styles.css',
        'crypto.js',
        'essentials.js',
        'external/jsQR.js',
        'external/protobuf.js',
        'manifest.json',
        'icon.png',
        'demo.png',
        'sw.js'
      ];

      for (let url of urlsToCache) {
        try {
          await cache.add(url);
          console.log(`Cached during install: ${url}`);
        } catch (e) {
          console.error(`Caching error during install: ${url}`, e);
        }
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  if (url.hash) {
    url.hash = '';
  }

  let request = event.request;

  if (url.pathname.endsWith('/')) {
    url.pathname += 'index.html';
    request = new Request(url.toString(), { method: event.request.method });
  }

  event.respondWith(
    (async () => {
      if (offlineMode) {
        const cacheResponse = await caches.match(request);
        if (cacheResponse) {
          console.log(`[Cache][offlineMode] Served from cache: ${request.url}`);
          return cacheResponse;
        }
        console.warn(`[Cache][offlineMode] No cache for: ${request.url}, returning 503`);
        return new Response('Offline mode: no cached data', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      } else {
        try {
          const response = await fetch(request);
          if (
            request.method === 'GET' &&
            (url.protocol === 'http:' || url.protocol === 'https:') &&
            response.status === 200
          ) {
            const clonedResponse = response.clone();
            const cache = await caches.open('v1');
            cache.put(request, clonedResponse).catch((cacheError) => {
              console.error('Error while saving to cache:', cacheError);
            });
            console.log(`[Network] Fetched and cached: ${request.url}`);
          } else {
            console.log(`[Network] Not cached due to protocol or method: ${request.url}`);
          }
          return response;
        } catch {
          const cacheResponse = await caches.match(request);
          if (cacheResponse) {
            console.log(`[Cache] Served from cache after network failure: ${request.url}`);
            return cacheResponse;
          }
          console.warn(`[Error] No cache for: ${request.url}`);
          return new Response('Error loading and no data in cache', {
            status: 500,
            statusText: 'Internal Server Error',
          });
        }
      }
    })()
  );
});

self.addEventListener('message', event => {
  const allowedOrigin = new URL(self.location.href).origin;
  if (event.origin !== allowedOrigin) {
    console.warn(`Rejected message from unauthorized origin: ${event.origin}`);
    return;
  }

  if (event.data && event.data.type === 'SET_OFFLINE_MODE') {
    offlineMode = event.data.value;
    console.log(`Offline mode set to: ${offlineMode}`);
  }
});
