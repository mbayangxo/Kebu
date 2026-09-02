/** Offline cache for published Kebu sites — helps on slow or flaky mobile data. */

export function registerSiteOfflineCache() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const path = window.location.pathname;
  if (!path.startsWith("/sites/")) return;
  void navigator.serviceWorker.register("/sw-site.js", { scope: "/sites/" }).catch(() => {
    /* optional — ignore if blocked */
  });
}
