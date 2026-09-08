import { describe, expect, it } from "vitest";
import {
  buildStructuredSiteFromBrief,
  generateWebsiteWithAi,
  pagesForCategory,
} from "@/lib/create/ai-generate";
import { createWebsiteBriefSchema, validateWebsiteDefinition } from "@/lib/create/website-schema";

const base = {
  mode: "ai" as const,
  businessName: "Shea House",
  category: "beauty",
  description: "We sell shea butter and natural soaps from Burkina Faso, made for skin in Dakar heat.",
  countryCode: "SN",
  locale: "en",
  desiredPages: ["home"],
};

describe("words-to-site brief", () => {
  it("maps fashion/beauty to a shop + about + contact site", () => {
    expect(pagesForCategory("beauty")).toEqual(["home", "shop", "about", "contact"]);
    expect(pagesForCategory("services")).toEqual(["home", "services", "about", "contact"]);
  });

  it("builds a valid multi-page website-v1 from words (no LLM)", () => {
    const brief = createWebsiteBriefSchema.parse(base);
    const def = buildStructuredSiteFromBrief(brief);
    const validated = validateWebsiteDefinition(def);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    expect(validated.data.pages.map((p) => p.slug)).toEqual(["home", "shop", "about", "contact"]);
    expect(validated.data.pages.every((p) => p.sections.some((s) => s.type === "navigation"))).toBe(true);
  });

  it("falls back to structured pages when Anthropic key is missing", async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const brief = createWebsiteBriefSchema.parse(base);
    const result = await generateWebsiteWithAi(brief);
    if (prev) process.env.ANTHROPIC_API_KEY = prev;
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.usedAi).toBe(false);
    expect(result.fallback).toBe(true);
    expect(result.definition.pages.length).toBeGreaterThanOrEqual(3);
  });
});
