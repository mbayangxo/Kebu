/**
 * Kill-switch service worker.
 * Replaces the old alkebulan/kebu-app SW that cached HTML (landing sidebar, login).
 * On activate: delete all app caches, unregister, reload open tabs.
 * Do NOT cache any pages here.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("alkebulan") || k.startsWith("kebu-app") || k.startsWith("kebu-"))
          .map((k) => caches.delete(k)),
      );
      // Also drop any leftover named caches from older builds.
      await Promise.all(keys.map((k) => caches.delete(k)));

      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        if ("navigate" in client) {
          try {
            await client.navigate(client.url);
          } catch {
            /* ignore */
          }
        }
      }
    })(),
  );
});

// Never intercept fetches — pages always hit the network.
self.addEventListener("fetch", () => undefined);
