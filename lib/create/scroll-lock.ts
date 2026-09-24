/**
 * Body scroll lock with a reference counter so nested overlays work correctly.
 *
 * Uses position:fixed + negative top to freeze the page at its current scroll
 * position — the only approach that reliably prevents iOS Safari from scrolling
 * the background through a modal or sheet.
 *
 * Usage:
 *   acquireScrollLock()  — when opening an overlay
 *   releaseScrollLock()  — when closing it (in useEffect cleanup)
 *
 * Multiple concurrent overlays are safe: the body stays locked until all
 * callers have released.
 */

let lockCount = 0;

export function acquireScrollLock(): void {
  if (typeof document === "undefined") return;
  lockCount += 1;
  if (lockCount !== 1) return; // Already locked by another overlay

  const body = document.body;
  const scrollY = window.scrollY;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  body.dataset.kebuScrollY = String(scrollY);
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

export function releaseScrollLock(): void {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount !== 0) return; // Another overlay still open

  const body = document.body;
  const scrollY = parseInt(body.dataset.kebuScrollY ?? "0", 10);

  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.overflow = "";
  body.style.paddingRight = "";
  delete body.dataset.kebuScrollY;

  window.scrollTo(0, scrollY);
}

export function getScrollLockCount(): number {
  return lockCount;
}

/** Reset all state — call only in tests. */
export function _resetScrollLockForTesting(): void {
  lockCount = 0;
}
