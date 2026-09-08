import { describe, expect, it } from "vitest";
import { buildStructuredSiteFromPhotos } from "@/lib/create/ai-generate";
import { createWebsiteBriefSchema, validateWebsiteDefinition } from "@/lib/create/website-schema";

describe("A4 create from photos", () => {
  it("accepts photos mode with photoUrls", () => {
    const parsed = createWebsiteBriefSchema.safeParse({
      mode: "photos",
      businessName: "Marché Yoff",
      category: "store",
      description: "Neighborhood boutique in Dakar selling fabrics and beauty.",
      countryCode: "SN",
      photoUrls: [
        "https://example.com/a.jpg",
        "https://example.com/b.jpg",
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("builds a valid site with gallery from photo URLs", () => {
    const brief = createWebsiteBriefSchema.parse({
      mode: "photos",
      businessName: "Atelier Baobab",
      category: "fashion",
      description: "Ready-to-wear from Dakar — photos of our latest drop.",
      countryCode: "SN",
      desiredPages: ["home", "shop", "about", "contact"],
      photoUrls: [
        "https://cdn.example.com/look1.jpg",
        "https://cdn.example.com/look2.jpg",
        "/templates/sample.png",
      ],
    });
    const def = buildStructuredSiteFromPhotos(brief);
    const validated = validateWebsiteDefinition(def);
    expect(validated.ok).toBe(true);
    const home = def.pages.find((p) => p.slug === "home");
    expect(home).toBeTruthy();
    const gallery = home?.sections.find((s) => s.type === "gallery");
    expect(gallery).toBeTruthy();
    const items = (gallery?.props.items as { src: string }[]) ?? [];
    expect(items.length).toBe(3);
    expect(items[0]?.src).toContain("look1");
    const image = home?.sections.find((s) => s.type === "image");
    expect(image?.props.src).toContain("look1");
  });
});
