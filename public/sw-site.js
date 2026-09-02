/**
 * Offline assist for published /sites/{slug} only.
 * HTML: network-first (never serve stale site after publish).
 * Media: cache-first for flaky mobile data.
 */
const CACHE = "kebu-site-v2";

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

function isSiteScope(url) {
  return (
    url.pathname.startsWith("/sites/") ||
    url.pathname.includes("/storage/v1/object/public/site-assets/")
  );
}

function isDocument(req) {
  return req.destination === "document" || req.mode === "navigate";
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (!isSiteScope(url)) return;

  // HTML navigations: always prefer network so publishes show immediately.
  if (isDocument(req)) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          return res;
        } catch {
          const cache = await caches.open(CACHE);
          const cached = await cache.match(req);
          return cached ?? new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })(),
    );
    return;
  }

  // Images / audio / video: cache-first for limited bandwidth.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (
          res.ok &&
          (req.destination === "image" ||
            req.destination === "audio" ||
            req.destination === "video" ||
            req.destination === "font" ||
            req.destination === "style")
        ) {
          void cache.put(req, res.clone());
        }
        return res;
      } catch {
        return cached ?? Response.error();
      }
    })(),
  );
});
