import { describe, expect, it } from "vitest";
import { websiteDefinitionSchema } from "@/lib/create/website-schema";
import { defaultSectionProps } from "@/lib/create/section-defaults";

describe("email-popup section", () => {
  it("accepts email-popup props in a site definition", () => {
    const parsed = websiteDefinitionSchema.safeParse({
      schemaVersion: "website-v1",
      title: "Popup shop",
      theme: {
        primary: "#000000",
        accent: "#E9006B",
        background: "#ffffff",
        text: "#111111",
        fontDisplay: "system-ui",
        fontBody: "system-ui",
        spacing: "comfortable",
      },
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "pop1",
              type: "email-popup",
              props: defaultSectionProps("email-popup"),
            },
            {
              id: "hero1",
              type: "hero",
              props: { heading: "Hello", subheading: "World", ctaLabel: "Go", ctaHref: "/" },
            },
          ],
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
