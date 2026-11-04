// Offline support: the app and its data are cached so the map works without a connection.
// Reading links still need the internet because they open Bible.com.
const CACHE = 'bible-connections-v9';
const CORE = [
  './', 'index.html', 'styles.css', 'app.js', 'handout.html', 'handout.js',
  'content/themes.json', 'content/notes.json', 'content/journeys.json', 'content/series.json',
  'content/versions.json', 'content/config.json', 'content/people-places.json', 'content/topics.json', 'content/plans.json', 'vendor/qrcode.js', 'content/words.json', 'content/i18n/es.json', 'content/themes.es.json', 'content/journeys.es.json',
  'manifest.webmanifest', 'og-image.png', 'robots.txt', 'icons/icon.svg', 'icons/icon-192.png',
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
// The app (pages, code, styles, content) is fetched fresh when online so updates show immediately,
// falling back to the saved copy offline. The large data files are served from the saved copy and
// refreshed in the background.
const BIG = /\/data\/(refs\.bin|words\.json)$/;
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const key = url.pathname.endsWith('/') ? new Request(url.origin + url.pathname) : e.request;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(key, { ignoreSearch: true });
    const network = fetch(e.request).then(res => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    });
    if (BIG.test(url.pathname)) { network.catch(() => {}); return cached || network; }
    return network.catch(() => cached || Response.error());
  }));
});
