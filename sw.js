// Network-only service worker.
// This PWA is installable, but deliberately uses NO offline cache:
// every request goes straight to the network. If the network or the
// data source is down, the page's status dot turns red ("non-live")
// instead of silently serving stale cached content.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Belt and braces: drop any caches that might ever appear.
    for (const key of await caches.keys()) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
