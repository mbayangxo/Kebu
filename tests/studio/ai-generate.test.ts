import { describe, expect, it } from "vitest";
import {
  canvasFromCopy,
  fallbackStudioCampaignPack,
  studioGenerateBriefSchema,
} from "@/lib/studio/ai-generate";
import { canvasDocumentSchema } from "@/lib/studio/canvas-document";

describe("Studio S4 AI generate", () => {
  it("validates campaign briefs", () => {
    expect(studioGenerateBriefSchema.safeParse({ prompt: "short" }).success).toBe(false);
    expect(
      studioGenerateBriefSchema.safeParse({
        prompt: "Launch campaign for my skincare brand in Dakar",
        businessName: "Baobab Glow",
      }).success,
    ).toBe(true);
  });

  it("builds editable canvas from copy", () => {
    const doc = canvasFromCopy({
      designType: "instagram_post",
      businessName: "Baobab Glow",
      headline: "Glow starts here",
      subheadline: "Natural oils from Senegal",
      cta: "Shop WhatsApp",
      backgroundColor: "#0F0D33",
      accentColor: "#E05A2B",
    });
    expect(canvasDocumentSchema.safeParse(doc).success).toBe(true);
    expect(doc.layers.some((l) => l.text?.includes("Glow"))).toBe(true);
    expect(doc.layers.some((l) => l.name === "CTA")).toBe(true);
  });

  it("fallback pack returns 3 design types without AI", () => {
    const pack = fallbackStudioCampaignPack({
      prompt: "I need a launch campaign for my Senegalese skincare company",
      businessName: "Baobab Glow",
    });
    expect(pack.usedAi).toBe(false);
    expect(pack.fallback).toBe(true);
    expect(pack.designs).toHaveLength(3);
    expect(pack.designs.map((d) => d.designType)).toEqual([
      "instagram_post",
      "instagram_story",
      "flyer",
    ]);
    for (const d of pack.designs) {
      expect(canvasDocumentSchema.safeParse(d.canvas).success).toBe(true);
    }
  });
});
