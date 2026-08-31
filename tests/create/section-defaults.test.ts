import { describe, expect, it } from "vitest";
import { defaultSectionProps } from "@/lib/create/section-defaults";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { defaultMaylecorHomeProps } from "@/lib/create/maylecor-defaults";

describe("section defaults", () => {
  it("maylecor-home defaults validate", () => {
    const props = defaultSectionProps("maylecor-home");
    expect(props).toMatchObject({ ctaLabel: "LISTEN TO MAY'S NEW SINGLE" });
    const def = {
      schemaVersion: "website-v1" as const,
      title: "Test",
      theme: {
        primary: "#000",
        accent: "#fff",
        background: "#000",
        text: "#fff",
        fontDisplay: "Fraunces",
        fontBody: "system-ui",
        spacing: "comfortable" as const,
      },
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [{ id: "m1", type: "maylecor-home" as const, props }],
        },
      ],
    };
    expect(validateWebsiteDefinition(def).ok).toBe(true);
  });

  it("maylecor portrait uses local studio photo", () => {
    const props = defaultMaylecorHomeProps();
    expect(String(props.portraitMain)).toBe("/templates/maylecor/portrait.jpg");
    expect(String(props.collageMiddle)).toBe("/templates/maylecor/portrait.jpg");
    expect(props.socialLinks.length).toBeGreaterThanOrEqual(6);
    expect(props.motionEnabled).toBe(true);
  });

  it("legally-blonde-hero defaults validate", () => {
    const props = defaultSectionProps("legally-blonde-hero");
    expect(String((props as { titleLogo?: string }).titleLogo)).toContain("Group_557");
    expect(String((props as { cutoutAccent?: string }).cutoutAccent)).toContain("Group_546");
    const def = {
      schemaVersion: "website-v1" as const,
      title: "Test",
      theme: {
        primary: "#FF1493",
        accent: "#FFD700",
        background: "#fff",
        text: "#111",
        fontDisplay: "Georgia",
        fontBody: "system-ui",
        spacing: "comfortable" as const,
      },
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [{ id: "lb1", type: "legally-blonde-hero" as const, props }],
        },
      ],
    };
    expect(validateWebsiteDefinition(def).ok).toBe(true);
  });
});
