"use client";

import { useEffect } from "react";

function isSiteScopedSw(scriptURL: string): boolean {
  return scriptURL.includes("/sw-site.js");
}

function isKillSwitchSw(scriptURL: string): boolean {
  return scriptURL.includes("/sw.js");
}

function isAppShellSw(scriptURL: string): boolean {
  return scriptURL.includes("/sw-kebu-app.js");
}

/**
 * - Purge legacy alkebulan / kill-switch SWs that cached broken HTML.
 * - Register network-first app shell SW for Account · Create · Shop · Dashboard.
 * - Keep /sites/ on sw-site.js (separate scope).
 */
export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    async function run() {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();

        for (const reg of regs) {
          const scriptURL =
            reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || "";
          if (isSiteScopedSw(scriptURL) || isAppShellSw(scriptURL)) continue;
          if (isKillSwitchSw(scriptURL) || scriptURL.includes("alkebulan") || !scriptURL) {
            await reg.unregister();
          }
        }

        const cacheKeys = "caches" in window ? await caches.keys() : [];
        const legacyCaches = cacheKeys.filter(
          (k) =>
            k.startsWith("alkebulan") ||
            k === "kebu-site-v1" ||
            (k.startsWith("kebu-app-") &&
              !k.startsWith("kebu-app-html") &&
              !k.startsWith("kebu-app-static")),
        );
        await Promise.all(legacyCaches.map((k) => caches.delete(k)));

        if (cancelled) return;

        await navigator.serviceWorker.register("/sw-kebu-app.js", { scope: "/" });
      } catch {
        // App works without SW.
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
