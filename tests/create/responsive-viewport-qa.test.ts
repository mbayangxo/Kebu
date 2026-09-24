/**
 * Item 14 — Viewport-width QA tests
 *
 * These are the unit-test tier of device viewport tests. They exercise the
 * QA utilities and responsive composer against the canonical breakpoints
 * (390px phone, 768px tablet, 1440px desktop) to catch layout regressions
 * before reaching Playwright E2E.
 *
 * Full browser E2E at these widths (touch targets, overflow, safe-area insets)
 * lives in e2e/responsive-viewports.spec.ts and requires a running server.
 */

import { describe, expect, it } from "vitest";
import { KEBU_SITE_RESPONSIVE_BREAKPOINTS } from "@/lib/create/site-responsive";
import { generateDeviceOverrides } from "@/lib/create/responsive-composer";
import {
  validateSectionResponsiveData,
  validateTouchTargets,
  assertsSafeAreaInset,
  validateBodyFontSize,
  summariseQa,
} from "@/lib/create/responsive-qa";
import {
  storeAutoOverrides,
  getResponsiveState,
} from "@/lib/create/device-overrides";

const { mobileMax, tabletMax } = KEBU_SITE_RESPONSIVE_BREAKPOINTS;

// ---------------------------------------------------------------------------
// Breakpoint contract
// ---------------------------------------------------------------------------

describe("viewport breakpoint contract", () => {
  it("phone breakpoint is ≤ 640px", () => {
    expect(mobileMax).toBe(640);
  });

  it("tablet breakpoint is ≤ 1024px", () => {
    expect(tabletMax).toBeLessThanOrEqual(1024);
  });

  it("390px is classified as mobile", () => {
    expect(390).toBeLessThanOrEqual(mobileMax);
  });

  it("768px is tablet range", () => {
    expect(768).toBeGreaterThan(mobileMax);
    expect(768).toBeLessThanOrEqual(tabletMax ?? 1024);
  });

  it("1440px is desktop range", () => {
    expect(1440).toBeGreaterThan(tabletMax ?? 1024);
  });
});

// ---------------------------------------------------------------------------
// Composer at each device tier
// ---------------------------------------------------------------------------

describe("smart composer — phone (390px)", () => {
  it("gallery: 1 column on phone", () => {
    const bag = generateDeviceOverrides("gallery", { columns: 4 });
    expect(bag.mobile?.columns).toBe(1);
  });

  it("products: 2-column grid on phone", () => {
    const bag = generateDeviceOverrides("products", { columns: 3 });
    expect(bag.mobile?.columns).toBe(2);
    expect(bag.mobile?.layout).toBe("grid");
  });

  it("navigation: compact top layout on phone", () => {
    const bag = generateDeviceOverrides("navigation", { navSize: "large" });
    expect(bag.mobile?.navSize).toBe("compact");
    expect(bag.mobile?.navLayout).toBe("top");
  });

  it("editorial-hero: capped at 60vh on phone", () => {
    const bag = generateDeviceOverrides("editorial-hero", { heightVh: 90 });
    expect((bag.mobile?.heightVh as number)).toBeLessThanOrEqual(60);
  });

  it("video: 1 column single layout on phone", () => {
    const bag = generateDeviceOverrides("video", { columns: 2 });
    expect(bag.mobile?.columns).toBe(1);
    expect(bag.mobile?.layout).toBe("single");
  });

  it("category-tiles: 2 columns on phone", () => {
    const bag = generateDeviceOverrides("category-tiles", { columns: 4 });
    expect(bag.mobile?.columns).toBe(2);
  });
});

