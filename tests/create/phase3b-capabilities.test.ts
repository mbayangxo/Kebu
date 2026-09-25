/**
 * Phase 3B capability tests:
 *   1. Responsive visibility (_visibility prop → section.visibility in WD)
 *   2. Safe native motion (_motion prop → SectionMotion in WD)
 *   3. Device composition (device_layouts → deviceLayouts in WD)
 *   4. editor-definition round-trip for all three
 *
 * These tests verify the data contract end-to-end, from what the Builder writes
 * (section.props._visibility / _motion) to what the SiteRenderer reads
 * (section.visibility / section.motion).
 */

import { describe, expect, it } from "vitest";
import { buildDefinitionFromProjectParts } from "@/lib/create/editor-definition";
import { responsiveVisibilitySchema, pageDeviceLayoutsSchema } from "@/lib/create/website-extensions";
import { sectionMotionSchema } from "@/lib/create/website-extensions";
import { normalizeIRMotionSpecs } from "@/lib/adapter/compile-motion";
import type { MotionSpec } from "@/lib/adapter/motion";

// ── Shared fixtures ───────────────────────────────────────────────────────────

const baseProject = {
  title: "Test Site",
  theme: {
    primary: "#111",
    accent: "#0f0",
    background: "#fff",
    text: "#111",
    fontDisplay: "Inter",
    fontBody: "Inter",
    spacing: "comfortable" as const,
    headingScale: "md" as const,
    bodySize: "md" as const,
    letterSpacing: "normal" as const,
  },
};

const basePage = { id: "page-1", slug: "home", title: "Home", sort_order: 0 };

const baseSection = {
  id: "sec-1",
  page_id: "page-1",
  section_type: "hero",
  sort_order: 0,
  props: { title: "Hello" },
};

// ── Responsive Visibility ─────────────────────────────────────────────────────

describe("responsive visibility", () => {
  it("section with no _visibility has no visibility field in WD", () => {
    const def = buildDefinitionFromProjectParts(baseProject, [basePage], [baseSection]);
    const sec = def.pages[0]!.sections[0];
    expect((sec as Record<string, unknown>).visibility).toBeUndefined();
  });

  it("_visibility.hideOn is lifted to section.visibility", () => {
    const section = { ...baseSection, props: { title: "Hello", _visibility: { hideOn: ["mobile"] } } };
    const def = buildDefinitionFromProjectParts(baseProject, [basePage], [section]);
    const sec = def.pages[0]!.sections[0] as Record<string, unknown>;
    expect(sec.visibility).toEqual({ hideOn: ["mobile"] });
  });

  it("_visibility.hideOn desktop + mobile is preserved", () => {
    const section = { ...baseSection, props: { _visibility: { hideOn: ["desktop", "mobile"] } } };
    const def = buildDefinitionFromProjectParts(baseProject, [basePage], [section]);
    const sec = def.pages[0]!.sections[0] as Record<string, unknown>;
    const vis = sec.visibility as { hideOn?: string[] };
    expect(vis.hideOn).toContain("desktop");
    expect(vis.hideOn).toContain("mobile");
  });

  it("_visibility null clears the visibility field", () => {
    const section = { ...baseSection, props: { _visibility: null } };
    const def = buildDefinitionFromProjectParts(baseProject, [basePage], [section]);
    const sec = def.pages[0]!.sections[0] as Record<string, unknown>;
    expect(sec.visibility).toBeUndefined();
  });

  it("responsiveVisibilitySchema accepts hideOn with valid devices", () => {
    expect(responsiveVisibilitySchema.safeParse({ hideOn: ["mobile"] }).success).toBe(true);
    expect(responsiveVisibilitySchema.safeParse({ hideOn: ["desktop", "tablet"] }).success).toBe(true);
  });

  it("responsiveVisibilitySchema rejects showOn + hideOn conflict for the same device", () => {
    // Both hideOn and showOn present for the same device is invalid
    const result = responsiveVisibilitySchema.safeParse({ hideOn: ["mobile"], showOn: ["mobile"] });
    expect(result.success).toBe(false);
  });

  it("responsiveVisibilitySchema rejects invalid device names", () => {
    const result = responsiveVisibilitySchema.safeParse({ hideOn: ["phone"] });
    expect(result.success).toBe(false);
  });

  it("_visibility._visibility is NOT double-lifted (no nested keys)", () => {
    // Only top-level _visibility is lifted; nested _visibility inside it is not a concern
    const section = { ...baseSection, props: { _visibility: { hideOn: ["tablet"] } } };
    const def = buildDefinitionFromProjectParts(baseProject, [basePage], [section]);
    const sec = def.pages[0]!.sections[0] as Record<string, unknown>;
    expect(sec.visibility).toEqual({ hideOn: ["tablet"] });
    expect((sec.props as Record<string, unknown>)._visibility).toEqual({ hideOn: ["tablet"] });
  });
});

