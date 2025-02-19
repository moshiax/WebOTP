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
        fetch(event.request)
            .then((response) => {
                if (event.request.method === 'GET') {
                    caches.open('v1').then((cache) => {
                        cache.put(event.request, response.clone());
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
