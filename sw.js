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
                if (event.request.method === 'GET' && response.status === 200) {
                    const clonedResponse = response.clone();
                    caches.open('v1').then((cache) => {
                        cache.put(event.request, clonedResponse).catch((cacheError) => {
                            console.error('Error while saving to cache:', cacheError);
                        });
                    });
                }
                return response;
            })
            .catch((fetchError) => {
                console.error('Error during fetch:', fetchError);
                return caches.match(event.request)
                    .then((cacheResponse) => {
                        if (cacheResponse) {
                            return cacheResponse;
                        } else {
                            return new Response('Error loading and no data in cache', {
                                status: 500,
                                statusText: 'Internal Server Error'
                            });
                        }
                    });
            })
    );
});