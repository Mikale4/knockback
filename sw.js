/* sw.js -- the offline copy of the game (a service worker), for the installed app and for playing without a connection.

   - The page (index.html) always comes from the network when there is one (revalidated, so a new version shows up on
     the next load); the saved copy is only for when you're offline.
   - The game's own files are stamped with the version (?v=..., tools/bump.py), so a saved copy can never be stale: it's
     served straight from the copy, and a new version asks for new names.
   - Google Fonts are kept as they load. Everything else (PeerJS, the room list, the matchmaking services) goes straight
     to the network: online play needs the internet anyway.
   VERSION is set by tools/bump.py; a new version clears the old copies. */
const VERSION = '202611070842';
const CACHE = 'knockback-' + VERSION;
const CORE = ['./', './index.html', './manifest.webmanifest', './lib/three.min.js', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('knockback-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const keep = (req, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    const page = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
    if (page) {
      e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => keep(new Request('./index.html'), res))
        .catch(() => caches.match('./index.html').then(hit => hit || caches.match('./'))));
      return;
    }
    if (url.pathname.includes('/tools/')) return;   // (test tools: never kept)
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => keep(req, res))));
    return;
  }
  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => keep(req, res))));
  }
});
