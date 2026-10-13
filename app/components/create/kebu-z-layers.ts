/**
 * Shared z-index scale for Kebu's Builder/site chrome.
 *
 * Per docs/product/KEBU-BUILDER-UX-STANDARD.md §4 ("Layering"): never solve a stacking problem by
 * picking an arbitrary bigger number. Every new overlay should import a named layer from here instead
 * of hard-coding a Tailwind `z-*`/`z-[n]` class or an inline `zIndex`. This file does not yet cover
 * every overlay in the app (that migration is tracked separately) — it starts with the layers involved
 * in the documented desktop-dropdown / mobile-drawer collision in `site-renderer.tsx`'s `SiteNav`,
 * and is meant to be extended in place as more overlays adopt it, not replaced.
 *
 * Ordering (lowest to highest): page content sits below everything here.
 */
export const Z_LAYERS = {
  /** In-flow chrome that only needs to sit above ordinary page content (e.g. a sticky/selected badge). */
  chromeOverlay: 40,
  /** Click-outside catcher for an inline dropdown (e.g. a nav "group" menu). Below the drawer layer so
   *  a drawer opened while a dropdown is showing always wins the stacking order, not just DOM order. */
  dropdownBackdrop: 45,
  /** The dropdown/menu panel itself, above its own backdrop. */
  dropdownPanel: 46,
  /** Mobile nav drawer backdrop — intentionally above dropdownBackdrop; the two are also made mutually
   *  exclusive in state (opening one closes the other), so this ordering is a second, independent
   *  safety net rather than the only thing preventing an overlap. */
  drawerBackdrop: 50,
  /** The drawer panel itself. */
  drawerPanel: 51,
  /** Bottom-sheet backdrop — sits above the drawer layer. */
  sheetBackdrop: 100,
  /** The sheet panel itself. */
  sheetPanel: 101,
  /** Fullscreen overlay panels (e.g. mobile editor full-screen). */
  fullscreenBackdrop: 150,
  fullscreenPanel: 151,
  /** App-level modal dialogs (confirmation dialogs, upload pickers, etc.). */
  modalBackdrop: 200,
  modalPanel: 201,
} as const;

export type KebuZLayer = keyof typeof Z_LAYERS;
