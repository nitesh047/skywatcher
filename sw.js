// SkyWatcher Service Worker v1.8
const CACHE_NAME = 'skywatcher-v9';
const STATIC_ASSETS = [
  '/skywatcher-pwa/',
  '/skywatcher-pwa/index.html',
  '/skywatcher-pwa/manifest.json',
];

// Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch (cache-first for static, network-first for API)
self.addEventListener('fetch', event => {
  if (event.request.url.includes('opensky-network.org') || event.request.url.includes('adsb.lol') || event.request.url.includes('adsb.fi') || event.request.url.includes('airplanes.live')) {
    // Network-only for live data
    event.respondWith(fetch(event.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// Push notification from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'NOTIFY') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      vibrate: [200, 100, 200],
      tag: 'skywatcher-alert',
      renotify: true,
      data: { url: '/' }
    });
  }
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/');
    })
  );
});
