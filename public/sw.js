// Kebu app service worker — safe offline assist for same-origin GET only.
// Never intercept auth, APIs, or cross-origin (Supabase) — that breaks login.

const CACHE = "kebu-app-v2";

const PRECACHE = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function shouldBypass(request, url) {
  if (request.method !== "GET") return true;
  if (url.origin !== self.location.origin) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/auth/")) return true;
  if (url.pathname === "/login" || url.pathname.startsWith("/login/")) return true;
  if (url.pathname === "/signup" || url.pathname.startsWith("/signup/")) return true;
  if (url.pathname === "/start" || url.pathname.startsWith("/start/")) return true;
  // Supabase / third-party auth must never go through this SW.
  if (url.hostname.includes("supabase")) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (shouldBypass(request, url)) return;

  // Immutable Next assets: cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const clone = response.clone();
              void caches.open(CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => Response.error());
      }),
    );
    return;
  }

  // Pages / other same-origin GET: network-first, cache fallback — never null
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          void cache.put(request, response.clone());
        }
        return response ?? Response.error();
      } catch {
        const cached = await cache.match(request);
        return cached ?? new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })(),
  );
});
