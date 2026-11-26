import { describe, expect, it } from "vitest";
import { sectionPropsSchemas } from "@/lib/create/website-schema";
import { defaultSectionProps } from "@/lib/create/section-defaults";
import { TEXT_FONT_OPTIONS, cssFontStack } from "@/lib/create/site-theme-fonts";

describe("free-text aesthetic customize", () => {
  it("accepts per-block fontFamily and keeps mock defaults editable", () => {
    const defaults = defaultSectionProps("free-text");
    const parsed = sectionPropsSchemas["free-text"].parse(defaults);
    expect(parsed.blocks.length).toBeGreaterThanOrEqual(1);
    expect(parsed.blocks[0]?.text.toLowerCase()).toContain("replace");

    const withFont = sectionPropsSchemas["free-text"].parse({
      ...defaults,
      blocks: [
        {
          id: "a",
          text: "My headline",
          x: 10,
          y: 10,
          width: 80,
          fontSize: "xl",
          align: "center",
          color: "#111",
          fontFamily: "Oswald",
        },
      ],
    });
    expect(withFont.blocks[0]?.fontFamily).toBe("Oswald");
  });

  it("text-box fonts resolve to self-hosted faces (no runtime stylesheet)", () => {
    expect(TEXT_FONT_OPTIONS).toContain("Oswald");
    expect(cssFontStack("Oswald")).toBe('var(--kebu-font-oswald, "Oswald"), system-ui, sans-serif');
    expect(cssFontStack("Syne")).toBe('var(--kebu-font-syne, "Syne"), system-ui, sans-serif');
  });
});
