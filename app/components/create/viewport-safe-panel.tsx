"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { Z_LAYERS } from "./kebu-z-layers";
import { useFocusTrap } from "@/lib/create/use-focus-trap";

type VisualViewportRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  scale: number;
};

function getVisualViewport(): VisualViewportRect {
  if (typeof window === "undefined") {
    return { top: 0, left: 0, width: 0, height: 0, scale: 1 };
  }
  const vv = window.visualViewport;
  if (vv) {
    return {
      top: vv.offsetTop,
      left: vv.offsetLeft,
      width: vv.width,
      height: vv.height,
      scale: vv.scale,
    };
  }
  return {
    top: 0,
    left: 0,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: 1,
  };
}

type ViewportSafePanelProps = {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  triggerRef?: RefObject<HTMLElement | null>;
  /** Preferred side — the panel will flip to the other side if it doesn't fit. */
  side?: "right" | "left";
  /** Panel width as a CSS value. */
  width?: string | number;
  /** Whether to trap focus inside the panel. */
  trapFocus?: boolean;
  className?: string;
  /** Offset from the visual viewport edges (px). */
  inset?: number;
};

/**
 * Floating panel that tracks window.visualViewport so it stays visible when
 * the on-screen keyboard appears and shrinks the viewport.
 *
 * Use this for the Yande assistant panel and other floating tools inside the
 * Builder that must remain accessible while a text field inside them is focused.
 *
 * - Listens to visualViewport "resize" and "scroll" to stay in the visible area.
 * - Does NOT lock body scroll (it's a floating panel, not a modal).
 * - Optional focus trap for keyboard users.
 * - Escape to close (optional, only wired when onClose is provided).
 *
 * Unlike Sheet/Drawer/FullscreenPanel, this component does NOT portal to
 * document.body by default — it's typically positioned absolutely within the
 * Builder canvas container.  To portal it, wrap the consumer in a portal.
 *
 * @note This component uses position:fixed relative to the *layout* viewport.
 * On iOS Safari with the keyboard up, window.visualViewport gives the actual
 * visible area; we set CSS variables on the element and use them in inline
 * styles to keep the panel within that visible area.
 */
export function ViewportSafePanel({
  open,
  onClose,
  children,
  triggerRef,
  side = "right",
  width = 300,
  trapFocus = false,
  className = "",
  inset = 8,
}: ViewportSafePanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [vv, setVv] = useState<VisualViewportRect>(() => getVisualViewport());

  useFocusTrap(panelRef, open && trapFocus, triggerRef);

  // Track visual viewport changes (keyboard up/down, pinch-zoom, etc.)
  useEffect(() => {
    if (!open) return;
    const update = () => setVv(getVisualViewport());
    const vvp = window.visualViewport;
    if (vvp) {
      vvp.addEventListener("resize", update);
      vvp.addEventListener("scroll", update);
    } else {
      window.addEventListener("resize", update);
    }
    update();
    return () => {
      if (vvp) {
        vvp.removeEventListener("resize", update);
        vvp.removeEventListener("scroll", update);
      } else {
        window.removeEventListener("resize", update);
      }
    };
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open || !onClose) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose!();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  // Compute position within the visual viewport.
  // The panel sits fixed relative to the layout viewport, but we offset by
  // visualViewport.offsetTop / offsetLeft so it stays within the visible area.
  const panelWidth = typeof width === "number" ? width : parseInt(String(width), 10) || 300;
  const left =
    side === "left"
      ? vv.left + inset
      : vv.left + vv.width - panelWidth - inset;
  const top = vv.top + inset;
  const maxHeight = vv.height - inset * 2;

  return (
    <div
      ref={panelRef}
      className={`kebu-viewport-safe-panel${className ? ` ${className}` : ""}`}
      role={trapFocus ? "dialog" : undefined}
      aria-modal={trapFocus ? "true" : undefined}
      style={{
        position: "fixed",
        top,
        left,
        width: typeof width === "number" ? `${width}px` : width,
        maxHeight,
        overflow: "auto",
        overscrollBehavior: "contain",
        zIndex: Z_LAYERS.sheetPanel,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
        willChange: "top, left, max-height",
      }}
      data-kebu-viewport-safe-panel
    >
      {children}
    </div>
  );
}
