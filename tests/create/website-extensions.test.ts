/**
 * Phase 3 — Kebu Native Aesthetic Capability Extensions
 *
 * Tests cover:
 * - Legacy WebsiteDefinition backward compatibility (existing sections parse without migration)
 * - Device compositions (EXT-WD-002): page-level device layouts, section reordering, conflict validation
 * - Structured motion (EXT-WD-001): motion specs, reduced-motion fallback, selector safety
 * - Accessibility metadata (EXT-WD-003): landmark, label, headingLevel, skipTarget, liveRegion
 * - Responsive visibility (EXT-WD-004): showOn/hideOn, contradictory state rejection
 * - Data binding contract (EXT-WD-005): typed binding, permission tiers, query constraints
 * - Commerce bindings (EXT-WD-006): liveProductIds on products section
 * - Custom interactions (EXT-WD-007): tabs, accordion, carousel, modal, scroll-reveal, hover-state, media-controls
 * - Invalid/hostile declaration rejection
 * - Deterministic serialization (round-trip parse produces identical output)
 * - Adapter capability matrix: all new capabilities remain EXTENSION_REQUIRED (schema only, not end-to-end native)
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  websiteDefinitionSchema,
  websiteSectionSchema,
  websitePageSchema,
  validateWebsiteDefinition,
} from "../../lib/create/website-schema";
import {
  deviceLayoutSchema,
  pageDeviceLayoutsSchema,
  sectionMotionSchema,
  sectionA11ySchema,
  responsiveVisibilitySchema,
  dataBindingSchema,
  commerceBindingSchema,
  sectionInteractionSchema,
  EXTENSION_SCHEMA_VERSION,
} from "../../lib/create/website-extensions";
import { compileIR } from "../../lib/adapter/compile";
import { negotiateCapabilities } from "../../lib/adapter/compile-capabilities";
import type { AdapterDesignIR } from "../../lib/adapter/ir";
import { IR_VERSION, ADAPTER_VERSION } from "../../lib/adapter/versions";

// ── Fixtures ────────────────────────────────────────────────────────────────────

const MINIMAL_THEME = {
  primary: "#0F0D33",
  accent: "#00C851",
  background: "#FAFAF8",
  text: "#0F0D33",
  fontDisplay: "Fraunces",
  fontBody: "system-ui",
  spacing: "comfortable" as const,
};

const MINIMAL_SECTION = {
  id: "hero-1",
  type: "hero" as const,
  props: {
    heading: "Welcome",
    subheading: "Hello world",
    buttonLabel: "Get started",
    buttonHref: "/start",
    imageUrl: "",
  },
};

const MINIMAL_NAV = {
  id: "nav-1",
  type: "navigation" as const,
  props: {
    brand: "Acme",
    links: [{ label: "Home", href: "/" }],
  },
};

const MINIMAL_DEFINITION = {
  schemaVersion: "website-v1" as const,
  title: "Test Site",
  theme: MINIMAL_THEME,
  pages: [
    {
      slug: "home",
      title: "Home",
      sections: [MINIMAL_NAV, MINIMAL_SECTION],
    },
  ],
};

// ── 1. Legacy backward compatibility ──────────────────────────────────────────

describe("backward compatibility — existing definitions parse without migration", () => {
  it("parses a minimal WebsiteDefinition with no extension fields", () => {
    const result = validateWebsiteDefinition(MINIMAL_DEFINITION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // No extension fields present — parsed cleanly
    expect(result.data.pages[0]!.sections[0]!.motion).toBeUndefined();
    expect(result.data.pages[0]!.sections[0]!.a11y).toBeUndefined();
    expect(result.data.pages[0]!.sections[0]!.visibility).toBeUndefined();
    expect(result.data.pages[0]!.sections[0]!.dataBinding).toBeUndefined();
    expect(result.data.pages[0]!.sections[0]!.interaction).toBeUndefined();
    expect(result.data.pages[0]!.deviceLayouts).toBeUndefined();
  });

  it("parses a section with only the existing id+type+props — no new fields required", () => {
    const parsed = websiteSectionSchema.safeParse(MINIMAL_SECTION);
    expect(parsed.success).toBe(true);
  });

  it("parses a page with only slug+title+sections — no deviceLayouts required", () => {
    const parsed = websitePageSchema.safeParse({
      slug: "home",
      title: "Home",
      sections: [MINIMAL_SECTION],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.deviceLayouts).toBeUndefined();
  });

  it("products section without commerceBinding parses correctly", () => {
    const section = {
      type: "products",
      props: {
        heading: "Products",
        items: [],
      },
    };
    const parsed = websiteSectionSchema.safeParse(section);
    expect(parsed.success).toBe(true);
  });

  it("extension schema version is defined and stable", () => {
    expect(EXTENSION_SCHEMA_VERSION).toBe("1.0.0");
  });
});

// ── 2. Device compositions (EXT-WD-002) ──────────────────────────────────────

describe("device compositions — page-level independent device layouts", () => {
  it("page with deviceLayouts tablet reorder validates", () => {
    const parsed = pageDeviceLayoutsSchema.safeParse({
      tablet: { sectionOrder: ["hero-1", "nav-1"] },
    });
    expect(parsed.success).toBe(true);
  });

  it("page with deviceLayouts mobile hide validates", () => {
    const parsed = pageDeviceLayoutsSchema.safeParse({
      mobile: { hiddenSections: ["footer-1"] },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts both tablet and mobile compositions simultaneously", () => {
    const parsed = pageDeviceLayoutsSchema.safeParse({
      tablet: { sectionOrder: ["hero-1", "nav-1"] },
      mobile: { sectionOrder: ["nav-1", "hero-1"], hiddenSections: ["promo-1"] },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a section ID in both sectionOrder and hiddenSections", () => {
    const parsed = deviceLayoutSchema.safeParse({
      sectionOrder: ["hero-1", "nav-1"],
      hiddenSections: ["hero-1"],
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]!.message).toContain("hero-1");
  });

  it("websiteDefinition parses pages with deviceLayouts", () => {
    const def = {
      ...MINIMAL_DEFINITION,
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [MINIMAL_NAV, MINIMAL_SECTION],
          deviceLayouts: {
            mobile: {
              sectionOrder: ["hero-1", "nav-1"],
            },
          },
        },
      ],
    };
    const result = validateWebsiteDefinition(def);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.pages[0]!.deviceLayouts?.mobile?.sectionOrder).toEqual(["hero-1", "nav-1"]);
  });

  it("deviceLayouts is optional — page without it remains valid", () => {
    const parsed = websitePageSchema.safeParse({
      slug: "about",
      title: "About",
      sections: [MINIMAL_SECTION],
    });
    expect(parsed.success).toBe(true);
  });
});

// ── 3. Structured motion (EXT-WD-001) ────────────────────────────────────────

describe("structured motion specs", () => {
  it("parses a valid scroll-enter fade-up spec", () => {
    const parsed = sectionMotionSchema.safeParse({
      specs: [
        {
          target: ".hero-heading",
          trigger: "scroll-enter",
          transform: { opacityFrom: 0, opacityTo: 1, translateYFrom: "24px", translateYTo: "0px" },
          durationMs: 600,
          delayMs: 100,
          easing: "ease-out",
          reducedMotionFallback: undefined,
        },
      ],
      reducedMotionFallback: "instant",
    });
    expect(parsed.success).toBe(true);
  });

  it("parses a hover trigger spec", () => {
    const parsed = sectionMotionSchema.safeParse({
      specs: [
        {
          target: ".product-card",
          trigger: "hover",
          transform: { scaleFrom: 1, scaleTo: 1.04 },
          durationMs: 200,
          easing: "ease-out",
        },
      ],
      reducedMotionFallback: "none",
    });
    expect(parsed.success).toBe(true);
  });

  it("parses a staggered list animation", () => {
    const parsed = sectionMotionSchema.safeParse({
      specs: [
        {
          target: ".feature-item",
          trigger: "scroll-enter",
          transform: { opacityFrom: 0, opacityTo: 1 },
          durationMs: 400,
          staggerMs: 80,
          easing: "ease",
        },
      ],
      reducedMotionFallback: "instant",
    });
    expect(parsed.success).toBe(true);
  });

  it("requires reducedMotionFallback when specs are provided", () => {
    const parsed = sectionMotionSchema.safeParse({
      specs: [
        {
          target: ".hero",
          trigger: "load",
          transform: { opacityFrom: 0, opacityTo: 1 },
          durationMs: 300,
        },
      ],
      // missing reducedMotionFallback
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects durationMs > 5000 (hard cap)", () => {
    const parsed = sectionMotionSchema.safeParse({
      specs: [
        {
          target: ".hero",
          trigger: "load",
          transform: { opacityFrom: 0, opacityTo: 1 },
          durationMs: 10000, // too long
        },
      ],
      reducedMotionFallback: "instant",
    });
    expect(parsed.success).toBe(false);
  });

  it("motion is optional on section — section without motion is valid", () => {
    const parsed = websiteSectionSchema.safeParse(MINIMAL_SECTION);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.motion).toBeUndefined();
  });

  it("section with motion parses and round-trips through websiteSectionSchema", () => {
    const sectionWithMotion = {
      ...MINIMAL_SECTION,
      motion: {
        specs: [
          {
            target: ".hero-heading",
            trigger: "scroll-enter",
            transform: { opacityFrom: 0, opacityTo: 1 },
            durationMs: 500,
          },
        ],
        reducedMotionFallback: "instant" as const,
      },
    };
    const parsed = websiteSectionSchema.safeParse(sectionWithMotion);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.motion?.reducedMotionFallback).toBe("instant");
  });
});

// ── 4. Accessibility metadata (EXT-WD-003) ───────────────────────────────────

describe("accessibility metadata", () => {
  it("parses main landmark on hero section", () => {
    const parsed = sectionA11ySchema.safeParse({ landmark: "main" });
    expect(parsed.success).toBe(true);
  });

  it("parses nav landmark with label", () => {
    const parsed = sectionA11ySchema.safeParse({
      landmark: "nav",
      label: "Primary navigation",
    });
    expect(parsed.success).toBe(true);
  });

  it("requires label when landmark is region", () => {
    const withoutLabel = sectionA11ySchema.safeParse({ landmark: "region" });
    expect(withoutLabel.success).toBe(false);
    if (withoutLabel.success) return;
    expect(withoutLabel.error.issues[0]!.message).toContain('"region"');

    const withLabel = sectionA11ySchema.safeParse({
      landmark: "region",
      label: "Product highlights",
    });
    expect(withLabel.success).toBe(true);
  });

  it("accepts skipTarget flag on one section", () => {
    const parsed = sectionA11ySchema.safeParse({ skipTarget: true });
    expect(parsed.success).toBe(true);
  });

  it("accepts liveRegion polite/assertive", () => {
    expect(sectionA11ySchema.safeParse({ liveRegion: "polite" }).success).toBe(true);
    expect(sectionA11ySchema.safeParse({ liveRegion: "assertive" }).success).toBe(true);
  });

  it("accepts headingLevel 1 through 6", () => {
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      expect(sectionA11ySchema.safeParse({ headingLevel: level }).success).toBe(true);
    }
  });

  it("rejects headingLevel 0 or 7", () => {
    expect(sectionA11ySchema.safeParse({ headingLevel: 0 }).success).toBe(false);
    expect(sectionA11ySchema.safeParse({ headingLevel: 7 }).success).toBe(false);
  });

  it("a11y is optional on section — section without a11y is valid", () => {
    const parsed = websiteSectionSchema.safeParse(MINIMAL_SECTION);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.a11y).toBeUndefined();
  });
});

// ── 5. Responsive visibility (EXT-WD-004) ────────────────────────────────────

describe("responsive visibility", () => {
  it("showOn desktop only is valid", () => {
    const parsed = responsiveVisibilitySchema.safeParse({ showOn: ["desktop"] });
    expect(parsed.success).toBe(true);
  });

  it("hideOn mobile is valid", () => {
    const parsed = responsiveVisibilitySchema.safeParse({ hideOn: ["mobile"] });
    expect(parsed.success).toBe(true);
  });

  it("showOn desktop+tablet (hide on mobile) is valid", () => {
    const parsed = responsiveVisibilitySchema.safeParse({ showOn: ["desktop", "tablet"] });
    expect(parsed.success).toBe(true);
  });

  it("rejects showOn + hideOn with overlapping device", () => {
    const parsed = responsiveVisibilitySchema.safeParse({
      showOn: ["desktop", "mobile"],
      hideOn: ["mobile"],
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]!.message).toContain("mobile");
  });

  it("rejects showOn all 3 devices (redundant)", () => {
    const parsed = responsiveVisibilitySchema.safeParse({
      showOn: ["desktop", "tablet", "mobile"],
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]!.message).toContain("redundant");
  });

  it("rejects hideOn all 3 devices (should use section.hidden instead)", () => {
    const parsed = responsiveVisibilitySchema.safeParse({
      hideOn: ["desktop", "tablet", "mobile"],
    });
    expect(parsed.success).toBe(false);
  });

  it("visibility is optional — section without visibility is valid", () => {
    const parsed = websiteSectionSchema.safeParse(MINIMAL_SECTION);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.visibility).toBeUndefined();
  });

  it("section with visibility.hideOn mobile parses through websiteSectionSchema", () => {
    const section = {
      ...MINIMAL_SECTION,
      visibility: { hideOn: ["mobile" as const] },
    };
    const parsed = websiteSectionSchema.safeParse(section);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.visibility?.hideOn).toContain("mobile");
  });
});

// ── 6. Data binding contract (EXT-WD-005) ────────────────────────────────────

describe("data binding contract", () => {
  it("parses a public products binding", () => {
    const parsed = dataBindingSchema.safeParse({
      entityType: "products",
      permission: "public",
      unavailableBehavior: "static-fallback",
    });
    expect(parsed.success).toBe(true);
  });

  it("parses an owner-scoped events binding with query", () => {
    const parsed = dataBindingSchema.safeParse({
      entityType: "events",
      permission: "owner",
      query: {
        limit: 10,
        sortBy: "eventDate",
        sortOrder: "asc",
      },
      unavailableBehavior: "placeholder",
    });
    expect(parsed.success).toBe(true);
  });

  it("parses a binding with entityId (specific entity)", () => {
    const parsed = dataBindingSchema.safeParse({
      entityType: "collections",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
      permission: "public",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid entityType", () => {
    const parsed = dataBindingSchema.safeParse({
      entityType: "arbitrary-table",
      permission: "public",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects non-UUID entityId", () => {
    const parsed = dataBindingSchema.safeParse({
      entityType: "products",
      entityId: "not-a-uuid",
      permission: "public",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects query.limit > 100", () => {
    const parsed = dataBindingSchema.safeParse({
      entityType: "posts",
      permission: "public",
      query: { limit: 200 },
    });
    expect(parsed.success).toBe(false);
  });

  it("dataBinding is optional — section without it is valid", () => {
    const parsed = websiteSectionSchema.safeParse(MINIMAL_SECTION);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.dataBinding).toBeUndefined();
  });

  it("filter bag accepts string/number/boolean values but rejects arrays", () => {
    const validFilter = dataBindingSchema.safeParse({
      entityType: "products",
      permission: "public",
      query: { filter: { category: "skincare", inStock: true, minPrice: 1000 } },
    });
    expect(validFilter.success).toBe(true);
  });
});

// ── 7. Commerce bindings (EXT-WD-006) ────────────────────────────────────────

describe("commerce bindings on products section", () => {
  it("parses commerce binding with liveProductIds", () => {
    const parsed = commerceBindingSchema.safeParse({
      liveProductIds: [
        "550e8400-e29b-41d4-a716-446655440001",
        "550e8400-e29b-41d4-a716-446655440002",
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("parses commerce binding with hideOutOfStock", () => {
    const parsed = commerceBindingSchema.safeParse({
      liveProductIds: ["550e8400-e29b-41d4-a716-446655440001"],
      hideOutOfStock: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects non-UUID product ids", () => {
    const parsed = commerceBindingSchema.safeParse({
      liveProductIds: ["not-a-uuid"],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects empty liveProductIds array", () => {
    const parsed = commerceBindingSchema.safeParse({
      liveProductIds: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("products section accepts commerceBinding in props", () => {
    const section = {
      type: "products",
      props: {
        heading: "My Products",
        items: [],
        commerceBinding: {
          liveProductIds: ["550e8400-e29b-41d4-a716-446655440001"],
          hideOutOfStock: false,
        },
      },
    };
    const parsed = websiteSectionSchema.safeParse(section);
    expect(parsed.success).toBe(true);
  });

  it("products section without commerceBinding still valid (graceful fallback)", () => {
    const section = {
      type: "products",
      props: {
        heading: "Products",
        items: [
          {
            name: "Sérum Éclat",
            description: "Brightening serum",
            priceLabel: "25 000 XOF",
            imageUrl: "",
          },
        ],
      },
    };
    const parsed = websiteSectionSchema.safeParse(section);
    expect(parsed.success).toBe(true);
  });
});

// ── 8. Custom interactions (EXT-WD-007) ──────────────────────────────────────

describe("custom interactions — declarative behavior primitives", () => {
  it("parses tabs interaction", () => {
    const parsed = sectionInteractionSchema.safeParse({
      type: "tabs",
      defaultTab: 0,
      transition: "fade",
    });
    expect(parsed.success).toBe(true);
  });

  it("parses accordion with multiExpand", () => {
    const parsed = sectionInteractionSchema.safeParse({
      type: "accordion",
      multiExpand: true,
      defaultOpen: -1,
    });
    expect(parsed.success).toBe(true);
  });

  it("parses carousel with autoplay", () => {
    const parsed = sectionInteractionSchema.safeParse({
      type: "carousel",
      autoplayMs: 5000,
      showArrows: true,
      showDots: false,
      loop: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("parses modal with timer open", () => {
    const parsed = sectionInteractionSchema.safeParse({
      type: "modal",
      openOn: "timer",
      timerMs: 3000,
      backdropClose: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("parses scroll-reveal", () => {
    const parsed = sectionInteractionSchema.safeParse({
      type: "scroll-reveal",
      animation: "fade-up",
      staggerMs: 60,
      threshold: 0.12,
    });
    expect(parsed.success).toBe(true);
  });

  it("parses hover-state", () => {
    const parsed = sectionInteractionSchema.safeParse({
      type: "hover-state",
      effect: "image-swap",
      durationMs: 200,
    });
    expect(parsed.success).toBe(true);
  });

  it("parses media-controls", () => {
    const parsed = sectionInteractionSchema.safeParse({
      type: "media-controls",
      autoplay: true,
      muted: true,
      loop: false,
      controlStyle: "kebu",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown interaction type", () => {
    const parsed = sectionInteractionSchema.safeParse({
      type: "arbitrary-js-widget",
    });
    expect(parsed.success).toBe(false);
  });

  it("interaction is optional — section without interaction is valid", () => {
    const parsed = websiteSectionSchema.safeParse(MINIMAL_SECTION);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.interaction).toBeUndefined();
  });

  it("section with carousel interaction round-trips through websiteSectionSchema", () => {
    const section = {
      ...MINIMAL_SECTION,
      interaction: {
        type: "carousel" as const,
        autoplayMs: 4000,
        showArrows: true,
        showDots: true,
        loop: true,
      },
    };
    const parsed = websiteSectionSchema.safeParse(section);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.interaction?.type).toBe("carousel");
  });
});

// ── 9. Invalid/hostile declaration rejection ─────────────────────────────────

describe("hostile/invalid declaration rejection", () => {
  it("rejects motion target with script-injection attempt", () => {
    // The target regex /^[a-z0-9\-_.[\]"='#\s,+>~:]+$/i should reject this
    const parsed = sectionMotionSchema.safeParse({
      specs: [
        {
          target: "div; import('evil')",
          trigger: "load",
          transform: { opacityFrom: 0, opacityTo: 1 },
          durationMs: 300,
        },
      ],
      reducedMotionFallback: "instant",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects motion target with JS protocol", () => {
    const parsed = sectionMotionSchema.safeParse({
      specs: [
        {
          target: "javascript:alert(1)",
          trigger: "load",
          transform: {},
          durationMs: 300,
        },
      ],
      reducedMotionFallback: "instant",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects data binding with executable code in filter", () => {
    const parsed = dataBindingSchema.safeParse({
      entityType: "products",
      permission: "public",
      query: {
        filter: {
          // Array value — should be rejected (only string/number/boolean allowed)
          category: ["skincare", "haircare"] as unknown as string,
        },
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects visibilty with overlapping show+hide on same device", () => {
    const parsed = responsiveVisibilitySchema.safeParse({
      showOn: ["desktop"],
      hideOn: ["desktop"],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects oversized liveProductIds (> 24)", () => {
    const manyIds = Array.from({ length: 25 }, (_, i) =>
      `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`
    );
    const parsed = commerceBindingSchema.safeParse({ liveProductIds: manyIds });
    expect(parsed.success).toBe(false);
  });

  it("rejects device composition with too many section IDs (> 40)", () => {
    const manyIds = Array.from({ length: 41 }, (_, i) => `section-${i}`);
    const parsed = deviceLayoutSchema.safeParse({ sectionOrder: manyIds });
    expect(parsed.success).toBe(false);
  });

  it("rejects accessibility label > 120 chars", () => {
    const parsed = sectionA11ySchema.safeParse({
      landmark: "nav",
      label: "x".repeat(121),
    });
    expect(parsed.success).toBe(false);
  });
});

// ── 10. Deterministic serialization ──────────────────────────────────────────

describe("deterministic serialization — round-trip stability", () => {
  it("full definition with all extension fields round-trips through websiteDefinitionSchema", () => {
    const fullDef = {
      schemaVersion: "website-v1" as const,
      title: "Extended Site",
      theme: MINIMAL_THEME,
      pages: [
        {
          slug: "home",
          title: "Home",
          deviceLayouts: {
            mobile: {
              sectionOrder: ["hero-1", "nav-1"],
              hiddenSections: [],
            },
          },
          sections: [
            {
              ...MINIMAL_NAV,
              a11y: { landmark: "banner" as const },
              visibility: { hideOn: ["mobile" as const] },
            },
            {
              ...MINIMAL_SECTION,
              motion: {
                specs: [
                  {
                    target: ".hero-heading",
                    trigger: "scroll-enter" as const,
                    transform: { opacityFrom: 0, opacityTo: 1 },
                    durationMs: 500,
                    easing: "ease-out" as const,
                  },
                ],
                reducedMotionFallback: "instant" as const,
              },
              a11y: { landmark: "main" as const, skipTarget: true },
              visibility: { showOn: ["desktop" as const, "tablet" as const] },
              interaction: {
                type: "scroll-reveal" as const,
                animation: "fade-up" as const,
                staggerMs: 60,
                threshold: 0.12,
              },
            },
          ],
        },
      ],
    };

    const result = validateWebsiteDefinition(fullDef);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Round-trip: serialize then re-parse
    const serialized = JSON.stringify(result.data);
    const reparsed = validateWebsiteDefinition(JSON.parse(serialized));
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;

    // Output must be identical
    expect(JSON.stringify(reparsed.data)).toBe(serialized);
  });

  it("two identical inputs produce identical serialization", () => {
    const def1 = JSON.parse(JSON.stringify(MINIMAL_DEFINITION));
    const def2 = JSON.parse(JSON.stringify(MINIMAL_DEFINITION));

    const r1 = validateWebsiteDefinition(def1);
    const r2 = validateWebsiteDefinition(def2);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    expect(JSON.stringify(r1.data)).toBe(JSON.stringify(r2.data));
  });
});

// ── 11. Adapter capability matrix ────────────────────────────────────────────
//
// Verifies that the Phase 3 capabilities are honestly classified.
// Schema + validation exist; rendering + Builder editing do NOT — so they
// remain EXTENSION_REQUIRED, not NATIVE.

// ── Complete IR fixture helpers (all required fields per adapterDesignIRSchema) ─

const MATRIX_RUN_ID = "00000000-0000-4000-8000-000000000003";

const MATRIX_FONT: AdapterDesignIR["fonts"][number] = {
  contractVersion: "1",
  role: "display",
  family: "Fraunces",
  source: "google-fonts",
  weights: [400, 700],
  styles: ["normal"],
  fallbackStack: ["Georgia", "serif"],
  license: { spdx: "OFL-1.1", commercialUse: true, webEmbedAllowed: true },
};

const MATRIX_DIAGNOSTICS: AdapterDesignIR["diagnostics"] = {
  entries: [],
  errorCount: 0,
  warningCount: 0,
  infoCount: 0,
  blockedCount: 0,
  hasBlockers: false,
};

const MATRIX_CERT: AdapterDesignIR["certificationStatus"] = {
  status: "PENDING",
  adapterVersion: ADAPTER_VERSION,
  contractVersion: "1",
  fidelity: [],
  diagnostics: MATRIX_DIAGNOSTICS,
  galleryEligible: false,
  blockers: [],
};

const MATRIX_PROVENANCE: AdapterDesignIR["provenance"] = {
  provenanceVersion: "1",
  sourceType: "manual",
  adapterVersion: ADAPTER_VERSION,
  adapterRunId: MATRIX_RUN_ID,
  assets: [],
  fonts: [],
  transformations: [],
};

function makeMinimalIR(overrides: Partial<AdapterDesignIR> = {}): AdapterDesignIR {
  return {
    irVersion: IR_VERSION,
    adapterVersion: ADAPTER_VERSION,
    adapterRunId: MATRIX_RUN_ID,
    sourceType: "manual",
    title: "Test",
    colorSystem: {
      primary: "#0F0D33",
      accent: "#00C851",
      background: "#FAFAF8",
      text: "#0F0D33",
    },
    fonts: [MATRIX_FONT],
    pages: [
      {
        id: "page-home",
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "hero-1",
            sectionType: "hero",
            sortOrder: 0,
            props: { heading: "Hello" },
          },
        ],
      },
    ],
    capabilityOverflows: [],
    diagnostics: MATRIX_DIAGNOSTICS,
    provenance: MATRIX_PROVENANCE,
    certificationStatus: MATRIX_CERT,
    ...overrides,
  };
}

describe("adapter capability matrix — Phase 3B native classification", () => {
  it("motion capability is NATIVE after Phase 3B — schema, persistence, rendering, reduced-motion all wired", () => {
    const ir = makeMinimalIR({
      capabilityOverflows: [
        { capability: "motion", classification: "EXTENSION_REQUIRED", preservedIn: "ir-field" },
      ],
    });
    const { report } = compileIR(ir);
    const motionEntry = report.capabilities.find((e) => e.capability === "motion");
    // Phase 3B: section.motion is now fully wired through schema → persist → render → publish
    expect(motionEntry?.behavior).toBe("compiled");
    expect(motionEntry?.classification).toBe("NATIVE");
  });

  it("device-independent-compositions stays EXTENSION_REQUIRED — full contract not yet implemented", () => {
    const ir = makeMinimalIR({
      capabilityOverflows: [
        { capability: "device-independent-compositions", classification: "EXTENSION_REQUIRED", preservedIn: "ir-field" },
      ],
    });
    const { report } = compileIR(ir);
    const entry = report.capabilities.find((e) => e.capability === "device-independent-compositions");
    // Ordering + visibility wired, but per-device presentation, Builder UI, and overwrite guards are incomplete.
    expect(entry?.behavior).toBe("preserved-in-ir");
    expect(entry?.classification).toBe("EXTENSION_REQUIRED");
  });

  it("accessibility-metadata in IR stays EXTENSION_REQUIRED after Phase 3B", () => {
    const ir = makeMinimalIR({
      capabilityOverflows: [
        { capability: "accessibility-metadata", classification: "EXTENSION_REQUIRED", preservedIn: "ir-field" },
      ],
    });
    const { report } = compileIR(ir);
    const entry = report.capabilities.find((e) => e.capability === "accessibility-metadata");
    expect(entry?.behavior).toBe("preserved-in-ir");
  });

  it("responsive-visibility is NATIVE after Phase 3B — section.visibility applied in SiteRenderer", () => {
    const ir = makeMinimalIR({
      capabilityOverflows: [
        { capability: "responsive-visibility", classification: "EXTENSION_REQUIRED", preservedIn: "ir-field" },
      ],
    });
    const { report } = compileIR(ir);
    const entry = report.capabilities.find((e) => e.capability === "responsive-visibility");
    // Phase 3B: section.visibility.hideOn/showOn applied before section render loop
    expect(entry?.behavior).toBe("compiled");
    expect(entry?.classification).toBe("NATIVE");
  });

  it("commerce-product-bindings in IR stays EXTENSION_REQUIRED after Phase 3", () => {
    const ir = makeMinimalIR({
      capabilityOverflows: [
        { capability: "commerce-product-bindings", classification: "EXTENSION_REQUIRED", preservedIn: "ir-field" },
      ],
    });
    const { report } = compileIR(ir);
    const entry = report.capabilities.find((e) => e.capability === "commerce-product-bindings");
    expect(entry?.behavior).toBe("preserved-in-ir");
  });

  it("custom-interactions in IR stays EXTENSION_REQUIRED after Phase 3", () => {
    const ir = makeMinimalIR({
      capabilityOverflows: [
        { capability: "custom-interactions", classification: "EXTENSION_REQUIRED", preservedIn: "ir-field" },
      ],
    });
    const { report } = compileIR(ir);
    const entry = report.capabilities.find((e) => e.capability === "custom-interactions");
    expect(entry?.behavior).toBe("preserved-in-ir");
  });

  it("editable-content (native) stays NATIVE after Phase 3 — no regression", () => {
    // editable-content is always added by negotiateCapabilities(); no overflow needed
    const ir = makeMinimalIR();
    const { report } = compileIR(ir);
    const entry = report.capabilities.find((e) => e.capability === "editable-content");
    expect(entry?.behavior).toBe("compiled");
  });

  it("compilationBlocked remains false for a clean IR with extension capabilities", () => {
    const ir = makeMinimalIR({
      capabilityOverflows: [
        { capability: "motion", classification: "EXTENSION_REQUIRED", preservedIn: "ir-field" },
        { capability: "responsive-visibility", classification: "EXTENSION_REQUIRED", preservedIn: "ir-field" },
        { capability: "accessibility-metadata", classification: "EXTENSION_REQUIRED", preservedIn: "ir-field" },
      ],
    });
    const { websiteDefinition, report } = compileIR(ir);
    expect(report.compilationBlocked).toBe(false);
    expect(websiteDefinition).not.toBeNull();
  });

  it("materialLossDetected is true when any EXTENSION_REQUIRED capability is present", () => {
    // motion/device-independent-compositions/responsive-visibility are now NATIVE (Phase 3B).
    // Use accessibility-metadata which remains EXTENSION_REQUIRED.
    const ir = makeMinimalIR({
      capabilityOverflows: [
        { capability: "accessibility-metadata", classification: "EXTENSION_REQUIRED", preservedIn: "ir-field" },
      ],
    });
    const { report } = compileIR(ir);
    expect(report.materialLossDetected).toBe(true);
  });
});

// ── 12. May Lècor regression — owner-portfolio types still blocked ────────────

const LECOR_RUN_ID = "00000000-0000-4000-8000-000000000099";

const LECOR_FONT: AdapterDesignIR["fonts"][number] = {
  contractVersion: "1",
  role: "display",
  family: "Playfair Display",
  source: "google-fonts",
  weights: [400, 700],
  styles: ["normal", "italic"],
  fallbackStack: ["Georgia", "serif"],
  license: { spdx: "OFL-1.1", commercialUse: true, webEmbedAllowed: true },
};

const LECOR_DIAGNOSTICS: AdapterDesignIR["diagnostics"] = {
  entries: [],
  errorCount: 0,
  warningCount: 0,
  infoCount: 0,
  blockedCount: 0,
  hasBlockers: false,
};

const LECOR_CERT: AdapterDesignIR["certificationStatus"] = {
  status: "PENDING",
  adapterVersion: ADAPTER_VERSION,
  contractVersion: "1",
  fidelity: [],
  diagnostics: LECOR_DIAGNOSTICS,
  galleryEligible: false,
  blockers: [],
};

const LECOR_PROVENANCE: AdapterDesignIR["provenance"] = {
  provenanceVersion: "1",
  sourceType: "manual",
  adapterVersion: ADAPTER_VERSION,
  adapterRunId: LECOR_RUN_ID,
  assets: [],
  fonts: [],
  transformations: [],
};

describe("May Lècor regression — owner-portfolio types still blocked after Phase 3", () => {
  it("maylecor-home section type still blocks compilation", () => {
    const ir: AdapterDesignIR = {
      irVersion: IR_VERSION,
      adapterVersion: ADAPTER_VERSION,
      adapterRunId: LECOR_RUN_ID,
      sourceType: "manual",
      title: "May Lècor Site",
      colorSystem: { primary: "#000", accent: "#fff", background: "#fff", text: "#000" },
      fonts: [LECOR_FONT],
      pages: [
        {
          id: "page-home",
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "home-1",
              sectionType: "maylecor-home",
              sortOrder: 0,
              props: { artistName: "May Lècor" },
            },
          ],
        },
      ],
      diagnostics: LECOR_DIAGNOSTICS,
      provenance: LECOR_PROVENANCE,
      certificationStatus: LECOR_CERT,
    };

    const { websiteDefinition, report } = compileIR(ir);
    expect(report.compilationBlocked).toBe(true);
    expect(websiteDefinition).toBeNull();
    expect(report.blockingReasons.some((r) => r.includes("maylecor-home"))).toBe(true);
  });

  it("maylecor-home with Phase 3 a11y metadata still blocks (Phase 3 does not bypass security)", () => {
    const ir: AdapterDesignIR = {
      irVersion: IR_VERSION,
      adapterVersion: ADAPTER_VERSION,
      adapterRunId: LECOR_RUN_ID,
      sourceType: "manual",
      title: "May Lècor Site",
      colorSystem: { primary: "#000", accent: "#fff", background: "#fff", text: "#000" },
      fonts: [LECOR_FONT],
      pages: [
        {
          id: "page-home",
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "home-1",
              sectionType: "maylecor-home",
              sortOrder: 0,
              props: { artistName: "May Lècor" },
              // Even with a11y metadata, owner-portfolio types are still blocked
              accessibilityMetadata: {
                ariaLabel: "main content",
              },
            },
          ],
        },
      ],
      diagnostics: LECOR_DIAGNOSTICS,
      provenance: LECOR_PROVENANCE,
      certificationStatus: LECOR_CERT,
    };

    const { websiteDefinition, report } = compileIR(ir);
    expect(report.compilationBlocked).toBe(true);
    expect(websiteDefinition).toBeNull();
  });
});
