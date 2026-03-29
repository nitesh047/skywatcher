// SkyWatcher Service Worker v1.9
const CACHE_NAME = 'skywatcher-v10';
const STATE_CACHE = 'skywatcher-state';
const STATIC_ASSETS = [
  '/skywatcher/',
  '/skywatcher/index.html',
  '/skywatcher/manifest.json',
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
      Promise.all(keys
        .filter(k => k !== CACHE_NAME && k !== STATE_CACHE)
        .map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch (cache-first for static, network-only for API)
self.addEventListener('fetch', event => {
  if (event.request.url.includes('airplanes.live') || event.request.url.includes('adsbdb.com')) {
    event.respondWith(fetch(event.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// Message from main thread → show notification
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'NOTIFY') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: '/skywatcher/icons/icon-192.png',
      badge: '/skywatcher/icons/icon-96.png',
      vibrate: [200, 100, 200],
      tag: 'skywatcher-alert',
      renotify: true,
      data: { url: '/skywatcher/' }
    });
  }
});

// Notification click → focus or open app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/skywatcher/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('/skywatcher'));
      if (existing) return existing.focus();
      return clients.openWindow(target);
    })
  );
});

// ─── Periodic Background Sync ─────────────────────────────────────────────────
// Fires even when the app is closed (Android Chrome + desktop Chrome).
// iOS does not support this — alerts on iOS only work while the app is open.
self.addEventListener('periodicsync', event => {
  if (event.tag === 'bg-plane-check') {
    event.waitUntil(bgCheckPlanes());
  }
});

async function bgCheckPlanes() {
  const state = await readSwState();
  if (!state || !state.lat || !state.lng) return;

  const nm = Math.max(1, Math.round((state.radiusKm || 10) * 0.539957));
  let data;
  try {
    const res = await fetch(
      `https://api.airplanes.live/v2/point/${state.lat}/${state.lng}/${nm}`,
      { signal: AbortSignal.timeout(10000) }
    );
    data = await res.json();
  } catch { return; }

  const planes = (data.ac || []).filter(a => !a.on_ground && a.flight && a.lat && a.lon);
  if (planes.length === 0) return;

  const alerted = new Set(state.lastAlerted || []);
  const newPlanes = planes.filter(a => !alerted.has(a.hex));
  if (newPlanes.length === 0) return;

  const p = newPlanes[0];
  const callsign = (p.flight || p.hex || '').trim();
  const typeCode = p.t || (p.desc ? p.desc.split(' ').pop() : null);
  const modelTag = typeCode ? ` · ${typeCode}` : '';
  const dist = swHaversine(state.lat, state.lng, p.lat, p.lon);
  const distStr = dist < 1 ? (dist * 1000).toFixed(0) + ' m' : dist.toFixed(1) + ' km';
  const body = newPlanes.length > 1
    ? `${newPlanes.length} new aircraft entered your area`
    : `${callsign}${modelTag} — ${distStr} away`;

  await self.registration.showNotification(`✈ ${callsign}${modelTag}`, {
    body,
    icon: '/skywatcher/icons/icon-192.png',
    badge: '/skywatcher/icons/icon-96.png',
    vibrate: [200, 100, 200],
    tag: 'skywatcher-bg-alert',
    renotify: true,
    data: { url: '/skywatcher/' }
  });

  // Update stored alerted set so same planes don't ping repeatedly
  await writeSwState({ ...state, lastAlerted: planes.map(a => a.hex) });
}

async function readSwState() {
  try {
    const cache = await caches.open(STATE_CACHE);
    const res = await cache.match('/sw-state');
    return res ? res.json() : null;
  } catch { return null; }
}

async function writeSwState(state) {
  try {
    const cache = await caches.open(STATE_CACHE);
    await cache.put('/sw-state', new Response(JSON.stringify(state), {
      headers: { 'Content-Type': 'application/json' }
    }));
  } catch {}
}

function swHaversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
