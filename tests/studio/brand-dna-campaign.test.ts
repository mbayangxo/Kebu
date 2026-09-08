import { describe, expect, it } from "vitest";
import {
  brandDnaCompleteness,
  brandDnaPromptBlock,
  brandDnaSchema,
  normalizeApprovedImagery,
  rowToBrandDna,
} from "@/lib/studio/brand-dna";
import {
  campaignProjectSchema,
  creativeDirectorPrompt,
  moodChangeMeta,
  parseCampaignMood,
  rowToCampaign,
} from "@/lib/studio/campaign-project";

describe("Brand DNA foundation", () => {
  it("parses DNA input and maps DB rows", () => {
    const parsed = brandDnaSchema.parse({
      name: "May Brand",
      tagline: "Music with purpose",
      voiceTone: "Warm, bold, Wolof-first",
      languages: ["Wolof", "French"],
      photographyStyle: "Natural light, Dakar streets",
      visualRules: "No stock clipart",
      customerNotes: "Fans 16–35",
      productsNotes: "EP + merch",
    });
    expect(parsed.tagline).toContain("Music");
    const row = rowToBrandDna({
      id: "00000000-0000-4000-8000-000000000001",
      owner_id: "u1",
      business_id: null,
      name: parsed.name,
      logo_url: "",
      primary_color: "#0F0D33",
      accent_color: "#E05A2B",
      background_color: "#FAFAF8",
      text_color: "#0F0D33",
      font_display: "Fraunces",
      font_body: "system-ui",
      tagline: parsed.tagline,
      photography_style: parsed.photographyStyle,
      voice_tone: parsed.voiceTone,
      languages: parsed.languages,
      customer_notes: parsed.customerNotes,
      products_notes: parsed.productsNotes,
      visual_rules: parsed.visualRules,
      approved_imagery: [{ url: "https://example.com/a.jpg", label: "Hero" }],
      dna_version: 1,
      created_at: "",
      updated_at: "",
    });
    expect(row.languages).toEqual(["Wolof", "French"]);
    expect(brandDnaPromptBlock(row)).toContain("Voice:");
    expect(brandDnaCompleteness(row).score).toBeGreaterThan(50);
    expect(normalizeApprovedImagery(["https://x.com/a.png"])).toHaveLength(1);
  });
});

describe("Creative Director campaign project", () => {
  it("validates campaign + mood and builds director prompt", () => {
    const campaign = campaignProjectSchema.parse({
      title: "EP Launch",
      brief: "I need a campaign for my new EP with posters and social.",
      goal: "Pre-saves",
      mood: {
        direction: "Night gold Dakar",
        keywords: ["night", "gold"],
      },
    });
    expect(campaign.mood.keywords).toContain("gold");
    const row = rowToCampaign({
      id: "00000000-0000-4000-8000-000000000002",
      owner_id: "u1",
      business_id: null,
      brand_kit_id: null,
      title: campaign.title,
      brief: campaign.brief,
      goal: campaign.goal,
      status: "draft",
      mood: campaign.mood,
      design_ids: [],
      video_project_ids: [],
      meta: {},
      created_at: "",
      updated_at: "",
    });
    const prompt = creativeDirectorPrompt({ campaign: row });
    expect(prompt).toContain("EP Launch");
    expect(prompt).toContain("Night gold");
    const mood2 = parseCampaignMood({ ...row.mood, direction: "Soft linen day" });
    expect(moodChangeMeta(row.mood, mood2).needsAssetRefresh).toBe(true);
  });
});
