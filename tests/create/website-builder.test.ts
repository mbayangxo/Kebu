import { describe, expect, it } from "vitest";
import {
  createWebsiteBriefSchema,
  validateWebsiteDefinition,
} from "@/lib/create/website-schema";
import { buildStructuredSiteFromBrief, definitionFromTemplateSlug } from "@/lib/create/ai-generate";
import { TEMPLATE_SEEDS } from "@/lib/create/templates-seed";

describe("website schema", () => {
  it("validates a structured site definition", () => {
    const def = buildStructuredSiteFromBrief({
      mode: "blank",
      businessId: "11111111-1111-4111-8111-111111111111",
      businessName: "Atelier Baobab",
      category: "fashion",
      description: "Handmade clothing for Dakar and beyond.",
      countryCode: "SN",
      locale: "fr",
      desiredPages: ["home"],
    });
    const result = validateWebsiteDefinition(def);
    if (!result.ok) {
      throw new Error(`validation failed: ${result.error} ${JSON.stringify(result.issues)}`);
    }
    expect(result.ok).toBe(true);
  });

  it("rejects unsafe script content", () => {
    const def = buildStructuredSiteFromBrief({
      mode: "blank",
      businessId: "11111111-1111-4111-8111-111111111111",
      businessName: "Test",
      category: "services",
      description: "A short description here.",
      countryCode: "SN",
      locale: "en",
      desiredPages: ["home"],
    });
    def.pages[0]!.sections[0]!.props = {
      brand: "x",
      links: [],
      evil: "<script>alert(1)</script>",
    };
    // brand-only navigation will fail props schema OR unsafe check on stringify
    const result = validateWebsiteDefinition({
      ...def,
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              type: "text",
              props: { body: 'Hello <script>alert(1)</script>' },
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
  });

  it("requires businessId uuid on create brief", () => {
    const parsed = createWebsiteBriefSchema.safeParse({
      mode: "blank",
      businessId: "not-a-uuid",
      businessName: "X",
      category: "services",
      description: "Long enough description",
      countryCode: "SN",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("templates", () => {
  it("seeds cover required categories", () => {
    const cats = new Set(TEMPLATE_SEEDS.map((t) => t.category));
    expect(cats.has("fashion")).toBe(true);
    expect(cats.has("online store preview only")).toBe(true);
    expect(TEMPLATE_SEEDS.length).toBeGreaterThanOrEqual(10);
  });

  it("template definitions validate", () => {
    for (const seed of TEMPLATE_SEEDS) {
      const result = validateWebsiteDefinition(seed.definition);
      expect(result.ok, seed.slug).toBe(true);
    }
  });

  it("applies business name onto template", () => {
    const def = definitionFromTemplateSlug("fashion-atelier", {
      mode: "template",
      businessId: "11111111-1111-4111-8111-111111111111",
      businessName: "Baobab Wear",
      category: "fashion",
      description: "Fashion brand description that is long enough.",
      countryCode: "SN",
      locale: "en",
      desiredPages: ["home"],
      templateSlug: "fashion-atelier",
    });
    expect(def?.title).toBe("Baobab Wear");
  });
});
