import { describe, expect, it } from "vitest";
import { marcheBoutiqueWorldDefinition } from "@/lib/create/design-worlds/marche-boutique-world";
import { whatsappCatalogWorldDefinition } from "@/lib/create/design-worlds/whatsapp-catalog-world";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { definitionFromTemplateSlug } from "@/lib/create/ai-generate";
import { createWebsiteBriefSchema } from "@/lib/create/website-schema";

describe("Senegal store aesthetic worlds", () => {
  it("validates Marché Boutique world", () => {
    const v = validateWebsiteDefinition(marcheBoutiqueWorldDefinition());
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.data.pages.map((p) => p.slug)).toEqual(
        expect.arrayContaining(["home", "shop", "about", "contact", "faq"]),
      );
    }
  });

  it("validates WhatsApp Catalog world", () => {
    const v = validateWebsiteDefinition(whatsappCatalogWorldDefinition());
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.data.pages.map((p) => p.slug)).toEqual(
        expect.arrayContaining(["home", "catalog", "order", "contact"]),
      );
    }
  });

  it("wires seeds shopping-store and online-store-preview", () => {
    const brief = createWebsiteBriefSchema.parse({
      mode: "template",
      businessName: "Chez Awa",
      category: "store",
      description: "Boutique quartier à Dakar — tissus et beauté.",
      countryCode: "SN",
      templateSlug: "shopping-store",
    });
    const a = definitionFromTemplateSlug("shopping-store", brief);
    const b = definitionFromTemplateSlug("online-store-preview", brief);
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(validateWebsiteDefinition(a!).ok).toBe(true);
    expect(validateWebsiteDefinition(b!).ok).toBe(true);
  });
});
