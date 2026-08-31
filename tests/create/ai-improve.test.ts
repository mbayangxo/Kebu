import { describe, expect, it } from "vitest";
import { aiImproveBriefSchema, validateWebsiteDefinition } from "@/lib/create/website-schema";
import { buildStructuredSiteFromBrief } from "@/lib/create/ai-generate";

describe("ai improve brief", () => {
  it("accepts empty body and optional instruction", () => {
    expect(aiImproveBriefSchema.safeParse({}).success).toBe(true);
    expect(aiImproveBriefSchema.safeParse({ instruction: "  " }).success).toBe(true);
    const withText = aiImproveBriefSchema.safeParse({
      instruction: "Make the hero clearer for students in Accra.",
    });
    expect(withText.success).toBe(true);
    if (withText.success) {
      expect(withText.data.instruction).toContain("Accra");
    }
  });

  it("rejects oversized instructions", () => {
    const parsed = aiImproveBriefSchema.safeParse({ instruction: "x".repeat(900) });
    expect(parsed.success).toBe(false);
  });

  it("accepts focus section types", () => {
    const parsed = aiImproveBriefSchema.safeParse({
      instruction: "Strengthen contact.",
      focusSectionTypes: ["hero", "contact", "whatsapp"],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("ai improve validation gate", () => {
  it("keeps a blank site valid after clone (replace input shape)", () => {
    const def = buildStructuredSiteFromBrief({
      mode: "blank",
      businessId: "11111111-1111-4111-8111-111111111111",
      businessName: "Maison Sahel",
      category: "services",
      description: "Local consulting for young founders in Senegal.",
      countryCode: "SN",
      locale: "fr",
      desiredPages: ["home"],
    });
    const result = validateWebsiteDefinition(def);
    expect(result.ok).toBe(true);
  });

  it("rejects unsafe AI-like payloads before persist", () => {
    const result = validateWebsiteDefinition({
      schemaVersion: "website-v1",
      title: "Hack",
      theme: {
        primary: "#0F0D33",
        accent: "#00C851",
        background: "#FAFAF8",
        text: "#0F0D33",
      },
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              type: "text",
              props: { body: 'Hi <script>alert(1)</script>' },
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
  });
});
