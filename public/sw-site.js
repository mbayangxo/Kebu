/**
 * Offline assist for published /sites/{slug} only.
 * HTML: network-first (never serve stale site after publish).
 * Media: cache-first for flaky mobile data.
 * Offline mode: last successful HTML kept for revisit.
 */
const CACHE = "kebu-site-v3";
const HTML_SHELL = "kebu-site-html-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE && k !== HTML_SHELL).map((k) => caches.delete(k)),
        ),
      )
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
  // On failure, serve last cached HTML for this URL (Offline mode).
  if (isDocument(req)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(HTML_SHELL);
        try {
          const res = await fetch(req);
          if (res.ok) {
            void cache.put(req, res.clone());
          }
          return res;
        } catch {
          const cached = await cache.match(req);
          return (
            cached ??
            new Response(
              "<!doctype html><title>Offline</title><body style='font-family:system-ui;padding:2rem'><h1>Offline</h1><p>This page is not cached yet. Open it once online, then Offline mode can show it.</p></body>",
              { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
            )
          );
        }
      })(),
    );
    return;
  }

  // Images / audio / video / fonts / CSS: cache-first for limited bandwidth.
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
