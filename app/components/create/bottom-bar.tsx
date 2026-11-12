"use client";

import type { ReactNode, CSSProperties } from "react";

type BottomBarProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** z-index level; defaults to 40 (above content, below modals) */
  zIndex?: number;
};

/**
 * Safe-area-aware container for bottom-fixed toolbars.
 * Pads the bottom by env(safe-area-inset-bottom) so content clears the
 * iPhone home indicator and Android navigation bar gesture zone.
 * Use `fixed` or `sticky` positioning on the parent — this component
 * only handles the inner padding and background.
 */
export function BottomBar({ children, className = "", style, zIndex = 40 }: BottomBarProps) {
  return (
    <div
      className={`w-full ${className}`}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
