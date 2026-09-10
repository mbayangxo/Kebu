import { describe, expect, it } from "vitest";
import { sectionPropsSchemas } from "@/lib/create/website-schema";
import { defaultSectionProps } from "@/lib/create/section-defaults";
import { googleFontsHrefForTheme, TEXT_FONT_OPTIONS } from "@/lib/create/site-theme-fonts";

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

  it("loads extra text-box fonts in the theme stylesheet href", () => {
    const href = googleFontsHrefForTheme("Fraunces", "system-ui", ["Oswald", "Syne"]);
    expect(href).toContain("Oswald");
    expect(href).toContain("Syne");
    expect(TEXT_FONT_OPTIONS).toContain("Oswald");
  });
});
