"use client";

import { useEffect } from "react";

/**
 * Register the app SW and drop broken legacy workers (alkebulan-v1)
 * that intercepted Supabase auth and returned null responses.
 */
export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    async function boot() {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs.map(async (reg) => {
            const scriptURL =
              reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || "";
            // Drop any worker that isn't our current /sw.js (or site-scoped /sw-site.js).
            if (scriptURL.includes("/sw-site.js")) return;
            if (!scriptURL.endsWith("/sw.js") && !scriptURL.includes("/sw.js")) {
              await reg.unregister();
              return;
            }
            // Force update so clients leave alkebulan-v1 / null-respondWith builds.
            void reg.update();
          }),
        );

        if (cancelled) return;

        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Blocked or unsupported — app works without SW.
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
