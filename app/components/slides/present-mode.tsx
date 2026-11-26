"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Slide } from "@/lib/slides/schema";
import { SlideStage, useStageScale } from "@/app/components/slides/slide-render";

type Props = {
  slides: Slide[];
  deckWidth: number;
  deckHeight: number;
  startIndex: number;
  onExit: () => void;
};

/**
 * Real fullscreen presentation: keyboard/click navigation and the slide's
 * own transitionKind actually animating between slides, not a static
 * preview. This is the feature that makes a deck a presentation rather
 * than just an editor with a read-only mode.
 */
export function PresentMode({ slides, deckWidth, deckHeight, startIndex, onExit }: Props) {
  const { containerRef, scale } = useStageScale(deckWidth, deckHeight);
  const [current, setCurrent] = useState(startIndex);
  const [outgoing, setOutgoing] = useState<{ index: number; direction: 1 | -1 } | null>(null);
  const [entered, setEntered] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((nextIndex: number, direction: 1 | -1) => {
    if (nextIndex < 0 || nextIndex >= slides.length || nextIndex === current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setOutgoing({ index: current, direction });
    setCurrent(nextIndex);
    setEntered(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    const durationMs = slides[nextIndex]?.transitionDurationMs ?? 400;
    timerRef.current = setTimeout(() => setOutgoing(null), durationMs + 30);
  }, [current, slides]);

  const next = useCallback(() => goTo(current + 1, 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1, -1), [current, goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      else if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onExit]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const slide = slides[current];
  const transitionKind = slide?.transitionKind ?? "cut";
  const durationMs = slide?.transitionDurationMs ?? 400;
  const outgoingSlide = outgoing ? slides[outgoing.index] : null;

  function incomingStyle(): React.CSSProperties {
    if (transitionKind === "cut") return {};
    const transition = `opacity ${durationMs}ms ease, transform ${durationMs}ms ease`;
    if (transitionKind === "slide") {
      const dir = outgoing?.direction ?? 1;
      return { transition, transform: entered ? "translateX(0%)" : `translateX(${dir * 100}%)` };
    }
    // fade / dissolve
    return { transition, opacity: entered ? 1 : 0 };
  }

  function outgoingStyle(): React.CSSProperties {
    if (!outgoing) return {};
    const transition = `opacity ${durationMs}ms ease, transform ${durationMs}ms ease`;
    if (transitionKind === "slide") {
      return { transition, transform: entered ? `translateX(${-outgoing.direction * 100}%)` : "translateX(0%)" };
    }
    return { transition, opacity: entered ? 0 : 1 };
  }

  return (
    <div
      data-testid="present-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      onClick={(e) => { if ((e.target as HTMLElement).dataset.role !== "nav") next(); }}
    >
      <button type="button" aria-label="Exit presentation" onClick={onExit} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white">
        Esc · Exit
      </button>
      <button type="button" data-role="nav" aria-label="Previous slide" onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white">‹</button>
      <button type="button" data-role="nav" aria-label="Next slide" onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white">›</button>

      <div ref={containerRef} className="relative h-[90vh] w-[92vw] overflow-hidden" style={{ aspectRatio: `${deckWidth} / ${deckHeight}` }}>
        {outgoingSlide ? (
          <div className="absolute inset-0" style={outgoingStyle()}>
            <SlideStage slide={outgoingSlide} deckWidth={deckWidth} deckHeight={deckHeight} scale={scale} />
          </div>
        ) : null}
        {slide ? (
          <div className="absolute inset-0" style={incomingStyle()} data-testid="present-current-stage">
            <SlideStage slide={slide} deckWidth={deckWidth} deckHeight={deckHeight} scale={scale} />
          </div>
        ) : null}
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/50" data-testid="present-position">
        {current + 1} / {slides.length}
      </div>
    </div>
  );
}
