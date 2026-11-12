"use client";

import { BottomBar } from "./bottom-bar";

type MobileActionBarProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddSection?: () => void;
  /** Current page title — tapped to open page picker */
  pageTitle?: string;
  onPagePicker?: () => void;
};

const BTN =
  "flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold disabled:opacity-30 active:opacity-70";

/**
 * Bottom action bar shown on mobile (<sm) in the Builder.
 * Surfaces Undo, Redo, and Add Section — actions that are `hidden sm:inline`
 * in the top chrome and therefore unreachable on a phone without this bar.
 * Mount this as a `fixed bottom-0 left-0 right-0 sm:hidden` element in the
 * editor page so it disappears at sm breakpoint where the header controls appear.
 */
export function MobileActionBar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddSection,
  pageTitle,
  onPagePicker,
}: MobileActionBarProps) {
  return (
    <BottomBar
      className="fixed bottom-0 left-0 right-0 sm:hidden"
      style={{ borderTop: "1px solid #E5E5E5", background: "#FAFAFA" }}
    >
      <div className="flex items-center justify-between gap-1 px-2 py-1">
        {/* Undo / Redo */}
        <div className="flex gap-0.5">
          <button type="button" onClick={onUndo} disabled={!canUndo} className={BTN} aria-label="Undo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 10H17a5 5 0 0 1 0 10H11" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="7 6 3 10 7 14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Undo</span>
          </button>
          <button type="button" onClick={onRedo} disabled={!canRedo} className={BTN} aria-label="Redo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 10H7a5 5 0 0 0 0 10H13" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="17 6 21 10 17 14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Redo</span>
          </button>
        </div>

        {/* Page selector pill */}
        {pageTitle && onPagePicker ? (
          <button
            type="button"
            onClick={onPagePicker}
            className="flex h-11 items-center gap-1 rounded-full border px-3 text-[11px] font-semibold"
            style={{ borderColor: "#E5E5E5", maxWidth: 130 }}
          >
            <span className="truncate">{pageTitle}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}

        {/* Add section */}
        {onAddSection ? (
          <button
            type="button"
            onClick={onAddSection}
            className={`${BTN} rounded-full bg-black px-4 text-white`}
            aria-label="Add section"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
              <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
            </svg>
            <span>Add</span>
          </button>
        ) : null}
      </div>
    </BottomBar>
  );
}
