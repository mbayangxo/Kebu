const CACHE = "kebu-site-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/sites/") && !url.pathname.includes("/storage/v1/object/public/site-assets/")) {
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok && (req.destination === "document" || req.destination === "" || req.destination === "image" || req.destination === "audio" || req.destination === "video")) {
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        return cached ?? Response.error();
      }
    }),
  );
});