// ── Safe Native Motion Contract ───────────────────────────────────────────────

describe("safe native motion — Builder writes SectionMotion to _motion", () => {
  it("_motion with valid SectionMotion is lifted to section.motion", () => {
    const motionValue = {
      specs: [{
        target: "self",
        trigger: "scroll-enter",
        transform: { opacityFrom: 0, opacityTo: 1, translateYFrom: "24px", translateYTo: "0px" },
        durationMs: 600,
        delayMs: 0,
        easing: "ease-out",
        scrollThreshold: 0.15,
        replay: false,
      }],
      reducedMotionFallback: "instant",
    };
    const section = { ...baseSection, props: { _motion: motionValue } };
    const def = buildDefinitionFromProjectParts(baseProject, [basePage], [section]);
    const sec = def.pages[0]!.sections[0] as Record<string, unknown>;
    expect(sec.motion).toEqual(motionValue);
  });

  it("_motion null clears the motion field", () => {
    const section = { ...baseSection, props: { _motion: null } };
    const def = buildDefinitionFromProjectParts(baseProject, [basePage], [section]);
    const sec = def.pages[0]!.sections[0] as Record<string, unknown>;
    expect(sec.motion).toBeUndefined();
  });

  it("sectionMotionSchema validates correct Builder-written SectionMotion", () => {
    const valid = {
      specs: [{
        target: "self",
        trigger: "scroll-enter",
        transform: { opacityFrom: 0, opacityTo: 1 },
        durationMs: 600,
        delayMs: 0,
        easing: "ease-out",
        scrollThreshold: 0.15,
        replay: false,
      }],
      reducedMotionFallback: "instant",
    };
    expect(sectionMotionSchema.safeParse(valid).success).toBe(true);
  });

  it("sectionMotionSchema accepts 'hover' trigger (hover is valid in WD; safe-native restriction is in IR compiler)", () => {
    const withHover = {
      specs: [{
        target: "self",
        trigger: "hover",
        transform: {},
        durationMs: 400,
        delayMs: 0,
        easing: "ease-out",
        scrollThreshold: 0.15,
        replay: false,
      }],
      reducedMotionFallback: "instant",
    };
    expect(sectionMotionSchema.safeParse(withHover).success).toBe(true);
  });

  it("motion transform values are in WD format (string px for translateY)", () => {
    // When Builder writes motion, translateYFrom must be "24px" not 24
    const motionValue = {
      specs: [{
        target: "self",
        trigger: "scroll-enter",
        transform: { opacityFrom: 0, opacityTo: 1, translateYFrom: "24px", translateYTo: "0px" },
        durationMs: 600,
        delayMs: 0,
        easing: "ease-out",
        scrollThreshold: 0.15,
        replay: false,
      }],
      reducedMotionFallback: "instant",
    };
    const result = sectionMotionSchema.safeParse(motionValue);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.specs[0]!.transform.translateYFrom).toBe("string");
      expect(result.data.specs[0]!.transform.translateYFrom).toBe("24px");
    }
  });

  it("reducedMotionFallback 'none' is valid in WD SectionMotion", () => {
    const valid = {
      specs: [{
        target: "self",
        trigger: "load",
        transform: { opacityFrom: 0, opacityTo: 1 },
        durationMs: 400,
        delayMs: 0,
        easing: "linear",
        scrollThreshold: 0.15,
        replay: false,
      }],
      reducedMotionFallback: "none",
    };
    expect(sectionMotionSchema.safeParse(valid).success).toBe(true);
  });
});

