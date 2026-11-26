"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import type { BuilderDevice } from "./builder-device";
import { DEVICE_MAX_WIDTH_QUERIES, deviceFromMediaMatches } from "./device-composition";

/** Element that had focus when the latest breakpoint change was observed. */
let focusedAtTransition: Element | null = null;

function subscribe(onChange: () => void): () => void {
  const lists = Object.values(DEVICE_MAX_WIDTH_QUERIES).map((q) => window.matchMedia(q));
  const handler = () => {
    focusedAtTransition = document.activeElement;
    onChange();
  };
  for (const list of lists) list.addEventListener("change", handler);
  return () => {
    for (const list of lists) list.removeEventListener("change", handler);
  };
}

function getSnapshot(): BuilderDevice {
  return deviceFromMediaMatches((q) => window.matchMedia(q).matches);
}

/** Server render (and hydration) use Desktop — the canonical composition. */
function getServerSnapshot(): BuilderDevice {
  return "desktop";
}

/**
 * Device of the current viewport, for published pages.
 *
 * Re-composing the page for a new device moves section nodes, and moving a node that
 * contains the focused element blurs it. Focus is restored to that element after the
 * re-composition commits, so a breakpoint change never silently drops keyboard focus.
 */
export function useViewportDevice(): BuilderDevice {
  const device = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useLayoutEffect(() => {
    const el = focusedAtTransition;
    focusedAtTransition = null;
    if (el instanceof HTMLElement && el.isConnected && el !== document.body && document.activeElement !== el) {
      el.focus({ preventScroll: true });
    }
  }, [device]);
  return device;
}
