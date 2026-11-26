import { describe, expect, it } from "vitest";
import {
  validateSectionResponsiveData,
  validatePageResponsiveData,
  validateTouchTargets,
  assertsSafeAreaInset,
  validateBodyFontSize,
  summariseQa,
} from "@/lib/create/responsive-qa";

describe("responsive QA — section data validators", () => {
  describe("gallery", () => {
    it("warns when desktop >2 cols with no mobile override", () => {
      const v = validateSectionResponsiveData({ type: "gallery", props: { columns: 3 } });
      expect(v).toHaveLength(1);
      expect(v[0]!.rule).toBe("gallery-mobile-columns");
      expect(v[0]!.severity).toBe("warning");
    });

    it("passes when desktop >2 cols but mobile override ≤ 2", () => {
      const v = validateSectionResponsiveData({
        type: "gallery",
        props: {
          columns: 4,
          deviceOverrides: { mobile: { columns: 2 } },
        },
      });
      expect(v).toHaveLength(0);
    });

    it("passes for desktop ≤ 2 columns", () => {
      const v = validateSectionResponsiveData({ type: "gallery", props: { columns: 2 } });
      expect(v).toHaveLength(0);
    });

    it("warns when mobile override is also >2", () => {
      const v = validateSectionResponsiveData({
        type: "gallery",
        props: {
          columns: 4,
          deviceOverrides: { mobile: { columns: 3 } },
        },
      });
      expect(v).toHaveLength(1);
    });
  });

  describe("products", () => {
    it("warns when desktop >2 cols with no mobile override", () => {
      const v = validateSectionResponsiveData({ type: "products", props: { columns: 3 } });
      expect(v[0]!.rule).toBe("products-mobile-columns");
    });

    it("passes when mobile override is 2", () => {
      const v = validateSectionResponsiveData({
        type: "products",
        props: { columns: 4, deviceOverrides: { mobile: { columns: 2 } } },
      });
      expect(v).toHaveLength(0);
    });
  });

  describe("navigation", () => {
    it("errors when navLayout is side", () => {
      const v = validateSectionResponsiveData({ type: "navigation", props: { navLayout: "side" } });
      expect(v[0]!.rule).toBe("nav-side-rail-mobile");
      expect(v[0]!.severity).toBe("error");
    });

    it("passes for top layout", () => {
      const v = validateSectionResponsiveData({ type: "navigation", props: { navLayout: "top" } });
      expect(v).toHaveLength(0);
    });
  });

  describe("free-text", () => {
    it("errors when block extends beyond 96% canvas", () => {
      const v = validateSectionResponsiveData({
        type: "free-text",
        props: { blocks: [{ x: 10, width: 90 }] },
      });
      expect(v[0]!.rule).toBe("free-text-block-overflow");
      expect(v[0]!.severity).toBe("error");
    });

    it("passes when block fits within 96%", () => {
      const v = validateSectionResponsiveData({
        type: "free-text",
        props: { blocks: [{ x: 8, width: 84 }] },
      });
      expect(v).toHaveLength(0);
    });

    it("uses defaults of x=8, width=84 when not specified", () => {
      const v = validateSectionResponsiveData({
        type: "free-text",
        props: { blocks: [{}] },
      });
      expect(v).toHaveLength(0);
    });
  });

  describe("editorial-hero", () => {
    it("warns when height > 90vh", () => {
      const v = validateSectionResponsiveData({ type: "editorial-hero", props: { heightVh: 95 } });
      expect(v[0]!.rule).toBe("editorial-hero-height");
      expect(v[0]!.severity).toBe("warning");
    });

    it("passes at exactly 90vh", () => {
      const v = validateSectionResponsiveData({ type: "editorial-hero", props: { heightVh: 90 } });
      expect(v).toHaveLength(0);
    });
  });

  describe("validatePageResponsiveData", () => {
    it("aggregates violations across sections", () => {
      const violations = validatePageResponsiveData([
        { type: "gallery", props: { columns: 4 } },
        { type: "navigation", props: { navLayout: "side" } },
        { type: "hero", props: {} },
      ]);
      expect(violations).toHaveLength(2);
      expect(violations.map((v) => v.rule)).toContain("gallery-mobile-columns");
      expect(violations.map((v) => v.rule)).toContain("nav-side-rail-mobile");
    });

    it("returns empty array for all-passing sections", () => {
      const violations = validatePageResponsiveData([
        { type: "gallery", props: { columns: 2 } },
        { type: "hero", props: {} },
      ]);
      expect(violations).toHaveLength(0);
    });
  });
});

describe("responsive QA — DOM validators", () => {
  describe("validateTouchTargets", () => {
    it("flags targets below 44×44px", () => {
      const violations = validateTouchTargets([
        { width: 30, height: 30, selector: "button.small" },
        { width: 44, height: 44, selector: "button.ok" },
      ]);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.rule).toBe("touch-target-size");
      expect(violations[0]!.detail).toContain("button.small");
    });

    it("passes targets meeting minimum", () => {
      const violations = validateTouchTargets([
        { width: 48, height: 48, selector: "button.large" },
      ]);
      expect(violations).toHaveLength(0);
    });

    it("respects custom minSize", () => {
      const violations = validateTouchTargets(
        [{ width: 40, height: 40, selector: "button.custom" }],
        36,
      );
      expect(violations).toHaveLength(0);
    });

    it("flags when only one dimension is too small", () => {
      const violations = validateTouchTargets([
        { width: 60, height: 20, selector: "link.short" },
      ]);
      expect(violations).toHaveLength(1);
    });
  });

  describe("assertsSafeAreaInset", () => {
    it("errors when CSS value lacks env(safe-area-inset-*)", () => {
      const violations = assertsSafeAreaInset("0px", "padding-top");
      expect(violations).toHaveLength(1);
      expect(violations[0]!.rule).toBe("safe-area-inset");
    });

    it("passes when CSS references env(safe-area-inset-top)", () => {
      const violations = assertsSafeAreaInset(
        "calc(env(safe-area-inset-top) + 16px)",
        "padding-top",
      );
      expect(violations).toHaveLength(0);
    });
  });

  describe("validateBodyFontSize", () => {
    it("errors when below 14px", () => {
      const violations = validateBodyFontSize(12);
      expect(violations[0]!.rule).toBe("body-font-size");
      expect(violations[0]!.severity).toBe("error");
    });

    it("passes at exactly 14px", () => {
      expect(validateBodyFontSize(14)).toHaveLength(0);
    });

    it("passes above 14px", () => {
      expect(validateBodyFontSize(16)).toHaveLength(0);
    });
  });

  describe("summariseQa", () => {
    it("ok is false when there are errors", () => {
      const result = summariseQa([
        { rule: "nav-side-rail-mobile", severity: "error", detail: "..." },
        { rule: "gallery-mobile-columns", severity: "warning", detail: "..." },
      ]);
      expect(result.ok).toBe(false);
      expect(result.errors).toBe(1);
      expect(result.warnings).toBe(1);
    });

    it("ok is true with only warnings", () => {
      const result = summariseQa([
        { rule: "gallery-mobile-columns", severity: "warning", detail: "..." },
      ]);
      expect(result.ok).toBe(true);
      expect(result.errors).toBe(0);
      expect(result.warnings).toBe(1);
    });

    it("ok is true with no violations", () => {
      const result = summariseQa([]);
      expect(result.ok).toBe(true);
      expect(result.errors).toBe(0);
      expect(result.warnings).toBe(0);
    });
  });
});
