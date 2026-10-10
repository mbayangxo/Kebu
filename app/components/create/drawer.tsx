"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { Z_LAYERS } from "./kebu-z-layers";
import { acquireScrollLock, releaseScrollLock } from "@/lib/create/scroll-lock";
import { useFocusTrap } from "@/lib/create/use-focus-trap";

export type DrawerSide = "left" | "right";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Which edge the drawer slides in from. */
  side?: DrawerSide;
  title?: string;
  children: ReactNode;
  triggerRef?: RefObject<HTMLElement | null>;
  /** Width as a CSS value; defaults to "min(320px, 90vw)". */
  width?: string;
  className?: string;
};

/**
 * Side-sliding drawer overlay with:
 * - Portal to document.body
 * - Focus trap (Tab/Shift+Tab; focus restored on close)
 * - Body scroll lock (iOS-safe)
 * - Escape key handler
 * - Backdrop click to dismiss
 * - role="dialog" / aria-modal / aria-labelledby
 * - Safe-area clearance on the hinge side
 * - Slide-in CSS animation from left or right
 */
export function Drawer({
  open,
  onClose,
  side = "left",
  title,
  children,
  triggerRef,
  width = "min(320px, 90vw)",
  className = "",
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useRef(`kebu-drawer-${Math.random().toString(36).slice(2, 8)}`).current;

  useFocusTrap(panelRef, open, triggerRef);

  useEffect(() => {
    if (!open) return;
    acquireScrollLock();
    return () => releaseScrollLock();
  }, [open]);

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

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    bottom: 0,
    [side]: 0,
    width,
    background: "#fff",
    zIndex: Z_LAYERS.drawerPanel,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    overscrollBehavior: "contain",
    display: "flex",
    flexDirection: "column",
    // Safe-area for the open edge
    paddingLeft: side === "left" ? "env(safe-area-inset-left, 0px)" : undefined,
    paddingRight: side === "right" ? "env(safe-area-inset-right, 0px)" : undefined,
    willChange: "transform",
  };

  const slideClass = `kebu-drawer-panel-${side}`;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: Z_LAYERS.drawerBackdrop,
          WebkitTapHighlightColor: "transparent",
        }}
        onClick={onClose}
        aria-hidden="true"
        data-kebu-drawer-backdrop
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`${slideClass}${className ? ` ${className}` : ""}`}
        style={panelStyle}
        data-kebu-drawer-panel
      >
        {title ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: "1px solid #F0F0F0",
              flexShrink: 0,
            }}
          >
            <h2
              id={titleId}
              style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}
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

        <div style={{ flex: 1, overflow: "auto", overscrollBehavior: "contain" }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes kebu-drawer-in-left {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        @keyframes kebu-drawer-in-right {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .kebu-drawer-panel-left {
          animation: kebu-drawer-in-left 220ms cubic-bezier(0.32, 0.72, 0, 1) both;
        }
        .kebu-drawer-panel-right {
          animation: kebu-drawer-in-right 220ms cubic-bezier(0.32, 0.72, 0, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .kebu-drawer-panel-left,
          .kebu-drawer-panel-right { animation: none; }
        }
      `}</style>
    </>,
    document.body,
  );
}
