"use client";

import type { ReactNode } from "react";

/** Bottom-right FAB column — clears mobile tab bar + safe area on small screens. */
export function FloatingActionStack({ children }: { children: ReactNode }) {
  return (
    <div
      className="fixed z-40 right-4 flex flex-col items-end gap-14 pointer-events-none bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(7.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-28"
      aria-label="Quick actions"
    >
      {children}
    </div>
  );
}

export function FloatingActionItem({ children }: { children: ReactNode }) {
  return <div className="pointer-events-auto shrink-0">{children}</div>;
}