describe("smart composer — tablet (768px)", () => {
  it("gallery: ≤ 2 columns on tablet", () => {
    const bag = generateDeviceOverrides("gallery", { columns: 4 });
    expect((bag.tablet?.columns as number) ?? 4).toBeLessThanOrEqual(2);
  });

  it("products: ≤ 2 columns on tablet", () => {
    const bag = generateDeviceOverrides("products", { columns: 4 });
    const tabletCols = (bag.tablet?.columns as number) ?? 4;
    expect(tabletCols).toBeLessThanOrEqual(2);
  });

  it("editorial-hero: capped at 70vh on tablet", () => {
    const bag = generateDeviceOverrides("editorial-hero", { heightVh: 90 });
    expect((bag.tablet?.heightVh as number)).toBeLessThanOrEqual(70);
  });

  it("category-tiles: ≤ 3 columns on tablet", () => {
    const bag = generateDeviceOverrides("category-tiles", { columns: 5 });
    const tabletCols = (bag.tablet?.columns as number) ?? 5;
    expect(tabletCols).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Auto-override lifecycle across viewport changes
// ---------------------------------------------------------------------------

describe("auto-override lifecycle — viewport-aware state transitions", () => {
  it("storing phone overrides marks state as auto", () => {
    const phoneOverrides = generateDeviceOverrides("gallery", { columns: 4 });
    const section = { columns: 4 };
    const withAuto = storeAutoOverrides(section, phoneOverrides);
    expect(getResponsiveState(withAuto)).toBe("auto");
  });

  it("changing columns invalidates the auto state (needs-review)", () => {
    const original = { columns: 4 };
    const phoneOverrides = generateDeviceOverrides("gallery", original);
    const withAuto = storeAutoOverrides(original, phoneOverrides);
    const changed = { ...withAuto, columns: 3 };
    expect(getResponsiveState(changed)).toBe("needs-review");
  });

  it("re-applying composer with new props restores auto state", () => {
    const original = { columns: 4 };
    const firstOverrides = generateDeviceOverrides("gallery", original);
    const withFirst = storeAutoOverrides(original, firstOverrides);
    const changed = { ...withFirst, columns: 3 };

    const refreshedOverrides = generateDeviceOverrides("gallery", changed);
    const reapplied = storeAutoOverrides(changed, refreshedOverrides);
    expect(getResponsiveState(reapplied)).toBe("auto");
  });
});

// ---------------------------------------------------------------------------
// QA checks at phone dimensions
// ---------------------------------------------------------------------------

describe("QA at phone viewport (390px)", () => {
  it("gallery with 4 desktop columns needs a mobile override", () => {
    const v = validateSectionResponsiveData({ type: "gallery", props: { columns: 4 } });
    expect(v.some((x) => x.rule === "gallery-mobile-columns")).toBe(true);
  });

  it("gallery with auto-generated mobile override passes QA", () => {
    const bag = generateDeviceOverrides("gallery", { columns: 4 });
    const propsWithOverrides = storeAutoOverrides({ columns: 4 }, bag);
    const v = validateSectionResponsiveData({ type: "gallery", props: propsWithOverrides });
    expect(v).toHaveLength(0);
  });

  it("editorial hero at 95vh is flagged", () => {
    const v = validateSectionResponsiveData({ type: "editorial-hero", props: { heightVh: 95 } });
    expect(v.some((x) => x.rule === "editorial-hero-height")).toBe(true);
  });

  it("side-rail nav is an error at all viewport widths", () => {
    const v = validateSectionResponsiveData({ type: "navigation", props: { navLayout: "side" } });
    const qa = summariseQa(v);
    expect(qa.ok).toBe(false);
    expect(qa.errors).toBeGreaterThan(0);
  });

  it("body font below 14px is flagged", () => {
    expect(validateBodyFontSize(12)).toHaveLength(1);
    expect(validateBodyFontSize(14)).toHaveLength(0);
  });

  it("touch targets below 44px on phone are flagged", () => {
    const violations = validateTouchTargets([
      { width: 30, height: 30, selector: "a.small-cta" },
      { width: 44, height: 44, selector: "button.nav-hamburger" },
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain("a.small-cta");
  });

  it("fixed bar without safe-area-inset is flagged", () => {
    const violations = assertsSafeAreaInset("0px", "padding-bottom");
    expect(violations).toHaveLength(1);
  });

  it("fixed bar with safe-area-inset is clean", () => {
    const violations = assertsSafeAreaInset(
      "calc(env(safe-area-inset-bottom, 0px) + 8px)",
      "padding-bottom",
    );
    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Full page QA — realistic mixed-section page at each device tier
// ---------------------------------------------------------------------------

describe("full page QA — mixed section page passes at all viewport tiers", () => {
  const cleanPage = [
    { type: "navigation", props: { navLayout: "top" } },
    { type: "hero", props: { align: "center" } },
    { type: "gallery", props: { columns: 2 } },
    { type: "products", props: { columns: 2, layout: "grid" } },
    { type: "editorial-hero", props: { heightVh: 70 } },
    { type: "footer", props: {} },
  ];

  it("clean page has no errors at any device tier", () => {
    const violations = validateSectionResponsiveData;
    for (const section of cleanPage) {
      const v = violations(section);
      const errors = v.filter((x) => x.severity === "error");
      expect(errors).toHaveLength(0);
    }
  });

  it("clean page passes page-level QA summary", () => {
    const qa = summariseQa(
      cleanPage.flatMap((s) => validateSectionResponsiveData(s)),
    );
    expect(qa.ok).toBe(true);
    expect(qa.errors).toBe(0);
  });
});
