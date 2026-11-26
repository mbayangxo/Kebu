import { describe, expect, it } from "vitest";
import { acquireCatalogAesthetic, acquireMarketplaceAesthetic, kebuCatalogAestheticCards } from "@/lib/create/aesthetics-marketplace";
import { parseKebuTemplateFile, serializeKebuTemplateFile } from "@/lib/create/kebu-template-file";

const sampleDefinition = {
  schemaVersion: "website-v1" as const,
  title: "Aesthetic demo",
  theme: {
    primary: "#0F0D33",
    accent: "#00C851",
    background: "#FAFAF8",
    text: "#0F0D33",
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
    spacing: "comfortable" as const,
  },
  pages: [
    {
      slug: "home",
      title: "Home",
      sections: [
        {
          id: "hero-1",
          type: "hero" as const,
          props: { heading: "Demo", subheading: "Hello", buttonLabel: "Go", buttonHref: "#" },
        },
      ],
    },
  ],
};

describe("aesthetics marketplace catalog", () => {
  it("exposes public Kebu catalog aesthetics (renamed from templates)", () => {
    const cards = kebuCatalogAestheticCards();
    expect(cards.length).toBeGreaterThan(0);
    for (const c of cards) {
      expect(c.kind).toBe("catalog");
      expect(c.slug.length).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThan(0);
    }
  });

  it("serializes aesthetic JSON that buyers accept without re-upload", () => {
    const file = serializeKebuTemplateFile("Rose atelier site", sampleDefinition);
    const parsed = parseKebuTemplateFile(file);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.name).toBe("Rose atelier site");
      expect(parsed.definition.schemaVersion).toBe("website-v1");
    }
  });
});


describe("aesthetic acquisition authority", () => {
  it("does not initiate catalog or marketplace ownership without trusted server write authority", async () => {
    const untrusted = { from: () => { throw Error("Must not write through the buyer client"); } };
    const user = { id: "11111111-1111-4111-8111-111111111111" };
    for (const result of [await acquireCatalogAesthetic(untrusted as never, user, "artist", "https://kebu.test"), await acquireMarketplaceAesthetic(untrusted as never, user, "22222222-2222-4222-8222-222222222222", "https://kebu.test")]) {
      expect(result).toMatchObject({ ok: false, status: 503 });
    }
  });
});
