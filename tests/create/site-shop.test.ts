import { describe, expect, it } from "vitest";
import { definitionHasShop } from "@/lib/create/site-shop";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

const base = {
  schemaVersion: "website-v1" as const,
  title: "Shop",
  theme: {
    primary: "#000",
    accent: "#f50",
    background: "#fff",
    text: "#000",
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
    spacing: "comfortable" as const,
    headingScale: "md" as const,
    bodySize: "md" as const,
    letterSpacing: "normal" as const,
  },
  pages: [] as WebsiteDefinition["pages"],
};

describe("definitionHasShop", () => {
  it("is false for a brochure site", () => {
    expect(
      definitionHasShop({
        ...base,
        pages: [{ slug: "home", title: "Home", sections: [{ id: "1", type: "hero", props: {} }] }],
      }),
    ).toBe(false);
  });

  it("is true when a products section exists", () => {
    expect(
      definitionHasShop({
        ...base,
        pages: [
          {
            slug: "shop",
            title: "Shop",
            sections: [{ id: "p", type: "products", props: { items: [] } }],
          },
        ],
      }),
    ).toBe(true);
  });
});
