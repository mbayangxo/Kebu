"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";

const BREAKPOINTS: { name: Breakpoint; minWidth: number }[] = [
  { name: "xl", minWidth: 1280 },
  { name: "lg", minWidth: 1024 },
  { name: "md", minWidth: 768 },
  { name: "sm", minWidth: 640 },
  { name: "xs", minWidth: 0 },
];

function resolveBreakpoint(width: number): Breakpoint {
  for (const bp of BREAKPOINTS) {
    if (width >= bp.minWidth) return bp.name;
  }
  return "xs";
}

/**
 * Returns the current Tailwind breakpoint based on window.innerWidth.
 * Eliminates scattered matchMedia() calls — reads once on mount and
 * updates on resize via ResizeObserver on document.documentElement.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => {
    if (typeof window === "undefined") return "md";
    return resolveBreakpoint(window.innerWidth);
  });

  const update = useCallback(() => {
    setBp(resolveBreakpoint(window.innerWidth));
  }, []);

  useEffect(() => {
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    update();
    return () => ro.disconnect();
  }, [update]);

  return bp;
}

/**
 * Returns the Tailwind breakpoint for a *specific element's* width — not the
 * full viewport.  Critical for container-query–style decisions inside the
 * Builder canvas: when the left panel is open the canvas is narrower than the
 * viewport, so viewport-based breakpoints give wrong results for responsive
 * section previews.
 *
 * The returned breakpoint updates whenever the element is resized via
 * ResizeObserver — no polling required.
 *
 * SSR: returns "md" on the server (matching the viewport-based default) and
 * immediately corrects on the first client render via the ResizeObserver
 * callback. Pass an `initialBreakpoint` to override the SSR default.
 */
export function useContainerBreakpoint(
  ref: RefObject<HTMLElement | null>,
  initialBreakpoint: Breakpoint = "md",
): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(initialBreakpoint);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setBp(resolveBreakpoint(entry.contentRect.width));
    });
    ro.observe(el);
    // Set immediately — the ResizeObserver callback fires async.
    setBp(resolveBreakpoint(el.getBoundingClientRect().width));
    return () => ro.disconnect();
    // ref.current won't change identity after mount, so `ref` in deps is stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  return bp;
}

/**
 * Like useContainerBreakpoint but accepts a CSS selector string.
 * Useful for global containers (e.g. "#builder-canvas") without threading a ref.
 */
export function useElementBreakpoint(selector: string): Breakpoint {
  const ref = useRef<HTMLElement | null>(null);
  const [bp, setBp] = useState<Breakpoint>("md");

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(selector);
    ref.current = el;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setBp(resolveBreakpoint(entry.contentRect.width));
    });
    ro.observe(el);
    setBp(resolveBreakpoint(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, [selector]);

  return bp;
}
