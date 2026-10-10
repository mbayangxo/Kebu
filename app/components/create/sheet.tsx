"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { Z_LAYERS } from "./kebu-z-layers";
import { acquireScrollLock, releaseScrollLock } from "@/lib/create/scroll-lock";
import { useFocusTrap } from "@/lib/create/use-focus-trap";

type SheetProps = {
  /** Whether the sheet is visible. When false, the sheet is not in the DOM. */
  open: boolean;
  onClose: () => void;
  /** Optional accessible heading for the sheet (used in aria-labelledby). */
  title?: string;
  children: ReactNode;
  /** Ref to the element that triggered the sheet — focus returns here on close. */
  triggerRef?: RefObject<HTMLElement | null>;
  /** Maximum height as a CSS value; defaults to "85dvh". */
  maxHeight?: string;
  /** Additional class names for the sheet panel. */
  className?: string;
};

const BACKDROP_STYLE: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  zIndex: Z_LAYERS.sheetBackdrop,
  WebkitTapHighlightColor: "transparent",
};

const PANEL_STYLE: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  background: "#fff",
  borderRadius: "16px 16px 0 0",
  zIndex: Z_LAYERS.sheetPanel,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  overscrollBehavior: "contain",
  // Safe-area: clear the home indicator on iPhone
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
  // Slide-up animation applied via CSS class below
  willChange: "transform",
};

const DRAG_HANDLE_STYLE: React.CSSProperties = {
  width: 40,
  height: 4,
  borderRadius: 2,
  background: "#E0E0E0",
  margin: "12px auto 0",
  flexShrink: 0,
};

const HEADER_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 16px 12px",
  borderBottom: "1px solid #F0F0F0",
  flexShrink: 0,
};

/**
 * Mobile-first bottom sheet with:
 * - Portal to document.body (SSR-safe, outside z-index stacking contexts)
 * - Focus trap (Tab/Shift+Tab cycle within sheet; focus restored on close)
 * - Body scroll lock (iOS Safari-safe via position:fixed)
 * - Escape key handler
 * - Backdrop click to dismiss
 * - role="dialog" / aria-modal / aria-labelledby
 * - env(safe-area-inset-bottom) clearance
 * - overscroll-behavior:contain (prevents page scroll bleed-through)
 * - Slide-up CSS animation
 * - Drag handle for affordance
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  triggerRef,
  maxHeight = "85dvh",
  className = "",
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useRef(`kebu-sheet-${Math.random().toString(36).slice(2, 8)}`).current;

  // Focus trap — active when sheet is open.
  useFocusTrap(panelRef, open, triggerRef);

  // Scroll lock.
  useEffect(() => {
    if (!open) return;
    acquireScrollLock();
    return () => releaseScrollLock();
  }, [open]);

  // Escape key handler.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        style={BACKDROP_STYLE}
        onClick={onClose}
        aria-hidden="true"
        data-kebu-sheet-backdrop
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`kebu-sheet-panel${className ? ` ${className}` : ""}`}
        style={{ ...PANEL_STYLE, maxHeight }}
        data-kebu-sheet-panel
      >
        {/* Drag handle */}
        <div style={DRAG_HANDLE_STYLE} aria-hidden="true" />

        {/* Header — only rendered when a title is given */}
        {title ? (
          <div style={HEADER_STYLE}>
            <h2
              id={titleId}
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                lineHeight: "20px",
                color: "#1A1A1A",
              }}
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                border: "none",
                background: "none",
                cursor: "pointer",
                borderRadius: 6,
                color: "#666",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : null}

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>{children}</div>
      </div>

      <style>{`
        @keyframes kebu-sheet-in {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .kebu-sheet-panel {
          animation: kebu-sheet-in 220ms cubic-bezier(0.32, 0.72, 0, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .kebu-sheet-panel { animation: none; }
        }
      `}</style>
    </>,
    document.body,
  );
}
