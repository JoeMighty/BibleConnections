// Offline support: the app and its data are cached so the map works without a connection.
// Reading links still need the internet because they open Bible.com.
const CACHE = 'bible-connections-v2';
const CORE = [
  './', 'index.html', 'styles.css', 'app.js', 'themes.js', 'notes.js', 'journeys.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png',
  'data/books.json', 'data/refs.bin', 'data/words.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Serve from cache straight away, then refresh the cache in the background.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const key = url.pathname.endsWith('/') ? new Request(url.origin + url.pathname) : e.request;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(key, { ignoreSearch: true });
    const network = fetch(e.request).then(res => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  }));
});
