/** Fire a shop/commerce analytics event from the public storefront. */
export function trackShopEvent(
  subdomain: string,
  eventType: "product_view" | "add_to_cart" | "checkout_start" | "purchase",
  meta?: Record<string, unknown>,
) {
  if (!subdomain || typeof window === "undefined") return;
  const payload = JSON.stringify({
    subdomain,
    eventType,
    path: window.location.pathname,
    device:
      window.innerWidth < 640 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
    meta: {
      ...(meta ?? {}),
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon("/api/sites/analytics", new Blob([payload], { type: "application/json" }));
    return;
  }
  void fetch("/api/sites/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
