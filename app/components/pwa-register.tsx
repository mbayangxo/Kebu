"use client";

import { useEffect } from "react";

/**
 * Clear broken legacy PWA workers that intercepted auth and cached the old
 * landing (with app sidebar). Do not register a root-scope SW for now —
 * published sites use /sw-site.js under /sites/ only.
 */
export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    async function purgeBrokenWorkers() {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        let removedRootSw = false;

        await Promise.all(
          regs.map(async (reg) => {
            const scriptURL =
              reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || "";
            // Keep site-scoped offline helper only.
            if (scriptURL.includes("/sw-site.js")) return;
            removedRootSw = true;
            await reg.unregister();
          }),
        );

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter(
                (k) =>
                  k.startsWith("alkebulan") ||
                  k.startsWith("kebu-app") ||
                  k === "alkebulan-v1" ||
                  k === "kebu-app-v2",
              )
              .map((k) => caches.delete(k)),
          );
        }

        // One-time hard reload after purge so landing drops cached sidebar HTML.
        if (!cancelled && removedRootSw && typeof sessionStorage !== "undefined") {
          const flag = "kebu-purged-sw-v3";
          if (!sessionStorage.getItem(flag)) {
            sessionStorage.setItem(flag, "1");
            window.location.reload();
          }
        }
      } catch {
        // App works without SW.
      }
    }

    if (!cancelled) void purgeBrokenWorkers();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
