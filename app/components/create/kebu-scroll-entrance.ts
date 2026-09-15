"use client";

/**
 * Activates scroll-entrance animations for all .kebu-entrance elements
 * inside a given root. Called once per SiteRenderer mount.
 *
 * Safe to call in SSR — uses typeof window guard. Returns a cleanup fn.
 */
export function initScrollEntrances(root: HTMLElement): () => void {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    return () => { /* noop in SSR */ };
  }

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

  const targets = root.querySelectorAll<HTMLElement>(".kebu-entrance, .kebu-entrance-list");
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
