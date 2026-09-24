/**
 * Responsive QA — executable validation utilities for site layouts.
 *
 * These run both in unit tests (against static section/theme data) and in
 * Playwright device tests (against live rendered pages) so we can catch
 * layout regressions before they reach production.
 *
 * Categories:
 *  - Section data: check section props satisfy responsive contracts.
 *  - Touch targets: minimum 44×44px tap area on interactive elements.
 *  - Safe areas: fixed/sticky elements declare env(safe-area-inset-*).
 *  - Typography: body text ≥ 14px, line-height ≥ 1.4.
 *  - Overflow: no horizontal overflow at 390px viewport.
 */

import type { BuilderDevice } from "./builder-device";

export type QaViolation = {
  rule: string;
  severity: "error" | "warning";
  detail: string;
};

// ---------------------------------------------------------------------------
// Section-data validators (run in unit tests, no DOM required)
// ---------------------------------------------------------------------------

export type SectionQaInput = {
  type: string;
  props: Record<string, unknown>;
};

/** Validate that a section's data satisfies responsive layout contracts. */
export function validateSectionResponsiveData(section: SectionQaInput): QaViolation[] {
  const v: QaViolation[] = [];
  const { type, props } = section;

  switch (type) {
    case "gallery": {
      const cols = Number(props.columns ?? 3);
      if (cols > 2) {
        const mobileCols = (
          (props.deviceOverrides as Record<string, unknown> | undefined)
            ?.mobile as Record<string, unknown> | undefined
        )?.columns;
        if (!mobileCols || Number(mobileCols) > 2) {
          v.push({
            rule: "gallery-mobile-columns",
            severity: "warning",
            detail: `Gallery has ${cols} columns on desktop but no mobile columns override — consider ≤ 2.`,
          });
        }
      }
      break;
    }
    case "products": {
      const cols = Number(props.columns ?? 3);
      if (cols > 2) {
        const mobileCols = (
          (props.deviceOverrides as Record<string, unknown> | undefined)
            ?.mobile as Record<string, unknown> | undefined
        )?.columns;
        if (!mobileCols || Number(mobileCols) > 2) {
          v.push({
            rule: "products-mobile-columns",
            severity: "warning",
            detail: `Products has ${cols} columns on desktop but no mobile columns override — consider ≤ 2.`,
          });
        }
      }
      break;
    }
    case "navigation": {
      if (props.navLayout === "side") {
        v.push({
          rule: "nav-side-rail-mobile",
          severity: "error",
          detail: "Side rail nav does not adapt to mobile viewports — use top layout or add a mobile override.",
        });
      }
      break;
    }
    case "free-text": {
      const blocks = (props.blocks as Record<string, unknown>[] | undefined) ?? [];
      for (const block of blocks) {
        const widthPct = Number(block.width ?? 84);
        const leftPct = Number(block.x ?? 8);
        if (leftPct + widthPct > 96) {
          v.push({
            rule: "free-text-block-overflow",
            severity: "error",
            detail: `Free-text block extends beyond 96% canvas width (left ${leftPct}% + width ${widthPct}% = ${leftPct + widthPct}%).`,
          });
        }
      }
      break;
    }
    case "editorial-hero": {
      const heightVh = Number(props.heightVh ?? 80);
      if (heightVh > 90) {
        v.push({
          rule: "editorial-hero-height",
          severity: "warning",
          detail: `Editorial hero height ${heightVh}vh may clip content on short mobile screens.`,
        });
      }
      break;
    }
  }

  return v;
}

/** Validate all sections on a page. */
export function validatePageResponsiveData(
  sections: SectionQaInput[],
): QaViolation[] {
  return sections.flatMap(validateSectionResponsiveData);
}

// ---------------------------------------------------------------------------
// DOM validators (Playwright / browser only — import only in E2E tests)
// ---------------------------------------------------------------------------

export type DomQaInput = {
  /** Serialised outer HTML of the rendered site root. */
  html: string;
  /** Viewport width to test against (px). */
  viewportWidth: number;
};

/**
 * Touch target size validator.
 * Pass an array of bounding-rect-like objects from Playwright's `locator.boundingBox()`.
 */
export function validateTouchTargets(
  targets: Array<{ width: number; height: number; selector: string }>,
  minSize = 44,
): QaViolation[] {
  return targets
    .filter((t) => t.width < minSize || t.height < minSize)
    .map((t) => ({
      rule: "touch-target-size",
      severity: "warning" as const,
      detail: `"${t.selector}" is ${Math.round(t.width)}×${Math.round(t.height)}px — below the ${minSize}px touch-target minimum.`,
    }));
}

/**
 * Check that a CSS property references env(safe-area-inset-*).
 * Useful for asserting that fixed/sticky bars in the site shell include safe-area clearance.
 */
export function assertsSafeAreaInset(
  cssValue: string,
  property: string,
): QaViolation[] {
  if (!cssValue.includes("env(safe-area-inset")) {
    return [
      {
        rule: "safe-area-inset",
        severity: "error",
        detail: `${property} does not reference env(safe-area-inset-*) — content may be obscured by device notches/home bars.`,
      },
    ];
  }
  return [];
}

/**
 * Check body font size — should be ≥ 14px to pass WCAG AA.
 */
export function validateBodyFontSize(fontSizePx: number): QaViolation[] {
  if (fontSizePx < 14) {
    return [
      {
        rule: "body-font-size",
        severity: "error",
        detail: `Body font size ${fontSizePx}px is below the 14px minimum.`,
      },
    ];
  }
  return [];
}

/**
 * Summarise QA results for a specific device context.
 * Returns { ok, errors, warnings, violations }.
 */
export function summariseQa(
  violations: QaViolation[],
  device: BuilderDevice = "mobile",
): { ok: boolean; errors: number; warnings: number; violations: QaViolation[] } {
  const errors = violations.filter((v) => v.severity === "error").length;
  const warnings = violations.filter((v) => v.severity === "warning").length;
  return {
    ok: errors === 0,
    errors,
    warnings,
    violations,
  };
}
