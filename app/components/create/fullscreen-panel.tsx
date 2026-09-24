"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { Z_LAYERS } from "./kebu-z-layers";
import { acquireScrollLock, releaseScrollLock } from "@/lib/create/scroll-lock";
import { useFocusTrap } from "@/lib/create/use-focus-trap";

type FullscreenPanelProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  triggerRef?: RefObject<HTMLElement | null>;
  className?: string;
  /** If true, renders a close button in the top-right corner. */
  showClose?: boolean;
};

/**
 * Full-viewport overlay panel.  Used for mobile-editor "full screen" views
 * (e.g. editing a section on phone with no canvas chrome).
 *
 * Features:
 * - Portal to document.body
 * - Focus trap + focus restoration
 * - Body scroll lock (iOS-safe)
 * - Escape key handler
 * - role="dialog" / aria-modal / aria-labelledby
 * - All four safe-area insets respected
 * - Fade-in animation
 */
export function FullscreenPanel({
  open,
  onClose,
  title,
  children,
  triggerRef,
  className = "",
  showClose = true,
}: FullscreenPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useRef(`kebu-fsp-${Math.random().toString(36).slice(2, 8)}`).current;

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

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      className={`kebu-fullscreen-panel${className ? ` ${className}` : ""}`}
      style={{
        position: "fixed",
        inset: 0,
        // Respect all safe-area insets
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
        background: "#fff",
        zIndex: Z_LAYERS.fullscreenPanel,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overscrollBehavior: "contain",
      }}
      data-kebu-fullscreen-panel
    >
      {(title || showClose) ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid #F0F0F0",
            flexShrink: 0,
          }}
        >
          {title ? (
            <h2
              id={titleId}
              style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          {showClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                border: "1px solid #E5E5E5",
                background: "#fff",
                cursor: "pointer",
                borderRadius: 8,
                color: "#444",
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
          ) : null}
        </div>
      ) : null}

      <div style={{ flex: 1, overflow: "auto", overscrollBehavior: "contain" }}>
        {children}
      </div>

      <style>{`
        @keyframes kebu-fsp-in {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        .kebu-fullscreen-panel {
          animation: kebu-fsp-in 180ms ease both;
        }
        @media (prefers-reduced-motion: reduce) {
          .kebu-fullscreen-panel { animation: none; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
