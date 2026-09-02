"use client";

import { useEffect } from "react";

const PURGE_FLAG = "kebu-cache-purge-v4";

function isSiteScopedSw(scriptURL: string): boolean {
  return scriptURL.includes("/sw-site.js");
}

function isRootAppSw(scriptURL: string): boolean {
  return Boolean(scriptURL) && !isSiteScopedSw(scriptURL);
}

/**
 * Stop stale HTML from old service workers.
 * - If a root-scope SW exists → install kill-switch /sw.js (clears caches + unregisters).
 * - If only legacy Cache Storage remains → delete it.
 * - Never leave a long-lived root SW that caches pages.
 * Published sites may use /sw-site.js under /sites/ (network-first HTML).
 */
export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    async function run() {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        const rootRegs = regs.filter((reg) => {
          const scriptURL =
            reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || "";
          return isRootAppSw(scriptURL);
        });

        const cacheKeys = "caches" in window ? await caches.keys() : [];
        const legacyCaches = cacheKeys.filter(
          (k) =>
            k.startsWith("alkebulan") ||
            k.startsWith("kebu-app") ||
            k === "kebu-site-v1" ||
            k.startsWith("kebu-app-"),
        );

        const needsPurge = rootRegs.length > 0 || legacyCaches.length > 0;
        if (!needsPurge) return;

        if (rootRegs.length > 0) {
          // Update the existing registration to the kill-switch script.
          await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        }

        await Promise.all(
          regs.map(async (reg) => {
            const scriptURL =
              reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || "";
            if (isSiteScopedSw(scriptURL)) return;
            // Kill-switch will unregister itself; also force-remove immediately.
            await reg.unregister();
          }),
        );

        await Promise.all(legacyCaches.map((k) => caches.delete(k)));

        if (!cancelled && typeof sessionStorage !== "undefined") {
          if (!sessionStorage.getItem(PURGE_FLAG)) {
            sessionStorage.setItem(PURGE_FLAG, "1");
            window.location.reload();
          }
        }
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
