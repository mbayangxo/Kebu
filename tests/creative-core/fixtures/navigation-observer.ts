import type { Page } from "playwright/test";

/** Browser events across document navigations; diagnostic fixture, never application code. */
export async function observeNavigation(page: Page) {
  const events: unknown[] = [];
  await page.exposeFunction("__kebuNavigationEvent", (event: unknown) => events.push(event));
  await page.addInitScript(() => {
    const report = (event: unknown) => { void (window as unknown as { __kebuNavigationEvent: (event: unknown) => Promise<void> }).__kebuNavigationEvent(event); };
    const ids = new WeakMap<Element, number>(); let sequence = 0;
    const identify = (element: Element | null) => {
      if (!element) return null;
      if (!ids.has(element)) ids.set(element, ++sequence);
      return { id: ids.get(element), tag: element.tagName, text: element.textContent?.slice(0, 60), href: element.getAttribute("href") };
    };
    for (const type of ["pointerdown", "pointerup", "click"]) document.addEventListener(type, event => {
      const pointer = event as MouseEvent, target = event.target instanceof Element ? event.target : null;
      queueMicrotask(() => report({ type, url: location.href, target: identify(target), anchor: identify(target?.closest("a") ?? null),
        atPoint: identify(document.elementFromPoint(pointer.clientX, pointer.clientY)), x: pointer.clientX, y: pointer.clientY,
        connected: target?.isConnected, prevented: event.defaultPrevented, ready: document.readyState,
        mode: document.documentElement.dataset.kebuDataMode, fonts: document.fonts.status }));
    }, true);
    new MutationObserver(changes => {
      for (const change of changes) for (const removed of change.removedNodes) {
        if (!(removed instanceof Element)) continue;
        const anchors = [...(removed.matches("a") ? [removed] : []), ...removed.querySelectorAll("a")];
        if (anchors.length) report({ type: "anchors-removed", url: location.href, anchors: anchors.map(identify) });
      }
    }).observe(document, { childList: true, subtree: true });
  });
  return events;
}
