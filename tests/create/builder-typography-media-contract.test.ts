import { describe, expect, it } from "vitest";
import { sectionPropsSchemas } from "@/lib/create/website-schema";

describe("Builder generic typography and hero media contract", () => {
  it("persists hero typography and focal-point controls through schema validation", () => {
    const parsed = sectionPropsSchemas.hero.parse({
      heading: "May Lecor",
      subheading: "New music",
      buttonLabel: "Listen",
      buttonHref: "/music",
      align: "center",
      image: "https://example.com/hero.jpg",
      imagePosition: "50% 20%",
      headingFontFamily: "Inter",
      headingFontSizePx: 88,
      subheadingFontFamily: "Arial",
      subheadingFontSizePx: 22,
    });
    expect(parsed.headingFontSizePx).toBe(88);
    expect(parsed.imagePosition).toBe("50% 20%");
  });

  it("persists text font family and exact pixel sizing", () => {
    const parsed = sectionPropsSchemas.text.parse({
      heading: "About",
      body: "Artist biography",
      headingFontFamily: "Inter",
      headingFontSizePx: 48,
      bodyFontFamily: "Georgia",
      bodyFontSizePx: 19,
    });
    expect(parsed.bodyFontFamily).toBe("Georgia");
    expect(parsed.bodyFontSizePx).toBe(19);
  });
});
