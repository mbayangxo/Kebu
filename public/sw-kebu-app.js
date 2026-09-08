/**
 * App shell offline assist (Account · Create · Shop · Dashboard · Business).
 * HTML: network-first — never serve stale auth/sidebar forever.
 * Static: cache-first for /_next/static only.
 * Offline: last successful HTML for that URL, or honest offline page.
 * Scope: register at / — does not replace /sites/ sw-site.js.
 */
const HTML_CACHE = "kebu-app-html-v1";
const STATIC_CACHE = "kebu-app-static-v1";

const APP_PREFIXES = [
  "/account",
  "/create",
  "/shop",
  "/dashboard",
  "/business",
  "/opportunity",
  "/pricing",
  "/help",
  "/faqs",
];

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                (k.startsWith("kebu-app-") || k.startsWith("alkebulan")) &&
                k !== HTML_CACHE &&
                k !== STATIC_CACHE,
            )
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isAppDocumentPath(pathname) {
  if (pathname === "/" || pathname === "") return false;
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) return false;
  if (pathname.startsWith("/sites/")) return false;
  return APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isNextStatic(url) {
  return url.pathname.startsWith("/_next/static/");
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

  if (isNextStatic(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) void cache.put(req, res.clone());
          return res;
        } catch {
          return (
            hit ??
            new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
          );
        }
      })(),
    );
    return;
  }

  if (!isDocument(req) || !isAppDocumentPath(url.pathname)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(HTML_CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) void cache.put(req, res.clone());
        return res;
      } catch {
        const cached = await cache.match(req);
        return (
          cached ??
          new Response(
            `<!doctype html><title>Offline</title><body style="font-family:system-ui;padding:2rem;max-width:28rem">
<h1>You are offline</h1>
<p>This Kebu page is not cached yet. Open it once while online — then Offline / Data Saver can show it again.</p>
<p>Queued edits and orders wait until Syncing… Never marked saved until the server confirms.</p>
</body>`,
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
          )
        );
      }
    })(),
  );
});
