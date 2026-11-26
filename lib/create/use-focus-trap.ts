"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "details > summary:first-child",
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
    (el) =>
      !el.closest("[inert]") &&
      getComputedStyle(el).display !== "none" &&
      getComputedStyle(el).visibility !== "hidden",
  );
}

/**
 * Traps keyboard focus within `containerRef` when `active` is true.
 *
 * - Tab/Shift+Tab cycle within the focusable children, wrapping at the edges.
 * - On activation: moves focus to the first focusable child inside the container.
 * - On deactivation: restores focus to `restoreRef` (the trigger element).
 *
 * SSR-safe: all DOM access is inside useEffect.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  restoreRef?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    // Move focus into the panel on open.
    const els = getFocusableElements(container);
    const firstFocusable = els[0];
    if (firstFocusable) {
      firstFocusable.focus({ preventScroll: true });
    } else {
      // Make the container itself focusable as a fallback so focus isn't lost.
      container.setAttribute("tabindex", "-1");
      container.focus({ preventScroll: true });
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = getFocusableElements(container!);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === container) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || document.activeElement === container) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Remove fallback tabindex if we added it.
      if (container.getAttribute("tabindex") === "-1") {
        container.removeAttribute("tabindex");
      }
      // Restore focus to the trigger element.
      const restore = restoreRef?.current ?? null;
      if (restore && typeof restore.focus === "function") {
        restore.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef, restoreRef]);
}
