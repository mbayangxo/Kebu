import { describe, expect, it } from "vitest";
import {
  generateDeviceOverrides,
  mergeAutoOverrides,
  COMPOSABLE_SECTION_TYPES,
} from "@/lib/create/responsive-composer";

describe("responsive composer", () => {
  it("returns empty bag for unknown section types", () => {
    const bag = generateDeviceOverrides("unknown-type", {});
    expect(bag).toEqual({});
  });

  it("exports COMPOSABLE_SECTION_TYPES set", () => {
    expect(COMPOSABLE_SECTION_TYPES.has("gallery")).toBe(true);
    expect(COMPOSABLE_SECTION_TYPES.has("navigation")).toBe(true);
    expect(COMPOSABLE_SECTION_TYPES.has("products")).toBe(true);
    expect(COMPOSABLE_SECTION_TYPES.has("unknown-type")).toBe(false);
  });

  describe("gallery composer", () => {
    it("reduces columns on tablet and mobile", () => {
      const bag = generateDeviceOverrides("gallery", { columns: 4 });
      expect(bag.tablet?.columns).toBe(2);
      expect(bag.mobile?.columns).toBe(1);
    });

    it("produces no tablet override when desktop is already 2 columns", () => {
      const bag = generateDeviceOverrides("gallery", { columns: 2 });
      expect(bag.tablet).toEqual({});
      expect(bag.mobile?.columns).toBe(1);
    });

    it("uses default of 3 columns when none specified", () => {
      const bag = generateDeviceOverrides("gallery", {});
      expect(bag.tablet?.columns).toBe(2);
      expect(bag.mobile?.columns).toBe(1);
    });
  });

  describe("products composer", () => {
    it("reduces to 2 on tablet and 2 grid on mobile", () => {
      const bag = generateDeviceOverrides("products", { columns: 4, layout: "grid" });
      expect(bag.tablet?.columns).toBe(2);
      expect(bag.mobile?.columns).toBe(2);
      expect(bag.mobile?.layout).toBe("grid");
    });

    it("preserves carousel layout on mobile", () => {
      const bag = generateDeviceOverrides("products", { columns: 3, layout: "carousel" });
      expect(bag.mobile?.layout).toBe("carousel");
    });
  });

  describe("navigation composer", () => {
    it("forces compact top layout on mobile", () => {
      const bag = generateDeviceOverrides("navigation", {});
      expect(bag.mobile?.navSize).toBe("compact");
      expect(bag.mobile?.navLayout).toBe("top");
    });

    it("downgrades fullscreen to large on tablet", () => {
      const bag = generateDeviceOverrides("navigation", { navSize: "fullscreen" });
      expect(bag.tablet?.navSize).toBe("large");
    });

    it("keeps other sizes on tablet", () => {
      const bag = generateDeviceOverrides("navigation", { navSize: "compact" });
      expect(bag.tablet?.navSize).toBe("compact");
    });
  });

  describe("editorial-hero composer", () => {
    it("caps height at 70vh on tablet and 60vh on mobile", () => {
      const bag = generateDeviceOverrides("editorial-hero", { heightVh: 95 });
      expect(bag.tablet?.heightVh).toBe(70);
      expect(bag.mobile?.heightVh).toBe(60);
    });

    it("does not add heightVh if already under cap", () => {
      const bag = generateDeviceOverrides("editorial-hero", { heightVh: 50 });
      expect(bag.tablet?.heightVh).toBeUndefined();
      expect(bag.mobile?.heightVh).toBeUndefined();
    });

    it("always sets align to center", () => {
      const bag = generateDeviceOverrides("editorial-hero", { heightVh: 50, align: "left" });
      expect(bag.tablet?.align).toBe("center");
      expect(bag.mobile?.align).toBe("center");
    });
  });

  describe("stats composer", () => {
    it("converts row layout to grid on mobile", () => {
      const bag = generateDeviceOverrides("stats", { layout: "row" });
      expect(bag.mobile?.layout).toBe("grid");
    });

    it("returns empty bag for non-row layout", () => {
      const bag = generateDeviceOverrides("stats", { layout: "grid" });
      expect(bag).toEqual({});
    });
  });

  describe("countdown composer", () => {
    it("converts hero to strip on mobile", () => {
      const bag = generateDeviceOverrides("countdown", { layout: "hero" });
      expect(bag.mobile?.layout).toBe("strip");
    });

    it("returns empty bag for non-hero layout", () => {
      const bag = generateDeviceOverrides("countdown", { layout: "strip" });
      expect(bag).toEqual({});
    });
  });

  describe("category-tiles composer", () => {
    it("reduces columns at tablet and mobile", () => {
      const bag = generateDeviceOverrides("category-tiles", { columns: 5 });
      expect(bag.tablet?.columns).toBe(3);
      expect(bag.mobile?.columns).toBe(2);
    });

    it("no tablet change when desktop is already 3", () => {
      const bag = generateDeviceOverrides("category-tiles", { columns: 3 });
      expect(bag.tablet).toEqual({});
    });
  });

  describe("video composer", () => {
    it("collapses to 1 column on tablet and mobile", () => {
      const bag = generateDeviceOverrides("video", { columns: 3 });
      expect(bag.tablet?.columns).toBe(1);
      expect(bag.mobile?.columns).toBe(1);
      expect(bag.mobile?.layout).toBe("single");
    });
  });

  describe("split composer", () => {
    it("sets imagePosition right on mobile", () => {
      const bag = generateDeviceOverrides("split", {});
      expect(bag.mobile?.imagePosition).toBe("right");
    });
  });

  describe("hero composer", () => {
    it("sets align center on tablet and mobile when desktop is non-center", () => {
      const bag = generateDeviceOverrides("hero", { align: "left" });
      expect(bag.tablet?.align).toBe("center");
      expect(bag.mobile?.align).toBe("center");
    });

    it("returns empty tablet/mobile when desktop is already centered", () => {
      const bag = generateDeviceOverrides("hero", { align: "center" });
      expect(bag.tablet).toEqual({});
      expect(bag.mobile).toEqual({});
    });
  });

  describe("mergeAutoOverrides", () => {
    it("user customizations win over generated overrides", () => {
      const existing = { mobile: { columns: 3 } };
      const generated = { tablet: { columns: 2 }, mobile: { columns: 1 } };
      const merged = mergeAutoOverrides(existing, generated);
      expect(merged.tablet?.columns).toBe(2);
      expect(merged.mobile?.columns).toBe(3);
    });

    it("adds generated keys not present in existing", () => {
      const existing = {};
      const generated = { tablet: { columns: 2 }, mobile: { columns: 1 } };
      const merged = mergeAutoOverrides(existing, generated);
      expect(merged.tablet?.columns).toBe(2);
      expect(merged.mobile?.columns).toBe(1);
    });

    it("ignores devices not in generated", () => {
      const existing = { tablet: { columns: 4 } };
      const generated = { mobile: { columns: 1 } };
      const merged = mergeAutoOverrides(existing, generated);
      expect(merged.tablet?.columns).toBe(4);
      expect(merged.mobile?.columns).toBe(1);
    });
  });
});
