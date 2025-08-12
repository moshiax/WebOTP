const CACHE_NAME = 'my-cache-v1';

const URLS_TO_CACHE = [
	'/',
	'/index.html',
	'/crypto.js',
	'/essentials.js',
	'/manifest.json',
	'/styles.css',
	'/sw.js',
	'/external/jsQR.js',
	'/external/protobuf.js',
	'/icon.png',
	'/demo.png'
];

let offlineMode = true;

self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(CACHE_NAME).then(async cache => {
			for (const url of URLS_TO_CACHE) {
				try {
					if (url.startsWith('chrome-extension://')) continue;
					await cache.add(url);
				} catch (err) {
					console.warn('Failed to cache', url, err);
				}
			}
		}).then(() => {
			console.log('All resources cached (or skipped with errors)');
			return self.skipWaiting();
		})
	);
});

self.addEventListener('activate', event => {
	event.waitUntil(
		caches.keys().then(keys => Promise.all(
			keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
		)).then(() => self.clients.claim())
	);
});

self.addEventListener('message', event => {
	if (event.data && event.data.type === 'SET_OFFLINE_MODE') {
		offlineMode = event.data.value;
	}
});

self.addEventListener('fetch', event => {
	const url = event.request.url;

	if (url.startsWith('chrome-extension://')) {
		return;
	}

	if (offlineMode) {
		event.respondWith(
			caches.match(event.request).then(cachedResponse => {
				if (cachedResponse) {
					console.log(`[Cache] Resource served from cache: ${url}`);
					return cachedResponse;
				}
				console.log(`[Offline] Resource not in cache, cannot fetch: ${url}`);
				return new Response('Offline and resource not cached', { status: 503, statusText: 'Service Unavailable' });
			})
		);
	} else {
		event.respondWith(
			fetch(event.request).then(networkResponse => {
				console.log(`[Network] Resource fetched from network: ${url}`);
				const responseClone = networkResponse.clone();
				caches.open(CACHE_NAME).then(cache => {
					cache.put(event.request, responseClone);
				});
				return networkResponse;
			}).catch(() => {
				return caches.match(event.request).then(cachedResponse => {
					if (cachedResponse) {
						console.log(`[Cache] Network failed, resource served from cache: ${url}`);
						return cachedResponse;
					}
					console.log(`[Error] Network failed and resource not in cache: ${url}`);
					return new Response('Network error and resource not cached', { status: 504, statusText: 'Gateway Timeout' });
				});
			})
		);
	}
});