// ── IR Motion → WD round-trip (adapter path) ─────────────────────────────────

describe("IR motion → WD via normalizeIRMotionSpecs", () => {
  function makeSpec(overrides: Partial<MotionSpec> = {}): MotionSpec {
    return {
      id: "m-1",
      trigger: "scroll-enter",
      target: "self",
      effect: "fade",
      initialState: { opacity: 0 },
      finalState: { opacity: 1 },
      durationMs: 600,
      delayMs: 0,
      easing: "ease-out",
      reducedMotionFallback: { type: "instant" },
      ...overrides,
    };
  }

  it("compiled WD motion passes sectionMotionSchema validation", () => {
    const result = normalizeIRMotionSpecs([makeSpec()], "sec-1");
    expect(result.motion).toBeDefined();
    const parsed = sectionMotionSchema.safeParse(result.motion);
    expect(parsed.success).toBe(true);
  });

  it("compiled WD trigger is 'scroll-enter' (native)", () => {
    const result = normalizeIRMotionSpecs([makeSpec({ trigger: "scroll-enter" })], "sec-1");
    expect(result.motion?.specs[0]?.trigger).toBe("scroll-enter");
  });

  it("compiled WD trigger is 'load' (native)", () => {
    const result = normalizeIRMotionSpecs([makeSpec({ trigger: "load" })], "sec-1");
    expect(result.motion?.specs[0]?.trigger).toBe("load");
  });

  it("IR number translateY is string px in WD output", () => {
    const spec = makeSpec({ initialState: { y: 24, opacity: 0 }, finalState: { y: 0, opacity: 1 } });
    const result = normalizeIRMotionSpecs([spec], "sec-1");
    expect(result.motion?.specs[0]?.transform.translateYFrom).toBe("24px");
    expect(result.motion?.specs[0]?.transform.translateYTo).toBe("0px");
  });

  it("WD output has required scrollThreshold and replay fields", () => {
    const result = normalizeIRMotionSpecs([makeSpec()], "sec-1");
    const entry = result.motion?.specs[0];
    expect(entry?.scrollThreshold).toBe(0.15);
    expect(entry?.replay).toBe(false);
  });

  it("hover trigger produces unsupported spec + diagnostic, no compiled entry", () => {
    const result = normalizeIRMotionSpecs([makeSpec({ trigger: "hover" })], "sec-1");
    expect(result.motion).toBeUndefined();
    expect(result.unsupportedSpecs).toHaveLength(1);
    expect(result.diagnostics.some((d) => d.code === "MOTION_UNSUPPORTED")).toBe(true);
  });

  it("parallax effect produces unsupported spec + diagnostic", () => {
    const result = normalizeIRMotionSpecs([makeSpec({ effect: "parallax" })], "sec-1");
    expect(result.motion).toBeUndefined();
    expect(result.unsupportedSpecs).toHaveLength(1);
  });

  it("reducedMotionFallback 'none' passes through correctly", () => {
    const spec = makeSpec({ reducedMotionFallback: { type: "none" } });
    const result = normalizeIRMotionSpecs([spec], "sec-1");
    expect(result.motion?.reducedMotionFallback).toBe("none");
  });

  it("reducedMotionFallback 'fade-only' is approximated as 'instant' + diagnostic", () => {
    const spec = makeSpec({ reducedMotionFallback: { type: "fade-only" } });
    const result = normalizeIRMotionSpecs([spec], "sec-1");
    expect(result.motion?.reducedMotionFallback).toBe("instant");
    expect(result.diagnostics.some((d) => d.code === "MOTION_APPROXIMATED")).toBe(true);
  });
});

// ── Device Composition ────────────────────────────────────────────────────────

