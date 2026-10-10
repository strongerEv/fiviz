// Service worker sederhana: cache aset statis, halaman tetap network-first.
const CACHE = "fiviz-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const statis = req.url.includes("/_next/static/") || req.url.includes("/img/");
  if (statis) {
    e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(req)) || fetch(req).then((r) => (c.put(req, r.clone()), r))));
  } else if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match(req).then((r) => r || new Response("Offline", { status: 503 }))));
  }
});
