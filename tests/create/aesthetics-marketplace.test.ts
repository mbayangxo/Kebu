import { describe, expect, it } from "vitest";
import { kebuCatalogAestheticCards } from "@/lib/create/aesthetics-marketplace";
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
