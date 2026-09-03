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

  it("allows create brief without businessId", () => {
    const parsed = createWebsiteBriefSchema.safeParse({
      mode: "blank",
      businessName: "My Site",
      category: "services",
      description: "Long enough description",
      countryCode: "SN",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.businessId).toBeUndefined();
    }
  });

  it("rejects invalid businessId uuid on create brief", () => {
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
    expect(cats.has("music")).toBe(true);
    expect(cats.has("film")).toBe(true);
    expect(cats.has("business")).toBe(true);
    expect(cats.has("store")).toBe(true);
    expect(cats.has("app")).toBe(true);
    expect(cats.has("public figure")).toBe(true);
    expect(cats.has("agency")).toBe(true);
    expect(cats.has("production")).toBe(true);
    expect(cats.has("fragrance")).toBe(true);
    expect(TEMPLATE_SEEDS.length).toBeGreaterThanOrEqual(28);
  });

  it("keeps legacy dark May collage as owner portfolio; public May Lecor is the Russian cutout template", () => {
    const legacy = TEMPLATE_SEEDS.find((t) => t.slug === "musician-kdirection-artist");
    expect(legacy).toBeDefined();
    expect(legacy!.visibility).toBe("owner_portfolio");

    const publicMay = TEMPLATE_SEEDS.find((t) => t.slug === "musician-maylecor-ksendr");
    expect(publicMay).toBeDefined();
    expect(publicMay!.visibility).not.toBe("owner_portfolio");
    expect(validateWebsiteDefinition(publicMay!.definition).ok).toBe(true);
    const home = publicMay!.definition.pages.find((p) => p.slug === "home");
    const hero = home?.sections.find((s) => s.type === "legally-blonde-hero");
    expect(hero).toBeDefined();
  });

  it("includes Legally Blonde animated showcase template", () => {
    const seed = TEMPLATE_SEEDS.find((t) => t.slug === "showcase-legally-blonde");
    expect(seed).toBeDefined();
    const result = validateWebsiteDefinition(seed!.definition);
    expect(result.ok).toBe(true);
    const hero = seed!.definition.pages[0]?.sections.find((s) => s.type === "legally-blonde-hero");
    expect(String(hero?.props && (hero.props as { titleLogo?: string }).titleLogo)).toContain(
      "/templates/legally-blonde/",
    );
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
