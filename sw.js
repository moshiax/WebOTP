let offlineMode = true;
const swPrefix = '[ServiceWorker]';
['log','warn','error'].forEach(fn => {
    const orig = console[fn];
    console[fn] = (...args) => orig(swPrefix, ...args);
});

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
          console.log(`Served from cache: ${request.url}`);
          return cacheResponse;
        }
        console.warn(`No cache for: ${request.url}, serving offline page`);
        const html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <title>Offline Mode</title>
          </head>
          <body>
            <h1>Offline Mode Active</h1>
            <p>No cached data available for this page.</p>
            <button onclick="if(prompt('Type yes to confirm disabling offline mode')?.toLowerCase()==='yes') { navigator.serviceWorker.controller.postMessage({type:'SET_OFFLINE_MODE',value:false}); location.reload(); }">Disable Offline Mode</button>
          </body>
          </html>
        `;
        return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
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
            console.log(`Fetched and cached: ${request.url}`);
          } else {
            console.log(`Not cached due to protocol or method: ${request.url}`);
          }
          return response;
        } catch {
          const cacheResponse = await caches.match(request);
          if (cacheResponse) {
            console.log(`Served from cache after network failure: ${request.url}`);
            return cacheResponse;
          }
          console.warn(`No cache for: ${request.url}`);
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
