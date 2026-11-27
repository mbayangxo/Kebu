"use client";

import { useSyncExternalStore } from "react";
import { readAisleFromUrl, writeAisleToUrl } from "@/lib/shop/storefront-aisle-location";

const aisleChanged = "kebu:storefront-aisle-change";

function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(aisleChanged, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(aisleChanged, listener);
  };
}

function getServerSelection() {
  return "";
}

function getSelection() {
  return readAisleFromUrl(new URL(window.location.href));
}

function subscribeToNothing() {
  return () => {};
}

export function useStorefrontAisle(enabled: boolean) {
  return useSyncExternalStore(
    enabled ? subscribe : subscribeToNothing,
    enabled ? getSelection : getServerSelection,
    getServerSelection,
  );
}

export function selectStorefrontAisle(aisle: string) {
  const current = new URL(window.location.href);
  const next = writeAisleToUrl(current, aisle);
  if (next.href === current.href) return;
  window.history.pushState(null, "", next);
  window.dispatchEvent(new Event(aisleChanged));
}
