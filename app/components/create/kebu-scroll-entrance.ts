"use client";

type MotionTransformSpec = {
  opacityFrom?: number; opacityTo?: number;
  translateXFrom?: string; translateXTo?: string;
  translateYFrom?: string; translateYTo?: string;
  scaleFrom?: number; scaleTo?: number;
  rotateFrom?: number; rotateTo?: number;
};
type MotionEntry = {
  trigger: string; transform: MotionTransformSpec;
  durationMs: number; delayMs: number; easing: string;
  scrollThreshold: number; replay: boolean; staggerMs?: number;
};
type MotionSpec = { specs: MotionEntry[]; reducedMotionFallback: "instant" | "none" };

const EASING_MAP: Record<string, string> = {
  linear: "linear", ease: "ease", "ease-in": "ease-in",
  "ease-out": "ease-out", "ease-in-out": "ease-in-out",
  spring: "cubic-bezier(0.22,1,0.36,1)",
};

function applyMotionSpec(el: HTMLElement, spec: MotionSpec, reducedMotion: boolean): void {
  const scrollEntries = spec.specs.filter(e => e.trigger === "scroll-enter");
  if (scrollEntries.length === 0) return;
  const entry = scrollEntries[0];

  if (reducedMotion) {
    if (spec.reducedMotionFallback === "instant") {
      // Jump straight to final state — no animation class, no hidden state
      el.classList.remove("kebu-entrance");
    }
    // "none" → leave element visible as-is (no entrance class stamped)
    return;
  }

  const t = entry.transform;
  const easing = EASING_MAP[entry.easing] ?? "ease-out";
  // Set CSS custom properties that drive the kebu-spec-entrance animation
  if (t.opacityFrom !== undefined) el.style.setProperty("--km-op-from", String(t.opacityFrom));
  if (t.opacityTo !== undefined) el.style.setProperty("--km-op-to", String(t.opacityTo));
  if (t.translateYFrom !== undefined) el.style.setProperty("--km-ty-from", t.translateYFrom);
  if (t.translateYTo !== undefined) el.style.setProperty("--km-ty-to", t.translateYTo);
  if (t.translateXFrom !== undefined) el.style.setProperty("--km-tx-from", t.translateXFrom);
  if (t.translateXTo !== undefined) el.style.setProperty("--km-tx-to", t.translateXTo);
  if (t.scaleFrom !== undefined) el.style.setProperty("--km-sc-from", String(t.scaleFrom));
  if (t.scaleTo !== undefined) el.style.setProperty("--km-sc-to", String(t.scaleTo));
  el.style.setProperty("--km-dur", `${entry.durationMs}ms`);
  el.style.setProperty("--km-delay", `${entry.delayMs ?? 0}ms`);
  el.style.setProperty("--km-ease", easing);
  el.classList.add("kebu-spec-entrance");
}

/**
 * Activates scroll-entrance animations for all .kebu-entrance elements
 * inside a given root. Called once per SiteRenderer mount.
 *
 * Also handles .kebu-spec-entrance elements driven by data-motion-spec attribute
 * (structured SectionMotion specs from Phase 3B).
 *
 * Safe to call in SSR — uses typeof window guard. Returns a cleanup fn.
 */
export function initScrollEntrances(root: HTMLElement): () => void {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    return () => { /* noop in SSR */ };
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Apply structured motion specs before setting up observers
  const specElements = root.querySelectorAll<HTMLElement>("[data-motion-spec]");
  specElements.forEach((el) => {
    try {
      const raw = el.getAttribute("data-motion-spec");
      if (!raw) return;
      const spec = JSON.parse(raw) as MotionSpec;
      applyMotionSpec(el, spec, reducedMotion);
    } catch {
      // Malformed spec — ignore, leave element visible
    }
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("kebu-entered");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
  );

  const targets = root.querySelectorAll<HTMLElement>(".kebu-entrance, .kebu-entrance-list, .kebu-spec-entrance");
  targets.forEach((el) => observer.observe(el));

  return () => observer.disconnect();
}

/**
 * Section-type → motion preset mapping.
 * Used by SiteRenderer to stamp data-motion and kebu-entrance class.
 */
export const ENTRANCE_MOTION: Record<string, string> = {
  hero: "fade-in",
  "editorial-hero": "fade-in",
  split: "fade-up",
  "category-tiles": "fade-up",
  text: "fade-up",
  image: "fade-in",
  gallery: "fade-up",
  features: "fade-up",
  testimonials: "fade-up",
  faq: "fade-up",
  products: "fade-up",
  contact: "fade-up",
  newsletter: "fade-up",
  stats: "fade-up",
  events: "fade-up",
  quiz: "fade-up",
  "before-after": "fade-up",
  "hotspot-image": "fade-in",
  "countdown": "fade-in",
  "trust-badges": "fade-up",
  reviews: "fade-up",
};
