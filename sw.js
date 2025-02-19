self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('v1').then(async (cache) => {
            for (let url of ['index.html', 'styles.css', 'crypto.js', 'icon.png']) {
                try {
                    await cache.add(url);
                } catch (e) {
                    console.error(`caching error: ${url}`, e);
                }
            }
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                if (event.request.method === 'GET' && networkResponse.ok) {
                    return caches.open('v1').then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                }
                return networkResponse;
            });
        })
    );
});
