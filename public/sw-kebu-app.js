/** Cache immutable app assets only. Signed-in page HTML stays network-only. */
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
    fetch(req, { cache: "no-store" }).catch(
      () => new Response(
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Kebu · Offline</title><body><main><h1>You are offline</h1><p>Reconnect and reload to open this page. If an editor is already open in another tab, keep it open to protect unsynced work.</p></main></body></html>',
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
      ),
    ),
  );
});
