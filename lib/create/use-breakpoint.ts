"use client";

import { useCallback, useEffect, useState } from "react";

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
