"use client";

import { useEffect, useState, type RefObject } from "react";
import { collageSceneProgress } from "@/lib/create/collage-scroll-scene";

/** One document scroller in live pages, Builder panels and same-origin preview frames. */
export function useCollageScrollScene(sceneRef: RefObject<HTMLDivElement | null>, pinRef: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [state, setState] = useState({ progress: 0, width: 1200 });
  useEffect(() => {
    const scene = sceneRef.current, pin = pinRef.current;
    if (!enabled || !scene || !pin) return;
    const doc = scene.ownerDocument, view = doc.defaultView;
    if (!view) return;
    let scrollParent: HTMLElement | null = scene.parentElement;
    while (scrollParent && scrollParent !== doc.body && scrollParent !== doc.documentElement) {
      const overflow = view.getComputedStyle(scrollParent).overflowY;
      // A panel can become scrollable after images load; don't test its current scrollHeight.
      if (overflow === "auto" || overflow === "scroll") break;
      scrollParent = scrollParent.parentElement;
    }
    if (scrollParent === doc.body || scrollParent === doc.documentElement) scrollParent = null;
    const target = scrollParent ?? view;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = scene.getBoundingClientRect(), pinRect = pin.getBoundingClientRect();
      const top = scrollParent ? scrollParent.getBoundingClientRect().top + scrollParent.clientTop : 0;
      const progress = collageSceneProgress(rect.top, rect.height, pinRect.height, top);
      setState(previous => previous.progress === progress && previous.width === pinRect.width
        ? previous : { progress, width: pinRect.width });
    };
    const schedule = () => { if (!frame) frame = view.requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(scene);
    observer.observe(pin);
    if (scrollParent) observer.observe(scrollParent);
    measure();
    target.addEventListener("scroll", schedule, { passive: true });
    view.addEventListener("resize", schedule);
    return () => {
      target.removeEventListener("scroll", schedule);
      view.removeEventListener("resize", schedule);
      observer.disconnect();
      if (frame) view.cancelAnimationFrame(frame);
    };
  }, [enabled, sceneRef, pinRef]);
  return enabled ? state : { progress: 0, width: state.width };
}