describe("device composition — device_layouts in WD", () => {
  it("page with no device_layouts has no deviceLayouts in WD", () => {
    const def = buildDefinitionFromProjectParts(baseProject, [basePage], [baseSection]);
    expect((def.pages[0] as Record<string, unknown>).deviceLayouts).toBeUndefined();
  });

  it("page.device_layouts is forwarded to WD.deviceLayouts", () => {
    const page = {
      ...basePage,
      device_layouts: { tablet: { sectionOrder: ["sec-1"] }, mobile: { hiddenSections: ["sec-1"] } },
    };
    const def = buildDefinitionFromProjectParts(baseProject, [page], [baseSection]);
    const devLayouts = (def.pages[0] as Record<string, unknown>).deviceLayouts as {
      tablet?: { sectionOrder?: string[] };
      mobile?: { hiddenSections?: string[] };
    };
    expect(devLayouts?.tablet?.sectionOrder).toEqual(["sec-1"]);
    expect(devLayouts?.mobile?.hiddenSections).toEqual(["sec-1"]);
  });

  it("pageDeviceLayoutsSchema accepts valid sectionOrder and hiddenSections", () => {
    const valid = {
      tablet: { sectionOrder: ["sec-1", "sec-2"] },
      mobile: { hiddenSections: ["sec-2"] },
    };
    expect(pageDeviceLayoutsSchema.safeParse(valid).success).toBe(true);
  });

  it("pageDeviceLayoutsSchema rejects conflicting sectionOrder and hiddenSections for same section", () => {
    const invalid = {
      mobile: { sectionOrder: ["sec-1", "sec-2"], hiddenSections: ["sec-1"] },
    };
    // A section cannot appear in both sectionOrder AND hiddenSections
    const result = pageDeviceLayoutsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("pageDeviceLayoutsSchema accepts undefined (optional)", () => {
    expect(pageDeviceLayoutsSchema.safeParse(undefined).success).toBe(true);
  });

  it("device_layouts null is treated as no deviceLayouts", () => {
    const page = { ...basePage, device_layouts: null };
    const def = buildDefinitionFromProjectParts(baseProject, [page], [baseSection]);
    expect((def.pages[0] as Record<string, unknown>).deviceLayouts).toBeUndefined();
  });
});

// ── Visibility + Device ordering coexistence ──────────────────────────────────

describe("visibility and device composition coexistence", () => {
  it("section can have both _visibility and device_layouts on its page without conflict", () => {
    const page = {
      ...basePage,
      device_layouts: { tablet: { hiddenSections: ["sec-2"] } },
    };
    const sec1 = { ...baseSection, id: "sec-1", props: { _visibility: { hideOn: ["mobile"] } } };
    const sec2 = { id: "sec-2", page_id: "page-1", section_type: "text", sort_order: 1, props: {} };
    const def = buildDefinitionFromProjectParts(baseProject, [page], [sec1, sec2]);
    const sections = def.pages[0]!.sections;
    expect(sections).toHaveLength(2);
    // sec-1 has visibility
    const s1 = sections.find((s) => s.id === "sec-1") as Record<string, unknown>;
    expect(s1?.visibility).toEqual({ hideOn: ["mobile"] });
    // page deviceLayouts is present
    const dl = (def.pages[0] as Record<string, unknown>).deviceLayouts as { tablet?: { hiddenSections?: string[] } };
    expect(dl?.tablet?.hiddenSections).toEqual(["sec-2"]);
  });

  it("section with both _visibility and _motion has both lifted correctly", () => {
    const section = {
      ...baseSection,
      props: {
        _visibility: { hideOn: ["mobile"] },
        _motion: {
          specs: [{
            target: "self",
            trigger: "scroll-enter",
            transform: { opacityFrom: 0, opacityTo: 1 },
            durationMs: 400,
            delayMs: 0,
            easing: "ease-out",
            scrollThreshold: 0.15,
            replay: false,
          }],
          reducedMotionFallback: "instant",
        },
      },
    };
    const def = buildDefinitionFromProjectParts(baseProject, [basePage], [section]);
    const sec = def.pages[0]!.sections[0] as Record<string, unknown>;
    expect(sec.visibility).toEqual({ hideOn: ["mobile"] });
    expect(sec.motion).toBeDefined();
    expect((sec.motion as { specs?: unknown[] })?.specs).toHaveLength(1);
  });
});
