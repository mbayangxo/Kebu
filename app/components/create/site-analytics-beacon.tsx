"use client";

import { useEffect } from "react";
import { builderDeviceFromWidth } from "@/lib/create/builder-device";

function postEvent(body: Record<string, unknown>) {
  const payload = JSON.stringify(body);
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/sites/analytics", blob);
    return;
  }
  void fetch("/api/sites/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

/** Live-site beacon — pageviews, load timing, web vitals, client errors. */
export function SiteAnalyticsBeacon({
  subdomain,
  path = "/",
}: {
  subdomain: string;
  path?: string;
}) {
  useEffect(() => {
    if (!subdomain) return;
    const device = builderDeviceFromWidth(window.innerWidth);
    const pagePath = path.startsWith("/") ? path : `/${path}`;

    postEvent({
      subdomain,
      eventType: "pageview",
      path: pagePath,
      device,
    });

    const sendLoad = () => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const loadMs = nav
        ? Math.round(nav.loadEventEnd || nav.duration)
        : Math.round(performance.now());
      if (loadMs > 0 && loadMs < 120_000) {
        postEvent({
          subdomain,
          eventType: "perf",
          path: pagePath,
          device,
          metricName: "load",
          metricValue: loadMs,
        });
      }
    };

    if (document.readyState === "complete") sendLoad();
    else window.addEventListener("load", sendLoad, { once: true });

    const onError = (event: ErrorEvent) => {
      const message = String(event.message || "Client error").slice(0, 500);
      postEvent({
        subdomain,
        eventType: "error",
        path: pagePath,
        device,
        message,
        meta: { source: "window.onerror" },
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const message = String(event.reason ?? "Unhandled rejection").slice(0, 500);
      postEvent({
        subdomain,
        eventType: "error",
        path: pagePath,
        device,
        message,
        meta: { source: "unhandledrejection" },
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    let po: PerformanceObserver | null = null;
    try {
      po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const name = entry.name || entry.entryType;
          const value =
            "value" in entry && typeof (entry as PerformanceEntry & { value?: number }).value === "number"
              ? (entry as PerformanceEntry & { value: number }).value
              : entry.duration;
          if (!name || !Number.isFinite(value)) continue;
          const metricName =
            name === "largest-contentful-paint" || entry.entryType === "largest-contentful-paint"
              ? "LCP"
              : name === "first-input" || entry.entryType === "first-input"
                ? "INP"
                : entry.entryType === "layout-shift"
                  ? "CLS"
                  : name.slice(0, 40);
          if (!["LCP", "INP", "CLS", "FCP", "TTFB"].includes(metricName) && entry.entryType !== "paint") {
            continue;
          }
          const resolved =
            entry.entryType === "paint" && name.includes("first-contentful-paint")
              ? "FCP"
              : metricName;
          postEvent({
            subdomain,
            eventType: "vital",
            path: pagePath,
            device,
            metricName: resolved,
            metricValue: Math.round(value * 1000) / 1000,
          });
        }
      });
      po.observe({
        type: "largest-contentful-paint",
        buffered: true,
      } as PerformanceObserverInit);
      po.observe({ type: "paint", buffered: true } as PerformanceObserverInit);
      po.observe({ type: "layout-shift", buffered: true } as PerformanceObserverInit);
    } catch {
      /* older browsers */
    }

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      po?.disconnect();
    };
  }, [subdomain, path]);

  return null;
}
